import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import s3Client from "../config/r2.js";
import multimediaQueue from '../queues/multimediaQueue.js';

/* =============================================================
   WHITELISTS — solo estos tipos pueden obtener una presigned URL.
   El cliente declara su fileType; lo validamos aquí antes de
   firmar cualquier operación contra R2.
============================================================= */
const MIME_WHITELIST = new Set([
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/flac', 'audio/x-flac', 'audio/aac',
    'audio/ogg', 'audio/mp4', 'audio/x-m4a',
    // Video
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'video/webm', 'video/x-matroska',
    // Imagen (covers)
    'image/jpeg', 'image/png', 'image/webp',
]);

const EXT_WHITELIST = new Set([
    '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a',
    '.mp4', '.mov', '.avi', '.webm', '.mkv',
    '.jpg', '.jpeg', '.png', '.webp',
]);

/* =============================================================
   CONTROLADOR
============================================================= */
const getPresignedUrl = async (req, res) => {
    try {
        const { fileName, fileType, category, tipoAsset } = req.body;

        // --- Validación de presencia ---
        if (!fileName || !fileType || !category) {
            return res.status(400).json({ ok: false, msg: 'Faltan datos obligatorios' });
        }

        // --- Validar MIME type contra whitelist ---
        if (!MIME_WHITELIST.has(fileType)) {
            return res.status(400).json({ ok: false, msg: 'Tipo de archivo no permitido' });
        }

        // --- Extraer y validar extensión (solo el último segmento) ---
        const ext = path.extname(fileName).toLowerCase();
        if (!ext || !EXT_WHITELIST.has(ext)) {
            return res.status(400).json({ ok: false, msg: 'Extensión de archivo no permitida' });
        }

        // --- Validar categoría ---
        const categoriasPermitidas = new Set(['cover', 'audio', 'video']);
        if (!categoriasPermitidas.has(category)) {
            return res.status(400).json({ ok: false, msg: 'Categoría no válida' });
        }

        // --- Construir key con nombre seguro (UUID + ext validada) ---
        const nuevoNombre = `${uuidv4()}${ext}`;
        const folder = category === 'cover' ? 'images/covers/' : 'multimedia/temp/';
        const fileKey = `${folder}${nuevoNombre}`;

        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
            ContentType: fileType, // ya validado contra whitelist
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

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
