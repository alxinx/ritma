import {Usuarios, Artistas, Album, Generos, Multimedia, MultimediaGeneros, ArtistaGeneros} from '../models/index.js'
import db from "../config/bd.js";
import dotenv from "dotenv";
import  path  from 'path';
import { Op } from 'sequelize';

import * as mm from 'music-metadata'; // Para BPM y Duración
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
    const t = await db.transaction(); 

    try {
      const { 
            nombreArtista, 
            nombreAlbum, 
            generosSeleccionados,   
            idArtista, 
            idAlbum,
            keyCover, 
            keysTracks, 
            titulos, 
            costos, 
            subtitulos,
            metadatos
        } = req.body;
        
        const generosIds = JSON.parse(generosSeleccionados || "[]");

        // 1. OBTENER O CREAR ARTISTA (Usando el ID si existe para mayor precisión en Ritma)
        let artista;
        if (idArtista) {
            artista = await Artistas.findByPk(idArtista, { transaction: t });
        } else {
            [artista] = await Artistas.findOrCreate({
                where: { nombreArtista: nombreArtista.trim() },
                transaction: t
            });
        }

        // 2. OBTENER O CREAR ÁLBUM
        let album;
        if (idAlbum) {
            album = await Album.findByPk(idAlbum, { transaction: t });
        } else {
            [album] = await Album.findOrCreate({
                where: { nombreAlbum: nombreAlbum?.trim() || "Single", idArtista: artista.idArtista },
                transaction: t
            });
        }

        // Actualizar portada solo si se subió una nueva
        if (keyCover) {
            await album.update({ 
                cover: keyCover // Aquí llegará solo el nombre limpio gracias al cambio en el JS
            }, { transaction: t });
            //console.log(`[RTM-ENGINE] Portada vinculada: ${keyCover}`);
        }

        // 3. REGISTRO DE TRACKS
        // Aseguramos que keysTracks sea un array para evitar errores de .length
        const tracksArray = Array.isArray(keysTracks) ? keysTracks : [keysTracks];
        const resultadosMultimedia = [];

        for (let i = 0; i < tracksArray.length; i++) {
            const keyR2 = tracksArray[i];
            const meta = metadatos[i];

            const nuevoMultimedia = await Multimedia.create({
                nombreComposicion: Array.isArray(titulos) ? titulos[i] : titulos,
                idAlbum: album.idAlbum, 
                idArtista: artista.idArtista,
                tipoAsset: keyR2.endsWith('.mp4') || keyR2.endsWith('.mov') ? 'VIDEO' : 'AUDIO',
                
                
                formato: meta ? meta.formato : 'unknown',
                tamano: meta ? meta.tamano : 0,
                duracion: meta ? meta.duracion : 0, 
                
                costoCreditos: (Array.isArray(costos) ? costos[i] : costos) || 0,
                subtitulos: Array.isArray(subtitulos) && subtitulos[i] === 'on',
                keyR2: meta.nombreFinal || keyR2.split('/').pop(),
                estado_ingesta: 'processing'
            }, { transaction: t });


            // TRANSACCIÓN DE LOS GENEROS MUSICALES AL QUE PERTENECE EL DISCO O EL VIDEO. . 

            if (generosIds.length > 0) {
                const multiGeneros = generosIds.map(idGen => ({
                    idMultimedia: nuevoMultimedia.idMultimedia,
                    idGenero: idGen
                }));
                
                await MultimediaGeneros.bulkCreate(multiGeneros, { transaction: t });
            }

            //TRANSACCION PARA  LOS GENEROS DEL ARTISTA. 
            if (generosIds.length > 0) {
            const promesasGenerosArtista = generosIds.map(idGen => {
                return ArtistaGeneros.findOrCreate({
                    where: { 
                        idArtista: artista.idArtista, 
                        idGenero: idGen 
                    },
                    transaction: t
                });
            });

            await Promise.all(promesasGenerosArtista);
            //console.log(`[RTM-ENGINE] Géneros actualizados para el artista: ${artista.nombreArtista}`);
        }


            resultadosMultimedia.push(nuevoMultimedia);
        }

        await t.commit(); 

        res.status(200).json({ ok: true, msg: '¡Registro en Ritma completado! 😌' });

    } catch (error) {
        if (t) await t.rollback();
        console.error('Error Sequelize:', error.name, error.message);
        res.status(500).json({ ok: false, msg: 'Error al guardar en la base de datos: ' + error.message });
    }
};



const validateUpload = async (req, res) => {
    try {
        const { nombreArtista, nombreAlbum, generosSeleccionados } = req.body;

        // 1. Validaciones básicas de negocio [cite: 2026-01-22]
        if (!nombreArtista || nombreArtista.trim() === "") {
            return res.status(400).json({ ok: false, msg: "El nombre del artista es obligatorio." });
        }

        const generos = JSON.parse(generosSeleccionados || "[]");
        if (generos.length === 0) {
            return res.status(400).json({ ok: false, msg: "Debes seleccionar al menos un género." });
        }

        // 2. Podrías verificar si el álbum ya existe para este artista para evitar duplicados
        // const artista = await Artistas.findOne({ where: { nombreArtista } });
        // if (artista) { ... comprobaciones extras ... }

        return res.json({ ok: true, msg: "Metadata validada. Iniciando RTM-ENGINE..." });
    } catch (error) {
        console.error("Error en validación:", error);
        return res.status(500).json({ ok: false, msg: "Error interno al validar datos." });
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
    postUploadMultimedia, validateUpload, liveUploadMonitor,
    getAlbumsByArtist,
    getAllGenres,
    jsonCheckArtistByName,
}