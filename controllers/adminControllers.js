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
        
        // 0. Parsear géneros y archivos
        const generosIds = JSON.parse(generosSeleccionados || "[]");
        const archivosMusica = req.files['archivo[]'] || [];
        const portada = req.files['coverAlbum'] ? req.files['coverAlbum'][0] : null;

        // 1. LÓGICA DEL ARTISTA
        const [artista] = await Artistas.findOrCreate({
            where: { nombreArtista: nombreArtista.trim() },
            transaction: t
        });
        const idArtista = artista.idArtista;
       
        // 2. LÓGICA DE ÁLBUM
        const nombreBuscado = nombreAlbum?.trim() || "Single";
        const nombreArchivoPortada = portada ? portada.filename : null;

        const [album, creado] = await Album.findOrCreate({
            where: { 
                nombreAlbum: nombreBuscado, 
                idArtista: idArtista 
            },
            transaction: t
        });

        // Forzamos la actualización usando el método .update() de la instancia
        if (nombreArchivoPortada) {
            await album.update({ 
                cover: nombreArchivoPortada 
            }, { transaction: t });
            
            console.log(`[RTM-DEBUG] Portada registrada: ${nombreArchivoPortada} para el álbum: ${album.nombreAlbum}`);
        }


if (nombreArchivoPortada) {
    album.cover = nombreArchivoPortada; 
    await album.save({ transaction: t });
}

        // 3. CAPTURA Y LIMPIEZA DE METADATOS DEL FORMULARIO
        const titulosFormulario = req.body['titulo[]'] || req.body.titulo || [];        
        const costoCreditos = req.body['costoCreditos[]'] || req.body.costoCreditos || [];
        const subtitulosBody = req.body['subtitulos[]'] || req.body.subtitulos || [];

        const resultadosMultimedia = [];

        // --- BUCLE PRINCIPAL DE PROCESAMIENTO ---
        for (let i = 0; i < archivosMusica.length; i++) {
            const archivo = archivosMusica[i];

            // A. Sincronización de Título
            let tituloDeEsteTrack = Array.isArray(titulosFormulario) ? titulosFormulario[i] : titulosFormulario;
            
            if (!tituloDeEsteTrack || tituloDeEsteTrack.trim() === "") {
                tituloDeEsteTrack = path.parse(archivo.originalname).name;
            }

            // B. Sincronización de Créditos
            let valorEsteTrack = Array.isArray(costoCreditos) ? costoCreditos[i] : costoCreditos;
            valorEsteTrack = (valorEsteTrack !== undefined && valorEsteTrack !== "") ? valorEsteTrack : 0;

            let marcado = false;

            if (Array.isArray(subtitulosBody)) {
                    const valor = subtitulosBody[i];

                    if (Array.isArray(valor)) {
                        marcado = valor.includes('on');
                    } else {
                        marcado = valor === 'on';
                    }
                } else {
                    marcado = subtitulosBody === 'on';
                }
            // D. Regla de Negocio: Solo VIDEO puede tener subtítulos
            const esVideoReal = archivo.mimetype.startsWith('video/');
            
            const tipoAsset = esVideoReal ? 'VIDEO' : 'AUDIO';
            const tieneSubtitulos = esVideoReal && marcado;

        
            
            // E. Extracción de Metadatos Técnicos
            const metadata = await mm.parseFile(archivo.path);
            
            // F. Creación del Registro en DB
            const nuevoMultimedia = await Multimedia.create({
                nombreComposicion: tituloDeEsteTrack,
                idAlbum: album.idAlbum, 
                idArtista: idArtista, 
                formato: path.extname(archivo.originalname).replace('.', ''),
                tamano: archivo.size,
                tipoAsset: tipoAsset,
                subtitulos: tieneSubtitulos, 
                bpm: metadata.common.bpm || null,
                duracion: Math.round(metadata.format.duration) || null,
                costoCreditos: valorEsteTrack,
                estado_ingesta: 'processing',
                keyR2: `temp_${Date.now()}_${archivo.filename}`
            }, { transaction: t });

            // G. Relación de Géneros Multimedia
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

        // 5. COMMIT DE LA TRANSACCIÓN
        await t.commit(); 
        
        return res.status(200).json({
            ok: true,
            msg: 'Batch procesado y registrado correctamente 😌.',
            data: { albumId: album.idAlbum, total: resultadosMultimedia.length }
        });

    } catch (error) {
        if (t) await t.rollback(); 
        console.error('Error en la ingesta RTM-ENGINE:', error);
        return res.status(500).json({ 
            ok: false, 
            msg: 'Error crítico en el registro de multimedia' 
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