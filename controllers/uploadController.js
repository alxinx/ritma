import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid';
import s3Client from "../config/r2.js";
import multimediaQueue from '../queues/multimediaQueue.js';

const getPresignedUrl = async (req, res) => {
  try {
    const { fileName, fileType, category, tipoAsset } = req.body;

    if (!fileName || !fileType || !category) {
      return res.status(400).json({ ok: false, msg: 'Faltan datos obligatorios' });
    }

    const extension = fileName.split('.').pop();
    const nuevoNombre = `${uuidv4()}.${extension}`;
    const folder = category === 'cover' ? 'images/covers/' : 'multimedia/temp/';
    const fileKey = `${folder}${nuevoNombre}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Si no es cover, NO agregamos job aquí. Se hará en el controlador final (adminControllers)
    // para asegurar que el archivo ya esté en R2.

    // Responder inmediatamente al cliente
    res.json({
      ok: true,
      uploadUrl,
      fileKey,
      nombreFinal: nuevoNombre
    });

  } catch (error) {
    console.error('Error generando presigned URL:', error);
    res.status(500).json({ ok: false, msg: 'Error interno del servidor' });
  }
};

export { getPresignedUrl };
