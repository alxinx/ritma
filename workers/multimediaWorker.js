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
    // 1️⃣ Descargar archivo desde R2 a temporal local
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

    // 2️⃣ Procesar preview con FFmpeg
    await new Promise((resolve, reject) => {
      let command = ffmpeg(tempFilePath)
        .setStartTime(45)       // inicio de la canción/video
        .duration(60)          // cortar 15 segundos
        .on('error', reject)
        .on('end', resolve);

      if (tipoAsset === 'AUDIO') {
        command = command.audioFilters([
          'afade=t=in:ss=0:d=2',   // fade in 2s
          'afade=t=out:st=13:d=2' // fade out 2s
        ]).save(previewFilePath);
      } else if (tipoAsset === 'VIDEO') {
        command = command.videoFilters([
          'fade=t=in:st=50:d=1',     // fade in video
          'fade=t=out:st=75:d=1'    // fade out video
        ]).save(previewFilePath);
      } else {
        // Si no es AUDIO ni VIDEO, resolvemos inmediatamente para no colgar el job
        console.warn(`Tipo de asset desconocido: ${tipoAsset}. Saltando generación de preview.`);
        // Podrías decidir copiar el archivo tal cual o simplemente ignorar
        return resolve();
      }
    });

    // 3️⃣ Subir preview a R2

    console.log('subiendo todo a preview.... ')
    const previewKey = keyTemp.replace('temp', 'previews');
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: previewKey,
      Body: fs.createReadStream(previewFilePath)
    });
    await s3Client.send(uploadCommand);

    // 4️⃣ Opcional: mover original de temp → originals
    const originalKey = keyTemp.replace('temp', 'originals');
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: originalKey,
      Body: fs.createReadStream(tempFilePath)
    }));

    // 5️⃣ Update Database
    // Buscar el registro por keyTemp (que es único en teoría, o usamos el ID si lo pasáramos)
    // Pero como tenemos keyTemp, usamos ese.
    const multimediaRecord = await Multimedia.findOne({ where: { keyTemp } });

    if (multimediaRecord) {
      await multimediaRecord.update({
        estado_ingesta: 'ready',
        keyPreview: previewKey,
        keyOriginal: originalKey, // El archivo completo en /originals
        keyTemp: null // Borramos la referencia temporal
      });
      console.log(`[RTM-WORKER] DB actualizada para ${keyTemp}`);
    } else {
      console.warn(`[RTM-WORKER] No se encontró registro DB para ${keyTemp}`);
    }

    // 6️⃣ Borrar archivos locales temporales
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(previewFilePath);

    return { message: 'Preview procesado', previewKey, originalKey };

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
