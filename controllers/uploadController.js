import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid'; // Asegúrate de haber instalado: npm install uuid
import s3Client from "../config/r2.js";

const getPresignedUrl = async (req, res) => {
    try {
        const { fileName, fileType, category } = req.body;
        
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

        //  URL firmada (Expires en 5 min)
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        // 5. ENVIAMOS UNA SOLA RESPUESTA [cite: 2026-01-22]
        // Enviamos fileKey para el PUT y nombreFinal para que Ritma lo guarde en DB
        res.json({ 
            ok: true, 
            uploadUrl, 
            fileKey, 
            nombreFinal: nuevoNombre 
        });

    } catch (error) {
        console.error('Error generando firma RTM-ENGINE:', error);
        res.status(500).json({ ok: false, msg: 'Error interno del servidor' });
    }
};

export { getPresignedUrl };