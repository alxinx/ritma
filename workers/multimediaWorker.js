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

    // 2️⃣ Procesar preview con FFmpeg (SOLO AUDIO)
    let previewKey = null;

    if (tipoAsset === 'AUDIO') {
      await new Promise((resolve, reject) => {
        ffmpeg(tempFilePath)
          .setStartTime(45)       // inicio de la canción
          .duration(60)          // cortar 60 segundos
          .on('error', reject)
          .on('end', resolve)
          .audioFilters([
            'afade=t=in:ss=0:d=2',   // fade in 2s
            'afade=t=out:st=13:d=2' // fade out 2s
          ])
          .save(previewFilePath);
      });

      // 3️⃣ Subir preview a R2 (SOLO SI SE GENERÓ)
      console.log('subiendo preview a R2.... ')
      previewKey = `multimedia/previews/${path.basename(keyTemp).replace('temp-', 'preview-')}`; // Estandarización de path
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: previewKey,
        Body: fs.createReadStream(previewFilePath)
      });
      await s3Client.send(uploadCommand);
    } else {
      console.log(`[RTM-WORKER] Saltando generación de preview para tipo: ${tipoAsset}`);
    }

    // 4️Opcional: mover original de temp → originals
    // Estandarización: multimedia/originals/
    const originalKey = `multimedia/originals/${path.basename(keyTemp).replace('temp-', '')}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: originalKey,
      Body: fs.createReadStream(tempFilePath)
    }));

    // 5️⃣ Update Database
    // La DB guarda solo el filename, el worker recibe el path completo de R2
    const keyTempFilename = path.basename(keyTemp);
    const multimediaRecord = await Multimedia.findOne({ where: { keyTemp: keyTempFilename } });

    if (multimediaRecord) {
      await multimediaRecord.update({
        estado_ingesta: 'ready',
        keyPreview: previewKey, // Será null si no es AUDIO
        keyOriginal: originalKey,
        keyTemp: null
      });

      console.log(`[RTM-WORKER] DB actualizada para ${originalKey}. Preview: ${previewKey || 'N/A'}`);
    } else {
      console.warn(`[RTM-WORKER] No se encontró registro DB para ${keyTemp}`);
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
