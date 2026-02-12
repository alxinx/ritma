import {Usuarios, Artistas, Album, Generos} from '../models/index.js'
import dotenv from "dotenv";
import { Op } from 'sequelize';

dotenv.config();

const dashboard = (req, res)=>{
    return res.status(200).render('../views/app/dashboard', {
        tituloPagina : "Panel de control Principal",
        subtitulo : "Bienvenido",
        active : 'dashboard',
        csrfToken : req.csrfToken()
    })
}


const usersPanel = (req, res)=>{
    return res.status(200).render('../views/app/userPanel', {
        tituloPagina : "Usuarios",
        subtitulo : "Panel de control de los usuarios",
        active : 'users',
        csrfToken : req.csrfToken()
    })
}


const multimediaPanel = (req, res)=>{
    return res.status(200).render('../views/app/multimediaPanel', {
        tituloPagina : "Biblioteca Multimedia",
        subtitulo : "Panel principal de la biblioteca multimedia",
        active : 'multimedia',
        csrfToken : req.csrfToken()
    })
}

const uploadboard = (req, res)=>{
    return res.status(200).render('../views/app/uploadboard', {
        tituloPagina : "Biblioteca Multimedia",
        subtitulo : "Subir Archivos Multimedia",
        active : 'multimedia',
        csrfToken : req.csrfToken()
    })
}


/// INGRESO EL MULTIMEDIA
const postUploadMultimedia = async (req, res) => {
    try {
        // 1. Extraer archivos según la configuración de upload.fields()
        // Si usas upload.any(), los archivos vienen directamente en req.files como un array
        const archivosMusica = req.files['archivo[]'] || (Array.isArray(req.files) ? req.files : []);
        const portada = req.files['coverAlbum'] ? req.files['coverAlbum'][0] : null;

        console.log('--- INGESTA DETECTADA ---');
        console.log(`Total archivos de audio recibidos: ${archivosMusica.length}`);

        // 2. Caso de validación inicial (sin archivos)
        if (archivosMusica.length === 0 && !portada) {
            return res.status(200).json({
                ok: true,
                msg: 'Metadata validada correctamente'
            });
        }

        // 3. Procesamiento de múltiples archivos (Aquí está el arreglo)
        archivosMusica.forEach((archivo, index) => {
            // Ahora sí, index y archivo están definidos dentro del loop
            console.log(`[Item ${index + 1}] Procesando: ${archivo.originalname}`);
            console.log(`Ruta temporal: ${archivo.path || 'Memoria (Buffer)'}`);
            
            // TIP: Aquí es donde más adelante moverás el archivo a su carpeta final
            // o lo subirás a Cloudflare R2 / S3.
        });

        if (portada) {
            console.log(`[Portada] Procesando: ${portada.originalname}`);
        }

        // 4. Respuesta al Monitor (esto activa el "¡Listo!" en el front)
        return res.status(200).json({
            ok: true,
            msg: `Batch de ${archivosMusica.length} archivos procesado correctamente por RTM-ENGINE`
        });

    } catch (error) {
        console.error('Error en el Core:', error);
        return res.status(500).json({ 
            ok: false, 
            msg: 'Error crítico en la ingesta' 
        });
    }
};




 
const liveUploadMonitor = async(req, res)=>{
    return res.status(200).render('../views/app/live-upload-monitor', {
        tituloPagina : "Biblioteca Multimedia",
        subtitulo : "Live Upload Monitor",
        active : 'multimedia',
        csrfToken : req.csrfToken()
    })

}






//*********************[JSON]************************/


const jsonCheckArtistByName = async (req, res) => {
    try {
        const { nombreArtista } = req.query;        
        if (!nombreArtista || nombreArtista.trim() === '') {
            return res.json([]);
        }
        const term = `%${nombreArtista.trim()}%`;
        const artistas = await Artistas.findAll({
            where: {
                nombreArtista: { [Op.like]: term }
            },
            limit: 5, 
            order: [['nombreArtista', 'ASC']],
            attributes: ['idArtista', 'nombreArtista', 'cover'] // Solo enviamos lo necesario
        });
        res.json(artistas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al consultar artistas' });
    }
}




//FIND ALBUM 
const getAlbumsByArtist = async (req, res)=>{
    const { idArtista } = req.params;
    const { q } = req.query; // Término de búsqueda (ej: "Mañ")
    try {
    const albums = await Album.findAll({
            where: {
                idArtista: idArtista,
                nombreAlbum: {
                    [Op.like]: `%${q || ''}%`
                }
            },
            limit: 10,
            attributes: ['idAlbum', 'nombreAlbum', 'cover']
        });
        res.json(albums);

    } catch (error) {
        
    }

}

//Generos
const getAllGenres = async (req, res)=>{
    
    const genres = await Generos.findAll({
        attributes: ['genero_id', 'nombre', 'slug']
    });
    res.json(genres)


}




export {
    dashboard,
    usersPanel,
    multimediaPanel, uploadboard,
    postUploadMultimedia, liveUploadMonitor,
    getAlbumsByArtist,
    getAllGenres,
    jsonCheckArtistByName,
}