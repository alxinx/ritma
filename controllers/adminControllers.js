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
        const { nombreArtista, nombreAlbum, generosSeleccionados } = req.body;
        
        // 0. Parsear géneros (Crucial para los pasos 3-2 y 4)
        const generosIds = JSON.parse(generosSeleccionados || "[]");
        
        const archivosMusica = req.files['archivo[]'] || [];
        const portada = req.files['coverAlbum'] ? req.files['coverAlbum'][0] : null;

        // 1. LÓGICA DEL ARTISTA (Aseguramos el UUID)
        const [artista] = await Artistas.findOrCreate({
            where: { nombreArtista: nombreArtista.trim() },
            transaction: t
        });
        
        const idArtista = artista.idArtista;
       
        // 2. LÓGICA DE ÁLBUM (Garantizamos el idArtista capturado arriba)
        const nombreBuscado = nombreAlbum?.trim() || "Single";
        const [album] = await Album.findOrCreate({
            where: { 
                nombreAlbum: nombreBuscado, 
                idArtista: idArtista 
            },
            defaults: { 
                cover: portada ? portada.filename : null 
            },
            transaction: t
        });

        // 3. PROCESAMIENTO DE ARCHIVOS
        const resultadosMultimedia = [];

        for (const archivo of archivosMusica) {
            // Análisis de metadatos con music-metadata
            const metadata = await mm.parseFile(archivo.path);
            const tipoAsset = archivo.mimetype.startsWith('video/') ? 'VIDEO' : 'AUDIO';
            console.log(`[RTM-DEBUG] Preparando multimedia para Artista ID: ${idArtista}`);
            const nuevoMultimedia = await Multimedia.create({
                nombreComposicion: path.parse(archivo.originalname).name,
                idAlbum: album.idAlbum,
                idArtista: idArtista, 
                formato: path.extname(archivo.originalname).replace('.', ''),
                tamano: archivo.size,
                tipoAsset: tipoAsset,
                bpm: metadata.common.bpm || null,
                duracion: Math.round(metadata.format.duration) || null,
                estado_ingesta: 'processing',
                keyR2: `temp_${Date.now()}_${archivo.filename}`
            }, { transaction: t });

            // Guardar relación de Géneros para el Multimedia
            if (generosIds.length > 0) {
                const multiGeneros = generosIds.map(idGen => ({
                    idMultimedia: nuevoMultimedia.idMultimedia,
                    idGenero: idGen
                }));
                await MultimediaGeneros.bulkCreate(multiGeneros, { transaction: t });
            }

            resultadosMultimedia.push(nuevoMultimedia);
        }

        // 4. ACTUALIZAR GÉNEROS DEL ARTISTA (Sin duplicados)
        if (generosIds.length > 0) {
            for (const idGen of generosIds) {
                await ArtistaGeneros.findOrCreate({
                    where: { idArtista, idGenero: idGen },
                    transaction: t
                });
            }
        }

        await t.commit(); // Consolidación total 😠👊
        
        return res.status(200).json({
            ok: true,
            msg: 'Batch procesado y registrado en DB correctamente.',
            data: { albumId: album.idAlbum, total: resultadosMultimedia.length }
        });

    } catch (error) {
        if (t) await t.rollback(); 
        console.error('Error en la ingesta:', error);
        return res.status(500).json({ ok: false, msg: 'Error al registrar en la base de datos' });
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