import multer from 'multer';
import path from 'path';
import fs from 'fs';

/* =============================================================
   WHITELIST ESTRICTA
   No aceptamos prefijos genéricos (audio/, video/, image/).
   Cada tipo está explícitamente permitido.
============================================================= */
const MIME_WHITELIST = new Set([
    // Audio
    'audio/mpeg',        // .mp3
    'audio/wav',         // .wav
    'audio/wave',        // .wav (variante)
    'audio/x-wav',       // .wav (variante)
    'audio/flac',        // .flac
    'audio/x-flac',      // .flac (variante)
    'audio/aac',         // .aac
    'audio/ogg',         // .ogg
    'audio/mp4',         // .m4a
    'audio/x-m4a',       // .m4a (variante)
    // Video
    'video/mp4',         // .mp4
    'video/quicktime',   // .mov
    'video/x-msvideo',   // .avi
    'video/webm',        // .webm
    'video/x-matroska',  // .mkv
    // Imagen (covers)
    'image/jpeg',        // .jpg / .jpeg
    'image/png',         // .png
    'image/webp',        // .webp
]);

const EXT_WHITELIST = new Set([
    '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a',
    '.mp4', '.mov', '.avi', '.webm', '.mkv',
    '.jpg', '.jpeg', '.png', '.webp',
]);

/* =============================================================
   MAGIC BYTES — firmas conocidas de cada formato permitido
   Se verifica leyendo los primeros bytes del archivo ya guardado.
============================================================= */
const MAGIC_SIGNATURES = [
    // JPEG
    { bytes: [0xFF, 0xD8, 0xFF], offset: 0 },
    // PNG
    { bytes: [0x89, 0x50, 0x4E, 0x47], offset: 0 },
    // GIF
    { bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 },
    // WebP (RIFF....WEBP)
    { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
    // MP3 con cabecera ID3
    { bytes: [0x49, 0x44, 0x33], offset: 0 },
    // MP3 sin ID3 (sync frame)
    { bytes: [0xFF, 0xFB], offset: 0 },
    { bytes: [0xFF, 0xF3], offset: 0 },
    { bytes: [0xFF, 0xF2], offset: 0 },
    // FLAC
    { bytes: [0x66, 0x4C, 0x61, 0x43], offset: 0 },
    // OGG
    { bytes: [0x4F, 0x67, 0x67, 0x53], offset: 0 },
    // WAV / AVI (RIFF)
    { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
    // MP4 / M4A / MOV — "ftyp" en offset 4
    { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
    // WebM / MKV
    { bytes: [0x1A, 0x45, 0xDF, 0xA3], offset: 0 },
    // AAC (ADTS)
    { bytes: [0xFF, 0xF1], offset: 0 },
    { bytes: [0xFF, 0xF9], offset: 0 },
];

function hasValidMagicBytes(filePath) {
    try {
        const BUFFER_SIZE = 12;
        const buf = Buffer.alloc(BUFFER_SIZE);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buf, 0, BUFFER_SIZE, 0);
        fs.closeSync(fd);

        return MAGIC_SIGNATURES.some(({ bytes, offset }) => {
            if (offset + bytes.length > BUFFER_SIZE) return false;
            return bytes.every((b, i) => buf[offset + i] === b);
        });
    } catch {
        return false;
    }
}

/* =============================================================
   FILE FILTER — corre antes de guardar el archivo en disco.
   Valida MIME type y extensión contra las whitelists.
============================================================= */
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!MIME_WHITELIST.has(file.mimetype)) {
        return cb(new Error(`Tipo MIME no permitido: ${file.mimetype}`), false);
    }

    if (!EXT_WHITELIST.has(ext)) {
        return cb(new Error(`Extensión no permitida: ${ext}`), false);
    }

    cb(null, true);
};

/* =============================================================
   STORAGE — nombre único, extensión del original en minúsculas.
============================================================= */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'upload/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * parseInt(process.env.MAX_SIZE_FILE_UPLOAD || '2000', 10)
    }
});

/* =============================================================
   MIDDLEWARE POST-UPLOAD — valida magic bytes de cada archivo
   guardado. Si falla, elimina el archivo del disco y rechaza.
============================================================= */
export function validarMagicBytes(req, res, next) {
    const files = req.files
        ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
        : (req.file ? [req.file] : []);

    for (const file of files) {
        if (!hasValidMagicBytes(file.path)) {
            // Eliminar archivo sospechoso del disco
            try { fs.unlinkSync(file.path); } catch (_) {}
            return res.status(400).json({
                ok: false,
                msg: `El archivo "${file.originalname}" no corresponde a un formato de audio, video o imagen válido.`
            });
        }
    }

    next();
}

export default upload;
