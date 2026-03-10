import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { Multimedia, LogErrores } from '../models/index.js';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../config/r2.js";

const TEMP_DIR = 'temp_processing'; // Carpeta temporal local


console.log('EJECUTANDO MULTIMEDIA WORKERS')
// Asegúrate que exista
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

const worker = new Worker('multimedia-processing', async job => {
  const { keyTemp, tipoAsset } = job.data;
  console.log(`Procesando job ${job.id} - archivo: ${keyTemp}`);

  try {
    // Descargo los archivoos temporales
    const tempFilePath = path.join(TEMP_DIR, path.basename(keyTemp));
    const previewFilePath = path.join(TEMP_DIR, `preview-${path.basename(keyTemp)}`);

    // Descargar archivo de R2
    const object = await s3Client.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: keyTemp }));
    const writeStream = fs.createWriteStream(tempFilePath);
    object.Body.pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // 2️⃣ Procesar preview con FFmpeg (SOLO AUDIO)
    let previewKey = null;
    let previewSubido = false;

    if (tipoAsset === 'AUDIO') {
      const PREVIEW_DURATION = 30; // Duración del preview en segundos
      const FADE_DURATION = 2;     // Duración del fade in/out

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

      // 3️⃣ Subir preview a R2
      const filename = path.basename(keyTemp);
      previewKey = `multimedia/previews/preview-${filename}`;
      console.log(`[RTM-WORKER] Subiendo preview a R2: ${previewKey}`);

      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: previewKey,
        Body: fs.createReadStream(previewFilePath)
      }));
      previewSubido = true;
    } else {
      console.log(`[RTM-WORKER] Saltando generación de preview para tipo: ${tipoAsset}`);
    }

    // 4️⃣ Subir original de temp → originals
    const filename = path.basename(keyTemp);
    const originalKey = `multimedia/originals/${filename}`;
    console.log(`[RTM-WORKER] Subiendo original a R2: ${originalKey}`);

    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: originalKey,
      Body: fs.createReadStream(tempFilePath)
    }));
    const originalSubido = true;

    // 5️⃣ Update Database SOLO si los archivos están confirmados en R2
    const keyTempFilename = path.basename(keyTemp);
    const multimediaRecord = await Multimedia.findOne({ where: { keyTemp: keyTempFilename } });

    if (multimediaRecord) {
      // Solo limpiar keyTemp si el original (y preview si aplica) están en R2
      const todosSubidos = originalSubido && (tipoAsset !== 'AUDIO' || previewSubido);

      await multimediaRecord.update({
        estado_ingesta: todosSubidos ? 'ready' : 'error',
        keyPreview: previewSubido ? `preview-${keyTempFilename}` : null,
        keyOriginal: originalSubido ? keyTempFilename : null,
        keyTemp: todosSubidos ? null : keyTempFilename,
        error_ingesta: todosSubidos ? null : 'Fallo al subir archivos a R2'
      });

      console.log(`[RTM-WORKER] DB actualizada: ${originalKey} | Preview: ${previewKey || 'N/A'} | Estado: ${todosSubidos ? 'ready' : 'error'}`);
    } else {
      console.warn(`[RTM-WORKER] No se encontró registro DB para keyTemp: ${keyTempFilename}`);
    }

    // 6️⃣ Borrar archivos locales temporales
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    if (fs.existsSync(previewFilePath)) fs.unlinkSync(previewFilePath);

    return { message: 'Procesamiento completado', previewKey, originalKey };

  } catch (err) {
    await LogErrores.create({
      modulo: 'RTM-WORKER-MULTIMEDIA',
      nivel: 'CRITICAL',
      error: `Worker error: ${err.message}`,
      stack: err.stack
    });
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
