import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { Multimedia, LogErrores } from '../models/index.js';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../config/r2.js";

const TEMP_DIR = 'temp_processing';

console.log('EJECUTANDO MULTIMEDIA WORKERS');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// ==========================================
// HELPER: ffprobe wrapper
// ==========================================
function probeFile(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      resolve({
        codec: videoStream ? videoStream.codec_name : null,
        container: metadata.format.format_name || null,
        duration: Math.floor(metadata.format.duration || 0),
        width: videoStream ? videoStream.width : 0,
        height: videoStream ? videoStream.height : 0,
        audioCodec: audioStream ? audioStream.codec_name : null
      });
    });
  });
}

// ==========================================
// HELPER: Remux with faststart (H.264 pass-through)
// CPU ≈ 0% — just repackages container
// ==========================================
function remuxWithFaststart(input, output) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions(['-c', 'copy', '-movflags', '+faststart'])
      .on('error', reject)
      .on('end', resolve)
      .save(output);
  });
}

// ==========================================
// HELPER: Transcode to H.264 (non-H.264 sources)
// Uses superfast preset for minimal CPU
// ==========================================
function transcodeToH264(input, output) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-preset', 'superfast', '-crf', '23', '-movflags', '+faststart'])
      .on('error', reject)
      .on('end', resolve)
      .save(output);
  });
}

// ==========================================
// HELPER: Generate 30s video preview
// ==========================================
function generateVideoPreview(input, output, duration) {
  const startTime = Math.min(5, Math.max(0, duration - 35));
  const previewDuration = Math.min(30, duration - startTime);

  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .setStartTime(startTime)
      .duration(previewDuration)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-preset', 'superfast', '-crf', '28', '-movflags', '+faststart'])
      .on('error', reject)
      .on('end', resolve)
      .save(output);
  });
}

// ==========================================
// HELPER: Cleanup local temp files safely
// ==========================================
function cleanupLocal(...files) {
  for (const f of files) {
    try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch {}
  }
}

const worker = new Worker('multimedia-processing', async job => {
  const { keyTemp, tipoAsset } = job.data;
  console.log(`Procesando job ${job.id} - archivo: ${keyTemp} (${tipoAsset})`);

  const tempFilePath = path.join(TEMP_DIR, path.basename(keyTemp));
  const previewFilePath = path.join(TEMP_DIR, `preview-${path.basename(keyTemp)}`);
  // For video: processed original (may differ from temp if remux/transcode needed)
  const processedFilePath = path.join(TEMP_DIR, `processed-${path.basename(keyTemp)}`);

  try {
    // 1️⃣ Download temp file from R2
    const object = await s3Client.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: keyTemp
    }));
    const writeStream = fs.createWriteStream(tempFilePath);
    object.Body.pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    let previewKey = null;
    let previewSubido = false;
    let originalFilePath = tempFilePath; // Default: upload as-is
    let probeDuration = 0;

    // ==========================================
    // 2️⃣ AUDIO PROCESSING
    // ==========================================
    if (tipoAsset === 'AUDIO') {
      const PREVIEW_DURATION = 30;
      const FADE_DURATION = 2;

      await new Promise((resolve, reject) => {
        ffmpeg(tempFilePath)
          .setStartTime(45)
          .duration(PREVIEW_DURATION)
          .on('error', reject)
          .on('end', resolve)
          .audioFilters([
            `afade=t=in:ss=0:d=${FADE_DURATION}`,
            `afade=t=out:st=${PREVIEW_DURATION - FADE_DURATION}:d=${FADE_DURATION}`
          ])
          .save(previewFilePath);
      });

      const filename = path.basename(keyTemp);
      previewKey = `multimedia/previews/preview-${filename}`;
      console.log(`[RTM-WORKER] Subiendo audio preview a R2: ${previewKey}`);

      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: previewKey,
        Body: fs.createReadStream(previewFilePath)
      }));
      previewSubido = true;
    }

    // ==========================================
    // 2️⃣ VIDEO PROCESSING (Smart Ingestion)
    // ==========================================
    if (tipoAsset === 'VIDEO') {
      console.log(`[RTM-WORKER] Probing video: ${tempFilePath}`);
      const probe = await probeFile(tempFilePath);
      probeDuration = probe.duration;
      console.log(`[RTM-WORKER] Probe result: codec=${probe.codec}, duration=${probe.duration}s, ${probe.width}x${probe.height}`);

      // Decision: H.264 → remux, else → transcode
      if (probe.codec === 'h264') {
        console.log(`[RTM-WORKER] Decision A: H.264 detected → remux with faststart`);
        await remuxWithFaststart(tempFilePath, processedFilePath);
        originalFilePath = processedFilePath;
      } else {
        console.log(`[RTM-WORKER] Decision C: ${probe.codec} detected → transcode to H.264`);
        await transcodeToH264(tempFilePath, processedFilePath);
        originalFilePath = processedFilePath;
      }

      // Generate 30s video preview
      if (probe.duration > 5) {
        console.log(`[RTM-WORKER] Generating video preview (30s from second ${Math.min(5, probe.duration - 35)})`);
        // Ensure preview extension is .mp4
        const previewMp4Path = previewFilePath.replace(/\.[^.]+$/, '.mp4');
        await generateVideoPreview(originalFilePath, previewMp4Path, probe.duration);

        const filename = path.basename(keyTemp).replace(/\.[^.]+$/, '.mp4');
        previewKey = `multimedia/previews/preview-${filename}`;
        console.log(`[RTM-WORKER] Subiendo video preview a R2: ${previewKey}`);

        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: previewKey,
          Body: fs.createReadStream(previewMp4Path)
        }));
        previewSubido = true;

        // Clean preview mp4 if different from previewFilePath
        if (previewMp4Path !== previewFilePath) cleanupLocal(previewMp4Path);
      } else {
        console.log(`[RTM-WORKER] Video too short (${probe.duration}s), skipping preview generation`);
      }
    }

    // 3️⃣ Upload processed original to R2 originals/
    const filename = path.basename(keyTemp);
    // For video, ensure .mp4 extension on original key
    const originalFilename = tipoAsset === 'VIDEO' ? filename.replace(/\.[^.]+$/, '.mp4') : filename;
    const originalKey = `multimedia/originals/${originalFilename}`;
    console.log(`[RTM-WORKER] Subiendo original a R2: ${originalKey}`);

    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: originalKey,
      Body: fs.createReadStream(originalFilePath)
    }));
    const originalSubido = true;

    // 4️⃣ Update Database
    const keyTempFilename = path.basename(keyTemp);
    const multimediaRecord = await Multimedia.findOne({ where: { keyTemp: keyTempFilename } });

    if (multimediaRecord) {
      // Both audio AND video now require preview to be considered "ready"
      const todosSubidos = originalSubido && previewSubido;
      const previewFilename = previewKey ? path.basename(previewKey) : null;

      const updateData = {
        estado_ingesta: todosSubidos ? 'ready' : 'error',
        keyPreview: previewFilename,
        keyOriginal: originalSubido ? originalFilename : null,
        keyTemp: todosSubidos ? null : keyTempFilename,
        error_ingesta: todosSubidos ? null : 'Fallo al subir archivos a R2'
      };

      // Update duration from ffprobe if it was 0
      if (tipoAsset === 'VIDEO' && probeDuration > 0 && (!multimediaRecord.duracion || multimediaRecord.duracion === 0)) {
        updateData.duracion = probeDuration;
      }

      await multimediaRecord.update(updateData);
      console.log(`[RTM-WORKER] DB actualizada: ${originalKey} | Preview: ${previewKey || 'N/A'} | Estado: ${todosSubidos ? 'ready' : 'error'}`);
    } else {
      console.warn(`[RTM-WORKER] No se encontró registro DB para keyTemp: ${keyTempFilename}`);
    }

    // 5️⃣ Delete temp file from R2 (cleanup)
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: keyTemp
      }));
      console.log(`[RTM-WORKER] Temp eliminado de R2: ${keyTemp}`);
    } catch (delErr) {
      console.warn(`[RTM-WORKER] No se pudo eliminar temp de R2: ${delErr.message}`);
    }

    // 6️⃣ Cleanup local temp files
    cleanupLocal(tempFilePath, previewFilePath, processedFilePath);

    return { message: 'Procesamiento completado', previewKey, originalKey };

  } catch (err) {
    cleanupLocal(tempFilePath, previewFilePath, processedFilePath);

    await LogErrores.create({
      modulo: 'RTM-WORKER-MULTIMEDIA',
      nivel: 'CRITICAL',
      error: `Worker error: ${err.message}`,
      stack: err.stack
    });

    // Update DB to error state
    try {
      const keyTempFilename = path.basename(keyTemp);
      const multimediaRecord = await Multimedia.findOne({ where: { keyTemp: keyTempFilename } });
      if (multimediaRecord) {
        await multimediaRecord.update({
          estado_ingesta: 'error',
          error_ingesta: err.message
        });
      }
    } catch {}

    throw err;
  }

}, {
  connection: new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
  })
});

worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completado:`, result);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} falló:`, err);
});

export default worker;
