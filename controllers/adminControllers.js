import { Usuarios, Artistas, Album, Generos, Multimedia, MultimediaGeneros, ArtistaGeneros, HistorialDescargas, Aspirantes, RitmaCoins, Wishlist } from '../models/index.js'
import multimediaQueue from '../queues/multimediaQueue.js';
import db from "../config/bd.js";
import s3Client from "../config/r2.js";
import redisClient, { redisSub } from "../config/redis.js";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { pipeline } from 'stream/promises';
import crypto from 'crypto';
import dotenv from "dotenv";
import path from 'path';
import { Op } from 'sequelize';

import * as mm from 'music-metadata'; // Para BPM y Duración
dotenv.config();

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const dashboard = async (req, res) => {
    try {
        const aspirantesEnEspera = await Aspirantes.count({ where: { estadoAspirante: 'aspirante' } });

        return res.status(200).render('../views/app/dashboard', {
            tituloPagina: "Panel de control Principal",
            subtitulo: "Bienvenido",
            active: 'dashboard',
            csrfToken: req.csrfToken(),
            aspirantesEnEspera
        });
    } catch (error) {
        console.error('Error dashboard:', error);
        return res.status(200).render('../views/app/dashboard', {
            tituloPagina: "Panel de control Principal",
            subtitulo: "Bienvenido",
            active: 'dashboard',
            csrfToken: req.csrfToken(),
            aspirantesEnEspera: 0
        });
    }
}


const usersPanel = async (req, res) => {
    try {
        // Miembros activos (no admin)
        const miembrosActivos = await Usuarios.count({ where: { permisos: 'USUARIO' } });

        // Créditos en circulación (sum cantidadActual > 0)
        const creditosCirculacion = await RitmaCoins.sum('cantidadActual', {
            where: { cantidadActual: { [Op.gt]: 0 } }
        }) || 0;

        // Descargas hoy
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const descargasHoy = await HistorialDescargas.count({
            where: { fechaDescarga: { [Op.gte]: hoy } }
        });

        // Nuevas solicitudes (estado = aspirante)
        const nuevasSolicitudes = await Aspirantes.count({ where: { estadoAspirante: 'aspirante' } });

        // Tendencia semanal de solicitudes
        const tendencia = await calcularTendenciaSolicitudes();

        return res.status(200).render('../views/app/userPanel', {
            tituloPagina: "Usuarios",
            subtitulo: "Panel de control de los usuarios",
            active: 'users',
            csrfToken: req.csrfToken(),
            miembrosActivos,
            creditosCirculacion,
            descargasHoy,
            nuevasSolicitudes,
            tendencia
        });
    } catch (error) {
        console.error('Error usersPanel:', error);
        return res.status(500).send('Error cargando panel de usuarios');
    }
}




// ==========================================
// PANEL DE DESCARGAS — Analíticas
// ==========================================
const downloadsPanel = async (req, res) => {
    try {
        const hace30 = new Date();
        hace30.setDate(hace30.getDate() - 30);
        const hace60 = new Date();
        hace60.setDate(hace60.getDate() - 60);
        const hace7 = new Date();
        hace7.setDate(hace7.getDate() - 7);
        const hace14 = new Date();
        hace14.setDate(hace14.getDate() - 14);

        // --- Todas las queries en paralelo ---
        const [
            gbSemanal,
            gbSemanaAnterior,
            topArchivos,
            topUsuarios,
            topGeneros,
            topAudios,
            topVideos
        ] = await Promise.all([

            // 1. GB descargados última semana
            db.query(`
                SELECT COALESCE(SUM(m.tamano), 0) AS totalBytes
                FROM HISTORIAL_DESCARGAS_MULTIMEDIA hd
                JOIN MULTIMEDIA m ON hd.idMultimedia = m.idMultimedia
                WHERE hd.fechaDescarga >= :hace7
            `, { replacements: { hace7 }, type: db.QueryTypes.SELECT }),

            // GB semana anterior (para tendencia)
            db.query(`
                SELECT COALESCE(SUM(m.tamano), 0) AS totalBytes
                FROM HISTORIAL_DESCARGAS_MULTIMEDIA hd
                JOIN MULTIMEDIA m ON hd.idMultimedia = m.idMultimedia
                WHERE hd.fechaDescarga >= :hace14 AND hd.fechaDescarga < :hace7
            `, { replacements: { hace14, hace7 }, type: db.QueryTypes.SELECT }),

            // 2. Top 3 archivos más descargados (30 días)
            db.query(`
                SELECT m.idMultimedia, m.nombreComposicion, m.tipoAsset, m.tamano, m.formato,
                       COUNT(*) AS descargas
                FROM HISTORIAL_DESCARGAS_MULTIMEDIA hd
                JOIN MULTIMEDIA m ON hd.idMultimedia = m.idMultimedia
                WHERE hd.fechaDescarga >= :hace30
                GROUP BY m.idMultimedia
                ORDER BY descargas DESC
                LIMIT 3
            `, { replacements: { hace30 }, type: db.QueryTypes.SELECT }),

            // 3. Top 3 usuarios que más descargan (30 días)
            db.query(`
                SELECT u.idUsuario, u.nombreUsuario, u.apellidoUsuario,
                       COUNT(*) AS descargas,
                       COALESCE(SUM(m.tamano), 0) AS totalBytes
                FROM HISTORIAL_DESCARGAS_MULTIMEDIA hd
                JOIN USUARIOS u ON hd.idUsuario = u.idUsuario
                JOIN MULTIMEDIA m ON hd.idMultimedia = m.idMultimedia
                WHERE hd.fechaDescarga >= :hace30
                GROUP BY u.idUsuario
                ORDER BY descargas DESC
                LIMIT 3
            `, { replacements: { hace30 }, type: db.QueryTypes.SELECT }),

            // 4. Top 4 géneros más descargados (30 días)
            db.query(`
                SELECT g.nombre AS nombreGenero, g.genero_id AS idGenero,
                       COUNT(*) AS descargas
                FROM HISTORIAL_DESCARGAS_MULTIMEDIA hd
                JOIN MULTIMEDIA m ON hd.idMultimedia = m.idMultimedia
                JOIN MULTIMEDIA_GENEROS mg ON m.idMultimedia = mg.idMultimedia
                JOIN GENEROS g ON mg.idGenero = g.genero_id
                WHERE hd.fechaDescarga >= :hace30
                GROUP BY g.genero_id, g.nombre
                ORDER BY descargas DESC
                LIMIT 4
            `, { replacements: { hace30 }, type: db.QueryTypes.SELECT }),

            // 5. Top 5 audios más descargados (30 días)
            db.query(`
                SELECT m.nombreComposicion, m.formato, COUNT(*) AS descargas
                FROM HISTORIAL_DESCARGAS_MULTIMEDIA hd
                JOIN MULTIMEDIA m ON hd.idMultimedia = m.idMultimedia
                WHERE hd.fechaDescarga >= :hace30 AND m.tipoAsset = 'AUDIO'
                GROUP BY m.idMultimedia
                ORDER BY descargas DESC
                LIMIT 5
            `, { replacements: { hace30 }, type: db.QueryTypes.SELECT }),

            // 6. Top 5 videos más descargados (30 días)
            db.query(`
                SELECT m.nombreComposicion, m.formato, COUNT(*) AS descargas
                FROM HISTORIAL_DESCARGAS_MULTIMEDIA hd
                JOIN MULTIMEDIA m ON hd.idMultimedia = m.idMultimedia
                WHERE hd.fechaDescarga >= :hace30 AND m.tipoAsset = 'VIDEO'
                GROUP BY m.idMultimedia
                ORDER BY descargas DESC
                LIMIT 5
            `, { replacements: { hace30 }, type: db.QueryTypes.SELECT })
        ]);

        // Procesar GB semanal
        const bytesEstaSemana = Number(gbSemanal[0]?.totalBytes || 0);
        const bytesSemanaAnterior = Number(gbSemanaAnterior[0]?.totalBytes || 0);
        const gbDescargados = (bytesEstaSemana / (1024 ** 3)).toFixed(1);

        // Tendencia semanal
        let tendenciaGB = { porcentaje: '0.0', direccion: 'flat' };
        if (bytesSemanaAnterior > 0) {
            const cambio = ((bytesEstaSemana - bytesSemanaAnterior) / bytesSemanaAnterior) * 100;
            tendenciaGB = {
                porcentaje: Math.abs(cambio).toFixed(1),
                direccion: cambio > 0 ? 'up' : cambio < 0 ? 'down' : 'flat'
            };
        } else if (bytesEstaSemana > 0) {
            tendenciaGB = { porcentaje: '100', direccion: 'up' };
        }

        // Formatear tamaños
        function formatBytes(bytes) {
            const b = Number(bytes);
            if (b >= 1024 ** 3) return (b / (1024 ** 3)).toFixed(1) + ' GB';
            if (b >= 1024 ** 2) return (b / (1024 ** 2)).toFixed(0) + ' MB';
            return (b / 1024).toFixed(0) + ' KB';
        }

        function formatCount(n) {
            const num = Number(n);
            if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
            return num.toString();
        }

        // Procesar géneros con porcentaje
        const totalDescargasGeneros = topGeneros.reduce((s, g) => s + Number(g.descargas), 0);
        const generosConPct = topGeneros.map(g => ({
            ...g,
            porcentaje: totalDescargasGeneros > 0 ? Math.round((Number(g.descargas) / totalDescargasGeneros) * 100) : 0
        }));

        return res.status(200).render('../views/app/downloadsPanel', {
            tituloPagina: "Analíticas de Descargas",
            subtitulo: "Panel de descargas",
            active: 'downloads',
            csrfToken: req.csrfToken(),
            gbDescargados,
            tendenciaGB,
            topArchivos: topArchivos.map(a => ({ ...a, tamanoFmt: formatBytes(a.tamano), descargasFmt: formatCount(a.descargas) })),
            topUsuarios: topUsuarios.map(u => ({ ...u, totalFmt: formatBytes(u.totalBytes), descargasFmt: formatCount(u.descargas) })),
            topGeneros: generosConPct,
            topAudios: topAudios.map(a => ({ ...a, descargasFmt: formatCount(a.descargas) })),
            topVideos: topVideos.map(v => ({ ...v, descargasFmt: formatCount(v.descargas) }))
        });
    } catch (error) {
        console.error('Error downloadsPanel:', error);
        return res.status(500).render('../views/app/dashboard', { tituloPagina: 'Error', csrfToken: req.csrfToken() });
    }
};

// ==========================================
// API: Top Géneros descargados (reutilizable)
// ==========================================
const getTopGeneros = async (req, res) => {
    try {
        const dias = parseInt(req.query.dias) || 30;
        const limit = parseInt(req.query.limit) || 5;
        const desde = new Date();
        desde.setDate(desde.getDate() - dias);

        const topGeneros = await db.query(`
            SELECT g.nombre AS nombreGenero, g.genero_id AS idGenero,
                   COUNT(*) AS descargas
            FROM HISTORIAL_DESCARGAS_MULTIMEDIA hd
            JOIN MULTIMEDIA m ON hd.idMultimedia = m.idMultimedia
            JOIN MULTIMEDIA_GENEROS mg ON m.idMultimedia = mg.idMultimedia
            JOIN GENEROS g ON mg.idGenero = g.genero_id
            WHERE hd.fechaDescarga >= :desde
            GROUP BY g.genero_id, g.nombre
            ORDER BY descargas DESC
            LIMIT :limit
        `, { replacements: { desde, limit }, type: db.QueryTypes.SELECT });

        const total = topGeneros.reduce((s, g) => s + Number(g.descargas), 0);
        const data = topGeneros.map(g => ({
            ...g,
            porcentaje: total > 0 ? Math.round((Number(g.descargas) / total) * 100) : 0
        }));

        res.json({ ok: true, data, total });
    } catch (error) {
        console.error('Error getTopGeneros:', error);
        res.status(500).json({ ok: false, msg: 'Error al consultar géneros' });
    }
};

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
    let t;
    try {
        t = await db.transaction();
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
            bpms,
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
                bpm: (() => {
                    const val = parseInt(Array.isArray(bpms) ? bpms[i] : bpms);
                    return val >= 20 && val <= 200 ? val : null;
                })(),
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
        if (t && !t.finished) await t.rollback();
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
            bpmMin = '',
            bpmMax = '',
            page = 1,
            limit = process.env.MAX_ROWS_FOR_PAGE
        } = req.query;

        const pageNum  = Math.max(1, parseInt(page)  || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
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

        // Filtro por rango de BPM
        const bpmMinVal = parseInt(bpmMin);
        const bpmMaxVal = parseInt(bpmMax);
        if (!isNaN(bpmMinVal) && !isNaN(bpmMaxVal)) {
            where.bpm = { [Op.between]: [bpmMinVal, bpmMaxVal] };
        } else if (!isNaN(bpmMinVal)) {
            where.bpm = { [Op.gte]: bpmMinVal };
        } else if (!isNaN(bpmMaxVal)) {
            where.bpm = { [Op.lte]: bpmMaxVal };
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
                'descargas', 'estado', 'estado_ingesta', 'duracion', 'bpm',
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
    let t;
    try {
        t = await db.transaction();
        const { idMultimedia } = req.params;
        const { nombreComposicion, bpm, costoCreditos, idAlbum, albumNombre, generos } = req.body;

        const multimedia = await Multimedia.findByPk(idMultimedia, { transaction: t });
        if (!multimedia) {
            await t.rollback();
            return res.status(404).json({ ok: false, msg: 'Multimedia no encontrado' });
        }

        // Update basic fields
        const updateFields = {};
        if (nombreComposicion !== undefined) updateFields.nombreComposicion = nombreComposicion.trim();
        if (bpm !== undefined) updateFields.bpm = bpm ? Math.min(200, Math.max(20, parseInt(bpm))) : null;
        if (costoCreditos !== undefined) updateFields.costoCreditos = parseInt(costoCreditos) || 0;

        // Album logic: resolve idAlbum, albumNombre, or auto-assign "Single"
        const artistaId = multimedia.idArtista;
        if (idAlbum) {
            // User selected an existing album from autocomplete
            updateFields.idAlbum = idAlbum;
        } else if (albumNombre && albumNombre.trim()) {
            // User typed a new album name — find or create it
            const [album] = await Album.findOrCreate({
                where: { nombreAlbum: albumNombre.trim(), idArtista: artistaId },
                defaults: { nombreAlbum: albumNombre.trim(), idArtista: artistaId },
                transaction: t
            });
            updateFields.idAlbum = album.idAlbum;
        } else if (artistaId) {
            // No album provided — auto-assign "Single" for this artist
            const [singleAlbum] = await Album.findOrCreate({
                where: { nombreAlbum: 'Single', idArtista: artistaId },
                defaults: { nombreAlbum: 'Single', idArtista: artistaId },
                transaction: t
            });
            updateFields.idAlbum = singleAlbum.idAlbum;
        }

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
        if (t && !t.finished) await t.rollback();
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

        // Get file size via HEAD (no body download)
        const headCommand = new HeadObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: r2Key
        });
        const headResponse = await s3Client.send(headCommand);
        const fileSize = headResponse.ContentLength;

        const rangeHeader = req.headers.range;

        if (rangeHeader) {
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
                'Cache-Control': 'private, no-store'
            });

            // pipeline() auto-destruye ambos streams en error o disconnect
            await pipeline(rangeResponse.Body, res);
        } else {
            const command = new GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: r2Key
            });
            const r2Response = await s3Client.send(command);

            res.set('Content-Type', contentType);
            res.set('Content-Length', fileSize);
            res.set('Accept-Ranges', 'bytes');
            res.set('Cache-Control', 'private, no-store');
            res.set('Content-Disposition', 'inline');

            await pipeline(r2Response.Body, res);
        }
    } catch (error) {
        // pipeline throws on client disconnect (ERR_STREAM_PREMATURE_CLOSE) — normal for seeking
        if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
            console.error('Error streamVideo:', error);
        }
        if (!res.headersSent) res.status(500).end();
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

        // Get file size via HEAD (no body download)
        const headCommand = new HeadObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: r2Key
        });
        const headResponse = await s3Client.send(headCommand);
        const fileSize = headResponse.ContentLength;

        const rangeHeader = req.headers.range;

        if (rangeHeader) {
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

            await pipeline(rangeResponse.Body, res);
        } else {
            const command = new GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: r2Key
            });
            const r2Response = await s3Client.send(command);

            res.set('Content-Type', contentType);
            res.set('Content-Length', fileSize);
            res.set('Accept-Ranges', 'bytes');
            res.set('Cache-Control', 'private, max-age=3600');

            await pipeline(r2Response.Body, res);
        }
    } catch (error) {
        if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
            console.error('Error streamPreview:', error);
        }
        if (!res.headersSent) res.status(500).end();
    }
};

// ==========================================
// PANEL DE USUARIOS — Miembros Activos (paginado)
// ==========================================
const getActiveMembers = async (req, res) => {
    try {
        const limit = parseInt(process.env.MAX_ROWS_FOR_PAGE) || 10;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        const where = { permisos: 'USUARIO' };
        if (search) {
            where[Op.or] = [
                { nombreUsuario: { [Op.like]: `%${search}%` } },
                { apellidoUsuario: { [Op.like]: `%${search}%` } },
                { emailUsuario: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows: usuarios } = await Usuarios.findAndCountAll({
            where,
            attributes: ['idUsuario', 'nombreUsuario', 'apellidoUsuario', 'emailUsuario', 'createdAt'],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        // Build enriched data for each user
        const data = await Promise.all(usuarios.map(async (u) => {
            // Credits: sum cantidadActual where cantidadActual > 0
            const creditosResult = await RitmaCoins.sum('cantidadActual', {
                where: { idUsuario: u.idUsuario, cantidadActual: { [Op.gt]: 0 } }
            });

            // Download count
            const nroDescargas = await HistorialDescargas.count({
                where: { idUsuario: u.idUsuario }
            });

            // Last download date
            const ultimaDescarga = await HistorialDescargas.findOne({
                where: { idUsuario: u.idUsuario },
                order: [['fechaDescarga', 'DESC']],
                attributes: ['fechaDescarga']
            });

            return {
                idUsuario: u.idUsuario,
                nombre: u.nombreUsuario,
                apellido: u.apellidoUsuario,
                email: u.emailUsuario,
                creditos: creditosResult || 0,
                nroDescargas,
                ultimaDescarga: ultimaDescarga ? ultimaDescarga.fechaDescarga : null
            };
        }));

        res.json({
            ok: true,
            data,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        console.error('Error getActiveMembers:', error);
        res.status(500).json({ ok: false, msg: 'Error al obtener miembros' });
    }
};

// ==========================================
// PANEL DE USUARIOS — Solicitudes (aspirantes)
// ==========================================
const getAspirantes = async (req, res) => {
    try {
        const aspirantes = await Aspirantes.findAll({
            where: { estadoAspirante: 'aspirante' },
            order: [['createdAt', 'DESC']]
        });

        const codeAdmin = process.env.CODEADMIN || '';

        const data = aspirantes.map(a => ({
            idAspirante: a.idAspirante,
            nombre: a.nombreAspirante,
            apellido: a.apellidoAspirante,
            email: a.emailAspirante,
            whatsapp: a.whatsappAspirante,
            ciudad: a.ciudadAspirante,
            instagram: a.instagramAspirante,
            tiktok: a.tiktokAspirante,
            codigo: a.codigo,
            verificado: a.codigo === codeAdmin && !!a.codigo,
            fecha: a.createdAt
        }));

        res.json({ ok: true, data });
    } catch (error) {
        console.error('Error getAspirantes:', error);
        res.status(500).json({ ok: false, msg: 'Error al obtener solicitudes' });
    }
};

// ==========================================
// APROBAR ASPIRANTE → crea usuario + envía email
// ==========================================
const aprobarAspirante = async (req, res) => {
    const t = await db.transaction();
    try {
        const { idAspirante } = req.params;

        const aspirante = await Aspirantes.findByPk(idAspirante, { transaction: t });
        if (!aspirante) {
            await t.rollback();
            return res.status(404).json({ ok: false, msg: 'Aspirante no encontrado' });
        }
        if (aspirante.estadoAspirante !== 'aspirante') {
            await t.rollback();
            return res.status(400).json({ ok: false, msg: 'Este aspirante ya fue procesado' });
        }

        // Check if email already exists as user
        const existeUsuario = await Usuarios.findOne({
            where: { emailUsuario: aspirante.emailAspirante },
            transaction: t
        });
        if (existeUsuario) {
            await t.rollback();
            return res.status(400).json({ ok: false, msg: 'Ya existe un usuario con ese correo' });
        }

        // Create user — password is whatsapp (bcrypt hook auto-hashes)
        const nuevoUsuario = await Usuarios.create({
            nombreUsuario: aspirante.nombreAspirante,
            apellidoUsuario: aspirante.apellidoAspirante,
            emailUsuario: aspirante.emailAspirante,
            password: aspirante.whatsappAspirante,
            permisos: 'USUARIO',
            token: (await import('../helpers/genToken.js')).generarId()
        }, { transaction: t });

        // Update aspirante status
        await aspirante.update({ estadoAspirante: 'aceptado' }, { transaction: t });

        await t.commit();

        // Send welcome email (async, don't block response)
        try {
            const { mailBienvenida } = await import('../helpers/mailBienvenida.js');
            await mailBienvenida({
                emailUsuario: aspirante.emailAspirante,
                nombreUsuario: aspirante.nombreAspirante,
                password: aspirante.whatsappAspirante
            });
        } catch (emailErr) {
            console.error('[USERS] Error enviando email de bienvenida:', emailErr);
        }

        res.json({ ok: true, msg: `Usuario ${aspirante.nombreAspirante} creado exitosamente` });
    } catch (error) {
        if (t && !t.finished) await t.rollback();
        console.error('Error aprobarAspirante:', error);
        res.status(500).json({ ok: false, msg: 'Error al aprobar aspirante' });
    }
};

// ==========================================
// RECHAZAR ASPIRANTE
// ==========================================
const rechazarAspirante = async (req, res) => {
    try {
        const { idAspirante } = req.params;
        const aspirante = await Aspirantes.findByPk(idAspirante);
        if (!aspirante) return res.status(404).json({ ok: false, msg: 'Aspirante no encontrado' });

        await aspirante.update({ estadoAspirante: 'rechazado' });
        res.json({ ok: true, msg: 'Aspirante rechazado' });
    } catch (error) {
        console.error('Error rechazarAspirante:', error);
        res.status(500).json({ ok: false, msg: 'Error al rechazar' });
    }
};

// ==========================================
// HELPER: Tendencia semanal de solicitudes
// Compara últimos 7 días vs los 7 días previos
// ==========================================
async function calcularTendenciaSolicitudes() {
    const ahora = new Date();
    const hace7dias = new Date(ahora);
    hace7dias.setDate(hace7dias.getDate() - 7);
    const hace14dias = new Date(ahora);
    hace14dias.setDate(hace14dias.getDate() - 14);

    const [semanaActual, semanaPasada] = await Promise.all([
        Aspirantes.count({ where: { createdAt: { [Op.gte]: hace7dias } } }),
        Aspirantes.count({ where: { createdAt: { [Op.gte]: hace14dias, [Op.lt]: hace7dias } } })
    ]);

    let porcentaje = 0;
    let direccion = 'flat'; // 'up', 'down', 'flat'

    if (semanaPasada > 0) {
        porcentaje = ((semanaActual - semanaPasada) / semanaPasada) * 100;
    } else if (semanaActual > 0) {
        porcentaje = 100;
    }

    if (porcentaje > 0) direccion = 'up';
    else if (porcentaje < 0) direccion = 'down';

    return {
        semanaActual,
        semanaPasada,
        porcentaje: Math.abs(porcentaje).toFixed(1),
        direccion
    };
}

// ==========================================
// HELPER: Obtener stats del user panel
// ==========================================
async function getUserPanelStats() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [miembrosActivos, creditosCirculacion, descargasHoy, nuevasSolicitudes, tendencia] = await Promise.all([
        Usuarios.count({ where: { permisos: 'USUARIO' } }),
        RitmaCoins.sum('cantidadActual', { where: { cantidadActual: { [Op.gt]: 0 } } }).then(v => v || 0),
        HistorialDescargas.count({ where: { fechaDescarga: { [Op.gte]: hoy } } }),
        Aspirantes.count({ where: { estadoAspirante: 'aspirante' } }),
        calcularTendenciaSolicitudes()
    ]);

    return { miembrosActivos, creditosCirculacion, descargasHoy, nuevasSolicitudes, tendencia };
}

// ==========================================
// SSE — User Panel real-time updates
// ==========================================
const sseUserPanel = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send initial stats
    try {
        const stats = await getUserPanelStats();
        res.write(`event: stats-update\ndata: ${JSON.stringify(stats)}\n\n`);
    } catch (err) {
        console.error('SSE initial stats error:', err);
    }

    // Keep-alive every 30s
    const keepAlive = setInterval(() => {
        if (!res.writableEnded) res.write(': keepalive\n\n');
    }, 30000);

    // Subscribe to Redis channel
    const channel = 'admin:userpanel';
    const listener = async (message) => {
        if (res.writableEnded) return;
        try {
            const payload = JSON.parse(message);

            if (payload.type === 'new-aspirante') {
                res.write(`event: new-aspirante\ndata: ${JSON.stringify(payload.data)}\n\n`);
            }

            // Always send fresh stats after any event
            const stats = await getUserPanelStats();
            res.write(`event: stats-update\ndata: ${JSON.stringify(stats)}\n\n`);
        } catch (err) {
            console.error('SSE message error:', err);
        }
    };

    await redisSub.subscribe(channel, listener);

    // Cleanup on disconnect
    req.on('close', async () => {
        clearInterval(keepAlive);
        await redisSub.unsubscribe(channel, listener);
    });
};

// ==========================================
// API: Solicitudes pendientes + tendencia
// ==========================================
const getSolicitudesPendientes = async (req, res) => {
    try {
        const [count, tendencia] = await Promise.all([
            Aspirantes.count({ where: { estadoAspirante: 'aspirante' } }),
            calcularTendenciaSolicitudes()
        ]);
        res.json({ ok: true, count, tendencia });
    } catch (error) {
        console.error('Error getSolicitudesPendientes:', error);
        res.status(500).json({ ok: false, msg: 'Error al consultar solicitudes' });
    }
};

// ==========================================
// PERFIL DE USUARIO — Vista principal
// ==========================================
const userProfile = async (req, res) => {
    try {
        const { idUsuario } = req.params;
        const usuario = await Usuarios.findByPk(idUsuario, {
            attributes: ['idUsuario', 'nombreUsuario', 'apellidoUsuario', 'emailUsuario', 'estado', 'createdAt']
        });
        if (!usuario) return res.status(404).render('../views/app/dashboard', { tituloPagina: 'Usuario no encontrado' });

        // Datos del aspirante (whatsapp, ciudad, instagram, tiktok, imagen)
        const aspirante = await Aspirantes.findOne({
            where: { emailAspirante: usuario.emailUsuario },
            attributes: ['whatsappAspirante', 'ciudadAspirante', 'instagramAspirante', 'tiktokAspirante', 'imagen']
        });

        // Stats
        const [rawDisponibles, rawComprados, nroDescargas, wishlistCount] = await Promise.all([
            RitmaCoins.sum('cantidadActual', { where: { idUsuario } }),
            RitmaCoins.sum('cantidadComprada', { where: { idUsuario } }),
            HistorialDescargas.count({ where: { idUsuario } }),
            Wishlist.count({ where: { idUsuario, estado: 'en lista' } })
        ]);
        const creditosDisponibles = rawDisponibles || 0;
        const creditosComprados = rawComprados || 0;

        // Tendencia descargas último mes vs anterior
        const ahora = new Date();
        const hace30 = new Date(ahora); hace30.setDate(hace30.getDate() - 30);
        const hace60 = new Date(ahora); hace60.setDate(hace60.getDate() - 60);

        const [descMesActual, descMesPasado] = await Promise.all([
            HistorialDescargas.count({ where: { idUsuario, fechaDescarga: { [Op.gte]: hace30 } } }),
            HistorialDescargas.count({ where: { idUsuario, fechaDescarga: { [Op.gte]: hace60, [Op.lt]: hace30 } } })
        ]);

        let tendenciaDescargas = { porcentaje: '0.0', direccion: 'flat' };
        if (descMesPasado > 0) {
            const cambio = ((descMesActual - descMesPasado) / descMesPasado) * 100;
            tendenciaDescargas = {
                porcentaje: Math.abs(cambio).toFixed(1),
                direccion: cambio > 0 ? 'up' : cambio < 0 ? 'down' : 'flat'
            };
        } else if (descMesActual > 0) {
            tendenciaDescargas = { porcentaje: '100', direccion: 'up' };
        }

        // Top 5 géneros
        const topGeneros = await db.query(`
            SELECT g.nombre AS nombreGenero, COUNT(*) as total
            FROM HISTORIAL_DESCARGAS_MULTIMEDIA hd
            JOIN MULTIMEDIA m ON hd.idMultimedia = m.idMultimedia
            JOIN MULTIMEDIA_GENEROS mg ON m.idMultimedia = mg.idMultimedia
            JOIN GENEROS g ON mg.idGenero = g.genero_id
            WHERE hd.idUsuario = :idUsuario
            GROUP BY g.genero_id, g.nombre
            ORDER BY total DESC
            LIMIT 5
        `, { replacements: { idUsuario }, type: db.QueryTypes.SELECT });

        // Top 5 artistas
        const topArtistas = await db.query(`
            SELECT a.nombreArtista, COUNT(*) as total
            FROM HISTORIAL_DESCARGAS_MULTIMEDIA hd
            JOIN MULTIMEDIA m ON hd.idMultimedia = m.idMultimedia
            JOIN ARTISTAS a ON m.idArtista = a.idArtista
            WHERE hd.idUsuario = :idUsuario
            GROUP BY a.idArtista, a.nombreArtista
            ORDER BY total DESC
            LIMIT 5
        `, { replacements: { idUsuario }, type: db.QueryTypes.SELECT });

        // Imagen de perfil
        const imagenUsuario = aspirante?.imagen
            ? `${R2_PUBLIC_URL}/images/users/${aspirante.imagen}`
            : '/img/generico.webp';

        return res.status(200).render('../views/app/userProfile', {
            tituloPagina: `${usuario.nombreUsuario} ${usuario.apellidoUsuario}`,
            subtitulo: 'Perfil de usuario',
            active: 'users',
            csrfToken: req.csrfToken(),
            usuario: usuario.toJSON(),
            aspirante: aspirante ? aspirante.toJSON() : null,
            imagenUsuario,
            creditosDisponibles,
            creditosGastados: Math.max(0, creditosComprados - creditosDisponibles),
            nroDescargas,
            tendenciaDescargas,
            topGeneros,
            topArtistas,
            wishlistCount
        });
    } catch (error) {
        console.error('Error userProfile:', error);
        res.status(500).render('../views/app/dashboard', { tituloPagina: 'Error' });
    }
};

// ==========================================
// PERFIL DE USUARIO — Descargas paginadas
// ==========================================
const getUserDownloads = async (req, res) => {
    try {
        const { idUsuario } = req.params;
        const limit = parseInt(process.env.MAX_ROWS_FOR_PAGE) || 10;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;

        const { count, rows } = await HistorialDescargas.findAndCountAll({
            where: { idUsuario },
            include: [{
                model: Multimedia,
                attributes: ['idMultimedia', 'nombreComposicion', 'formato', 'tipoAsset'],
                include: [{ model: Artistas, attributes: ['nombreArtista'] }]
            }],
            order: [['fechaDescarga', 'DESC']],
            limit,
            offset
        });

        const data = rows.map(d => ({
            idDescarga: d.idDescarga,
            nombreComposicion: d.MULTIMEDIA?.nombreComposicion || '—',
            artista: d.MULTIMEDIA?.ARTISTA?.nombreArtista || '—',
            formato: d.MULTIMEDIA?.formato?.toUpperCase() || '—',
            tipoAsset: d.MULTIMEDIA?.tipoAsset || 'AUDIO',
            fechaDescarga: d.fechaDescarga,
            creditos: d.creditos || 0
        }));

        res.json({
            ok: true,
            data,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        console.error('Error getUserDownloads:', error);
        res.status(500).json({ ok: false, msg: 'Error al consultar descargas' });
    }
};

// ==========================================
// PERFIL DE USUARIO — Agregar créditos
// ==========================================
const addUserCredits = async (req, res) => {
    try {
        const { idUsuario } = req.params;
        const { cantidad, codigoAdmin } = req.body;

        const cant = parseInt(cantidad);
        if (!cant || cant <= 0) return res.status(400).json({ ok: false, msg: 'Cantidad inválida' });

        // Verificar cuántos créditos se han asignado hoy a este usuario
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const creditosHoy = await RitmaCoins.sum('cantidadComprada', {
            where: {
                idUsuario,
                fechaCompra: { [Op.gte]: hoy }
            }
        }) || 0;

        // Si supera 500 en el día, requiere código admin
        if ((creditosHoy + cant) > 500) {
            if (!codigoAdmin || codigoAdmin !== process.env.CODEADMIN) {
                return res.status(403).json({
                    ok: false,
                    requireCode: true,
                    msg: `Se superan los 500 créditos diarios (hoy: ${creditosHoy}). Ingrese código de administrador.`
                });
            }
        }

        await RitmaCoins.create({
            idUsuario,
            cantidadComprada: cant,
            cantidadActual: cant,
            fechaCompra: new Date()
        });

        // Recalcular totales
        const creditosDisponibles = await RitmaCoins.sum('cantidadActual', { where: { idUsuario } }) || 0;
        const totalComprado = await RitmaCoins.sum('cantidadComprada', { where: { idUsuario } }) || 0;

        res.json({
            ok: true,
            msg: `${cant} créditos asignados correctamente`,
            creditosDisponibles,
            creditosGastados: Math.max(0, totalComprado - creditosDisponibles)
        });
    } catch (error) {
        console.error('Error addUserCredits:', error);
        res.status(500).json({ ok: false, msg: 'Error al agregar créditos' });
    }
};

// ==========================================
// PERFIL DE USUARIO — Editar datos
// ==========================================
const updateUserData = async (req, res) => {
    try {
        const { idUsuario } = req.params;
        const { nombreUsuario, apellidoUsuario, password, whatsapp, ciudad, instagram, tiktok } = req.body;

        const usuario = await Usuarios.findByPk(idUsuario);
        if (!usuario) return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });

        // Actualizar datos en USUARIOS
        const updateFields = {};
        if (nombreUsuario?.trim()) updateFields.nombreUsuario = nombreUsuario.trim();
        if (apellidoUsuario?.trim()) updateFields.apellidoUsuario = apellidoUsuario.trim();
        if (password?.trim()) updateFields.password = password.trim();

        if (Object.keys(updateFields).length > 0) {
            await usuario.update(updateFields);
        }

        // Actualizar datos en ASPIRANTES (por email)
        const aspirante = await Aspirantes.findOne({ where: { emailAspirante: usuario.emailUsuario } });
        if (aspirante) {
            const aspUpdate = {};
            if (whatsapp?.trim()) aspUpdate.whatsappAspirante = whatsapp.trim();
            if (ciudad !== undefined) aspUpdate.ciudadAspirante = ciudad?.trim() || null;
            if (instagram !== undefined) aspUpdate.instagramAspirante = instagram?.trim() || null;
            if (tiktok !== undefined) aspUpdate.tiktokAspirante = tiktok?.trim() || null;

            if (Object.keys(aspUpdate).length > 0) {
                await aspirante.update(aspUpdate);
            }
        }

        res.json({ ok: true, msg: 'Datos actualizados correctamente' });
    } catch (error) {
        console.error('Error updateUserData:', error);
        res.status(500).json({ ok: false, msg: 'Error al actualizar datos' });
    }
};

// ==========================================
// PERFIL DE USUARIO — Suspender / Activar
// ==========================================
const toggleUserStatus = async (req, res) => {
    try {
        const { idUsuario } = req.params;
        const usuario = await Usuarios.findByPk(idUsuario);
        if (!usuario) return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });

        const nuevoEstado = usuario.estado === 'activo' ? 'suspendido' : 'activo';
        await usuario.update({ estado: nuevoEstado });

        res.json({
            ok: true,
            estado: nuevoEstado,
            msg: nuevoEstado === 'suspendido' ? 'Usuario suspendido' : 'Usuario activado'
        });
    } catch (error) {
        console.error('Error toggleUserStatus:', error);
        res.status(500).json({ ok: false, msg: 'Error al cambiar estado' });
    }
};

// ==========================================
// PERFIL DE USUARIO — Wishlist
// ==========================================
const getUserWishlist = async (req, res) => {
    try {
        const { idUsuario } = req.params;

        const items = await Wishlist.findAll({
            where: { idUsuario, estado: 'en lista' },
            include: [{
                model: Multimedia,
                attributes: ['idMultimedia', 'nombreComposicion', 'formato', 'tipoAsset', 'costoCreditos'],
                include: [{ model: Artistas, attributes: ['nombreArtista'] }]
            }],
            order: [['fechaCreacion', 'DESC']]
        });

        const data = items.map(w => ({
            idWishlist: w.idWishlist,
            idMultimedia: w.MULTIMEDIA?.idMultimedia,
            nombreComposicion: w.MULTIMEDIA?.nombreComposicion || '—',
            artista: w.MULTIMEDIA?.ARTISTA?.nombreArtista || '—',
            formato: w.MULTIMEDIA?.formato?.toUpperCase() || '—',
            tipoAsset: w.MULTIMEDIA?.tipoAsset || 'AUDIO',
            costoCreditos: w.MULTIMEDIA?.costoCreditos || 0,
            fechaCreacion: w.fechaCreacion
        }));

        res.json({ ok: true, data, total: data.length });
    } catch (error) {
        console.error('Error getUserWishlist:', error);
        res.status(500).json({ ok: false, msg: 'Error al consultar wishlist' });
    }
};

// ==========================================
// PERFIL DE USUARIO — Historial de Créditos
// ==========================================
const getUserCreditHistory = async (req, res) => {
    try {
        const { idUsuario } = req.params;

        const registros = await RitmaCoins.findAll({
            where: { idUsuario },
            attributes: ['idRitma', 'cantidadComprada', 'cantidadActual', 'fechaCompra', 'fechaUltimaCompra'],
            order: [['fechaCompra', 'DESC']]
        });

        const data = registros.map(r => ({
            idRitma: r.idRitma,
            cantidadComprada: r.cantidadComprada,
            cantidadActual: r.cantidadActual,
            fechaCompra: r.fechaCompra,
            fechaUltimaCompra: r.fechaUltimaCompra
        }));

        res.json({ ok: true, data });
    } catch (error) {
        console.error('Error getUserCreditHistory:', error);
        res.status(500).json({ ok: false, msg: 'Error al consultar historial de créditos' });
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
    getActiveMembers,
    getAspirantes,
    aprobarAspirante,
    rechazarAspirante,
    sseUserPanel,
    getSolicitudesPendientes,
    userProfile,
    getUserDownloads,
    addUserCredits,
    updateUserData,
    toggleUserStatus,
    getUserWishlist,
    getUserCreditHistory,
    downloadsPanel,
    getTopGeneros,
}