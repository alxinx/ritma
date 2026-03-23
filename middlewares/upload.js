import multer from 'multer';
import path from 'path';

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype.startsWith('audio/') || 
        file.mimetype.startsWith('video/') || 
        file.mimetype.startsWith('image/')
    ) {
        cb(null, true);
    } else {
        cb(new Error('Formato no soportado por RTM-ENGINE'), false);
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'upload/'); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Ojo: en ESM, 'path' funciona igual, pero asegúrate de importar 'path' arriba
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * parseInt(process.env.MAX_SIZE_FILE_UPLOAD || '2000', 10)
    }
});

export default upload; // Sintaxis ESM