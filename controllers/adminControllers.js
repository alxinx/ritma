import { Usuarios, Artistas, Album, Generos, Multimedia, MultimediaGeneros, ArtistaGeneros, HistorialDescargas } from '../models/index.js'
import multimediaQueue from '../queues/multimediaQueue.js';
import db from "../config/bd.js";
import s3Client from "../config/r2.js";
import redisClient from "../config/redis.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from 'crypto';
import dotenv from "dotenv";
import path from 'path';
import { Op } from 'sequelize';

import * as mm from 'music-metadata'; // Para BPM y Duración
dotenv.config();

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const dashboard = (req, res) => {
    return res.status(200).render('../views/app/dashboard', {
        tituloPagina: "Panel de control Principal",
        subtitulo: "Bienvenido",
        active: 'dashboard',
        csrfToken: req.csrfToken()
    })
}


const usersPanel = (req, res) => {
    return res.status(200).render('../views/app/userPanel', {
        tituloPagina: "Usuarios",
        subtitulo: "Panel de control de los usuarios",
        active: 'users',
        csrfToken: req.csrfToken()
    })
}




//PANEL DE MULTIMEDIA. 
const multimediaPanel = (req, res) => {
    return res.status(200).render('../views/app/multimediaPanel', {
        tituloPagina: "Biblioteca Multimedia",
        subtitulo: "Panel principal de la biblioteca multimedia",
        active: 'multimedia',
        csrfToken: req.csrfToken()
    })
}




//MUESTRO LA HOJA DE PERFIL DEL MULTIMEDIA
const mediafile = async (req, res) => {
    try {
        const { idMultimedia } = req.params;

        const multimedia = await Multimedia.findByPk(idMultimedia, {
            include: [
                { model: Artistas, attributes: ['idArtista', 'nombreArtista', 'cover'] },
                { model: Album, attributes: ['idAlbum', 'nombreAlbum', 'cover'] },
                { model: Generos, attributes: ['genero_id', 'nombre'], through: { attributes: [] } }
            ]
        });

        if (!multimedia) {
            return res.redirect('/app/dash/multimedia');
        }



        let coverUrl = '/img/dj_latino_en_fiesta.webp';
        if (multimedia.ALBUM?.cover) {
            coverUrl = `${R2_PUBLIC_URL}/${multimedia.ALBUM.cover}`;
        } else if (multimedia.ARTISTA?.cover) {
            coverUrl = `${R2_PUBLIC_URL}/${multimedia.ARTISTA.cover}`;
        }

        // Últimas 6 descargas
        const ultimasDescargas = await HistorialDescargas.findAll({
            where: { idMultimedia },
            include: [{ model: Usuarios, attributes: ['nombreUsuario', 'apellidoUsuario', 'emailUsuario'] }],
            order: [['fechaDescarga', 'DESC']],
            limit: 6
        });

        const totalDescargas = await HistorialDescargas.count({ where: { idMultimedia } });

        return res.status(200).render('../views/app/mediafile', {
            tituloPagina: multimedia.nombreComposicion,
            subtitulo: `Perfil de ${multimedia.tipoAsset === 'AUDIO' ? 'audio' : 'video'}`,
            active: 'multimedia',
            csrfToken: req.csrfToken(),
            multimedia: multimedia.toJSON(),
            coverUrl,
            ultimasDescargas: ultimasDescargas.map(d => d.toJSON()),
            totalDescargas,
            R2_PUBLIC_URL
        });
    } catch (error) {
        console.error('Error en mediafile:', error);
        return res.redirect('/app/dash/multimedia');
    }
}



const uploadboard = (req, res) => {
    return res.status(200).render('../views/app/uploadboard', {
        tituloPagina: "Biblioteca Multimedia",
        subtitulo: "Subir Archivos Multimedia",
        active: 'multimedia',
        csrfToken: req.csrfToken()
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
            const keyTemp = tracksArray[i];
            const meta = metadatos[i];

            const nuevoMultimedia = await Multimedia.create({
                nombreComposicion: Array.isArray(titulos) ? titulos[i] : titulos,
                idAlbum: album.idAlbum,
                idArtista: artista.idArtista,
                tipoAsset: keyTemp.endsWith('.mp4') || keyTemp.endsWith('.mov') ? 'VIDEO' : 'AUDIO',


                formato: meta ? meta.formato : 'unknown',
                tamano: meta ? meta.tamano : 0,
                duracion: meta ? meta.duracion : 0,

                costoCreditos: (Array.isArray(costos) ? costos[i] : costos) || 0,
                subtitulos: Array.isArray(subtitulos) && subtitulos[i] === 'on',
                keyTemp: meta.nombreFinal || keyTemp.split('/').pop(),
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


            resultadosMultimedia.push({
                ...nuevoMultimedia.toJSON(),
                keyTemp: keyTemp // Necesitamos la key original para el worker
            });
        }

        await t.commit();

        // 5. ENCOLAR JOBS (Ya con la DB confirmada)
        // Iteramos los resultados para mandar al worker
        // Ojo: nuevoMultimedia.keyTemp en DB es el nombre limpio. 
        // En el worker necesitamos el path en R2 (que venia en keysTracks).
        // En el paso anterior guardamos keyTemp original en el objeto resultadosMultimedia.

        for (const meta of resultadosMultimedia) {
            try {
                // keyTemp en el objeto que empujamos arriba es la key de R2 (track original)
                // OJO: En el push anterior (paso 3) asegúrate de pasar la key correcta.
                // Revisemos el push: resultadosMultimedia.push({ ...nuevoMultimedia.toJSON(), keyTemp: keyTemp });

                await multimediaQueue.add('processPreview', {
                    keyTemp: meta.keyTemp, // Esta debe ser 'multimedia/temp/uuid.mp3'
                    tipoAsset: meta.tipoAsset
                });
                console.log(`[RTM-QUEUE] Job agregado para: ${meta.keyTemp}`);
            } catch (qError) {
                console.error('[RTM-QUEUE] Error al encolar:', qError);
                // No fallamos el request, solo logueamos.
                // Podrías guardar un LogErrores aquí también.
            }
        }

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

const liveUploadMonitor = async (req, res) => {
    return res.status(200).render('../views/app/live-upload-monitor', {
        tituloPagina: "Biblioteca Multimedia",
        subtitulo: "Live Upload Monitor",
        active: 'multimedia',
        csrfToken: req.csrfToken()
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
const getAlbumsByArtist = async (req, res) => {
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
        console.error('[RTM] Error en getAlbumsByArtist:', error.message);
        res.status(500).json({ msg: 'Error al consultar álbumes' });
    }

}

//Generos
const getAllGenres = async (req, res) => {
    try {
        const genres = await Generos.findAll({
            attributes: ['genero_id', 'nombre', 'slug']
        });
        res.json(genres);
    } catch (error) {
        console.error('[RTM] Error en getAllGenres:', error.message);
        res.status(500).json({ msg: 'Error al obtener géneros' });
    }
}




// ==========================================
// LISTADO MULTIMEDIA (paginado + filtros)
// ==========================================
const getMultimediaList = async (req, res) => {
    try {
        const {
            q = '',
            buscarpor = 'artista',
            formato = 'all',
            generos = '',
            page = 1,
            limit = 20
        } = req.query;

        const pageNum  = Math.max(1, parseInt(page)  || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
        const offset   = (pageNum - 1) * limitNum;

        const where = {};

        // Filtro por tipo de asset
        if (formato === 'audio')      where.tipoAsset = 'AUDIO';
        else if (formato === 'video') where.tipoAsset = 'VIDEO';

        // Busqueda por composicion
        if (q.trim() && buscarpor === 'composicion') {
            where.nombreComposicion = { [Op.like]: `%${q.trim()}%` };
        }

        // Include Artistas
        const includeArtista = {
            model: Artistas,
            attributes: ['idArtista', 'nombreArtista'],
            required: false
        };

        // Busqueda por nombre de artista
        if (q.trim() && buscarpor === 'artista') {
            includeArtista.where = { nombreArtista: { [Op.like]: `%${q.trim()}%` } };
            includeArtista.required = true;
        }

        // Filtro por generos
        let generoIds = [];
        if (generos) {
            try { generoIds = JSON.parse(generos); }
            catch { generoIds = generos.split(',').filter(Boolean); }
        }

        if (generoIds.length > 0) {
            const multimediaConGenero = await MultimediaGeneros.findAll({
                where: { idGenero: { [Op.in]: generoIds } },
                attributes: ['idMultimedia'],
                group: ['idMultimedia']
            });
            const idsConGenero = multimediaConGenero.map(m => m.idMultimedia);

            if (idsConGenero.length === 0) {
                return res.json({ ok: true, multimedia: [], total: 0, pagina: pageNum, totalPaginas: 0 });
            }
            where.idMultimedia = { [Op.in]: idsConGenero };
        }

        const { count, rows } = await Multimedia.findAndCountAll({
            where,
            include: [
                includeArtista,
                {
                    model: Generos,
                    attributes: ['genero_id', 'nombre'],
                    through: { attributes: [] },
                    required: false
                }
            ],
            attributes: [
                'idMultimedia', 'nombreComposicion', 'formato', 'tipoAsset',
                'descargas', 'estado', 'estado_ingesta', 'duracion',
                'createdAt'
            ],
            order: [['createdAt', 'DESC']],
            limit: limitNum,
            offset,
            distinct: true,
            subQuery: false
        });

        res.json({
            ok: true,
            multimedia: rows,
            total: count,
            pagina: pageNum,
            totalPaginas: Math.ceil(count / limitNum)
        });

    } catch (error) {
        console.error('Error getMultimediaList:', error);
        res.status(500).json({ ok: false, msg: 'Error al consultar multimedia' });
    }
};

// ==========================================
// POLLING DE ESTADOS (async status update)
// ==========================================
const getMultimediaStatus = async (req, res) => {
    try {
        const { ids } = req.query;
        if (!ids) return res.json([]);

        const idArray = ids.split(',').filter(Boolean);
        if (idArray.length === 0) return res.json([]);

        const registros = await Multimedia.findAll({
            where: { idMultimedia: { [Op.in]: idArray } },
            attributes: ['idMultimedia', 'estado', 'estado_ingesta']
        });

        res.json(registros);
    } catch (error) {
        console.error('Error getMultimediaStatus:', error);
        res.status(500).json({ msg: 'Error al consultar estados' });
    }
};


// ==========================================
// TOGGLE ESTADO MULTIMEDIA (ENABLE/DISABLE)
// ==========================================
const toggleMultimediaEstado = async (req, res) => {
    try {
        const { idMultimedia } = req.params;
        const multimedia = await Multimedia.findByPk(idMultimedia);
        if (!multimedia) return res.status(404).json({ ok: false, msg: 'Multimedia no encontrado' });

        const nuevoEstado = multimedia.estado === 'ENABLE' ? 'DISABLE' : 'ENABLE';
        await multimedia.update({ estado: nuevoEstado });

        res.json({ ok: true, nuevoEstado });
    } catch (error) {
        console.error('Error toggleMultimediaEstado:', error);
        res.status(500).json({ ok: false, msg: 'Error al cambiar estado' });
    }
};

// ==========================================
// SOLICITAR TOKEN DE DESCARGA (OTP Redis)
// ==========================================
const requestDownloadToken = async (req, res) => {
    try {
        const { idMultimedia } = req.params;
        const multimedia = await Multimedia.findByPk(idMultimedia);
        if (!multimedia) return res.status(404).json({ ok: false, msg: 'Multimedia no encontrado' });
        if (!multimedia.keyOriginal) return res.status(400).json({ ok: false, msg: 'Archivo original no disponible' });

        const token = crypto.randomUUID();
        await redisClient.setEx(`download:${token}`, 60, JSON.stringify({
            idMultimedia,
            idUsuario: req.usuario.idUsuario
        }));

        res.json({ ok: true, token });
    } catch (error) {
        console.error('Error requestDownloadToken:', error);
        res.status(500).json({ ok: false, msg: 'Error al generar token de descarga' });
    }
};

// ==========================================
// VERIFICAR TOKEN Y REDIRIGIR A DESCARGA
// ==========================================
const verifyAndDownload = async (req, res) => {
    try {
        const { token } = req.params;
        const data = await redisClient.get(`download:${token}`);

        if (!data) {
            return res.status(403).json({ ok: false, msg: 'Token expirado o inválido' });
        }

        // Eliminar token (un solo uso)
        await redisClient.del(`download:${token}`);

        const { idMultimedia, idUsuario } = JSON.parse(data);
        const multimedia = await Multimedia.findByPk(idMultimedia);

        if (!multimedia || !multimedia.keyOriginal) {
            return res.status(404).json({ ok: false, msg: 'Archivo no encontrado' });
        }

        // Registrar descarga
        await HistorialDescargas.create({ idMultimedia, idUsuario });
        await multimedia.increment('descargas');

        // Generar presigned URL para descarga
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: `multimedia/originals/${multimedia.keyOriginal}`,
            ResponseContentDisposition: `attachment; filename="${multimedia.nombreComposicion}.${multimedia.formato}"`
        });
        const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 30 });

        res.redirect(downloadUrl);
    } catch (error) {
        console.error('Error verifyAndDownload:', error);
        res.status(500).json({ ok: false, msg: 'Error al procesar descarga' });
    }
};

// ==========================================
// ACTUALIZAR DATOS DE MULTIMEDIA (EDIT MODAL)
// ==========================================
const updateMultimediaData = async (req, res) => {
    const t = await db.transaction();
    try {
        const { idMultimedia } = req.params;
        const { nombreComposicion, costoCreditos, idAlbum, generos } = req.body;

        const multimedia = await Multimedia.findByPk(idMultimedia, { transaction: t });
        if (!multimedia) {
            await t.rollback();
            return res.status(404).json({ ok: false, msg: 'Multimedia no encontrado' });
        }

        // Update basic fields
        const updateFields = {};
        if (nombreComposicion !== undefined) updateFields.nombreComposicion = nombreComposicion.trim();
        if (costoCreditos !== undefined) updateFields.costoCreditos = parseInt(costoCreditos) || 0;
        if (idAlbum !== undefined) updateFields.idAlbum = idAlbum || null;

        await multimedia.update(updateFields, { transaction: t });

        // Update genres: destroy existing + recreate
        if (Array.isArray(generos)) {
            await MultimediaGeneros.destroy({
                where: { idMultimedia },
                transaction: t
            });

            if (generos.length > 0) {
                const multiGeneros = generos.map(idGen => ({
                    idMultimedia,
                    idGenero: idGen
                }));
                await MultimediaGeneros.bulkCreate(multiGeneros, { transaction: t });
            }
        }

        await t.commit();
        res.json({ ok: true, msg: 'Datos actualizados correctamente' });
    } catch (error) {
        if (t) await t.rollback();
        console.error('Error updateMultimediaData:', error);
        res.status(500).json({ ok: false, msg: 'Error al actualizar datos' });
    }
};

// ==========================================
// SOLICITAR TOKEN DE STREAMING (video seguro)
// ==========================================
const requestStreamToken = async (req, res) => {
    try {
        const { idMultimedia } = req.params;
        const multimedia = await Multimedia.findByPk(idMultimedia, {
            attributes: ['idMultimedia', 'keyPreview']
        });
        if (!multimedia || !multimedia.keyPreview) {
            return res.status(404).json({ ok: false, msg: 'Preview no disponible' });
        }

        const token = crypto.randomUUID();
        await redisClient.setEx(`stream:${token}`, 120, JSON.stringify({
            idMultimedia,
            ip: req.ip
        }));

        res.json({ ok: true, token });
    } catch (error) {
        console.error('Error requestStreamToken:', error);
        res.status(500).json({ ok: false, msg: 'Error al generar token de streaming' });
    }
};

// ==========================================
// STREAMING DE VIDEO CON HTTP 206 RANGE
// ==========================================
const streamVideo = async (req, res) => {
    try {
        const { idMultimedia } = req.params;
        const { token } = req.query;
        const clientIp = req.ip;
        const sessionKey = `stream-session:${idMultimedia}:${clientIp}`;

        // Validate access: one-time token OR existing session
        const existingSession = await redisClient.get(sessionKey);

        if (!existingSession) {
            // First request — validate one-time token
            if (!token) return res.status(403).json({ msg: 'Token requerido' });

            const tokenData = await redisClient.get(`stream:${token}`);
            if (!tokenData) return res.status(403).json({ msg: 'Token expirado o inválido' });

            const parsed = JSON.parse(tokenData);
            if (parsed.idMultimedia !== idMultimedia) return res.status(403).json({ msg: 'Token no corresponde' });

            // Consume token and create session (5 min TTL, refreshed on each request)
            await redisClient.del(`stream:${token}`);
            await redisClient.setEx(sessionKey, 300, '1');
        } else {
            // Refresh session TTL on each Range request
            await redisClient.expire(sessionKey, 300);
        }

        // Fetch multimedia info
        const multimedia = await Multimedia.findByPk(idMultimedia, {
            attributes: ['idMultimedia', 'keyPreview', 'tipoAsset']
        });
        if (!multimedia || !multimedia.keyPreview) return res.status(404).end();

        const r2Key = `multimedia/previews/${multimedia.keyPreview}`;
        const contentType = multimedia.tipoAsset === 'VIDEO' ? 'video/mp4' : 'audio/mpeg';

        // Check Range header
        const rangeHeader = req.headers.range;

        if (rangeHeader) {
            // First get file size with a HEAD-like request
            const headCommand = new GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: r2Key
            });
            const headResponse = await s3Client.send(headCommand);
            const fileSize = headResponse.ContentLength;
            // Destroy the body we don't need
            headResponse.Body.destroy();

            // Parse range
            const parts = rangeHeader.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            // Fetch range from R2
            const rangeCommand = new GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: r2Key,
                Range: `bytes=${start}-${end}`
            });
            const rangeResponse = await s3Client.send(rangeCommand);

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': contentType,
                'Cache-Control': 'private, no-store'
            });

            rangeResponse.Body.pipe(res);
        } else {
            // Full file request
            const command = new GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: r2Key
            });
            const r2Response = await s3Client.send(command);

            res.set('Content-Type', contentType);
            if (r2Response.ContentLength) res.set('Content-Length', r2Response.ContentLength);
            res.set('Accept-Ranges', 'bytes');
            res.set('Cache-Control', 'private, no-store');
            res.set('Content-Disposition', 'inline');

            r2Response.Body.pipe(res);
        }
    } catch (error) {
        console.error('Error streamVideo:', error);
        res.status(500).end();
    }
};

// ==========================================
// PROXY STREAMING DE PREVIEW (no expone R2 URL)
// Soporta Range requests para audio/video seek
// ==========================================
const streamPreview = async (req, res) => {
    try {
        const { idMultimedia } = req.params;
        const multimedia = await Multimedia.findByPk(idMultimedia, {
            attributes: ['idMultimedia', 'keyPreview', 'keyOriginal', 'formato', 'tipoAsset']
        });

        if (!multimedia) return res.status(404).end();

        // Use preview if available, fallback to original (for videos uploaded before worker update)
        let r2Key;
        if (multimedia.keyPreview) {
            r2Key = `multimedia/previews/${multimedia.keyPreview}`;
        } else if (multimedia.keyOriginal) {
            r2Key = `multimedia/originals/${multimedia.keyOriginal}`;
        } else {
            return res.status(404).end();
        }

        const contentType = multimedia.tipoAsset === 'VIDEO' ? 'video/mp4' : 'audio/mpeg';
        const rangeHeader = req.headers.range;

        if (rangeHeader) {
            // Get file size first
            const headCommand = new GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: r2Key
            });
            const headResponse = await s3Client.send(headCommand);
            const fileSize = headResponse.ContentLength;
            headResponse.Body.destroy();

            const parts = rangeHeader.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            const rangeCommand = new GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: r2Key,
                Range: `bytes=${start}-${end}`
            });
            const rangeResponse = await s3Client.send(rangeCommand);

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': contentType,
                'Cache-Control': 'private, max-age=3600'
            });

            rangeResponse.Body.pipe(res);
        } else {
            const command = new GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: r2Key
            });
            const r2Response = await s3Client.send(command);

            res.set('Content-Type', contentType);
            if (r2Response.ContentLength) res.set('Content-Length', r2Response.ContentLength);
            res.set('Accept-Ranges', 'bytes');
            res.set('Cache-Control', 'private, max-age=3600');

            r2Response.Body.pipe(res);
        }
    } catch (error) {
        console.error('Error streamPreview:', error);
        res.status(500).end();
    }
};

export {
    dashboard,
    usersPanel,
    multimediaPanel, uploadboard, mediafile,
    postUploadMultimedia, validateUpload, liveUploadMonitor,
    getAlbumsByArtist,
    getAllGenres,
    jsonCheckArtistByName,
    getMultimediaList,
    getMultimediaStatus,
    toggleMultimediaEstado,
    requestDownloadToken,
    verifyAndDownload,
    updateMultimediaData,
    requestStreamToken,
    streamVideo,
    streamPreview,
}