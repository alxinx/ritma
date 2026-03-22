import { Usuarios, Multimedia, Artistas, Album, Generos, HistorialDescargas, RitmaCoins, Wishlist, MultimediaGeneros } from '../models/index.js';
import { Op, fn, col, literal } from 'sequelize';
import db from '../config/bd.js';
import s3Client from "../config/r2.js";
import redisClient from "../config/redis.js";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { pipeline } from 'stream/promises';
import crypto from 'crypto';
import dotenv from "dotenv";

dotenv.config();

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// ==========================================
// DASHBOARD — Home & Search
// ==========================================
const dashboard = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;

        // Fechas
        const ahora = new Date();
        const hace7d = new Date(ahora);
        hace7d.setDate(hace7d.getDate() - 7);

        const [creditosDisponibles, totalDescargas, wishlistCount, recomendados, topSemanal] = await Promise.all([
            RitmaCoins.sum('cantidadActual', { where: { idUsuario } }).then(v => v || 0),
            HistorialDescargas.count({ where: { idUsuario } }),
            Wishlist.count({ where: { idUsuario, estado: 'en lista' } }),
            getRecomendados(idUsuario),
            getTopSemanal(hace7d)
        ]);

        return res.status(200).render('../views/client/dashboard', {
            tituloPagina: "Home & Search",
            subtitulo: "Explora el catalogo",
            active: 'home',
            csrfToken: req.csrfToken(),
            creditosDisponibles,
            totalDescargas,
            wishlistCount,
            recomendados,
            topSemanal,
            notificaciones: 0
        });

    } catch (error) {
        console.error('Error client dashboard:', error);
        return res.status(200).render('../views/client/dashboard', {
            tituloPagina: "Home & Search",
            subtitulo: "Explora el catalogo",
            active: 'home',
            csrfToken: req.csrfToken(),
            creditosDisponibles: 0,
            totalDescargas: 0,
            wishlistCount: 0,
            recomendados: [],
            topSemanal: [],
            notificaciones: 0
        });
    }
};

// ==========================================
// MEDIAFILE PROFILE (usuario)
// ==========================================
const mediafile = async (req, res) => {
    try {
        const { idMultimedia } = req.params;
        const idUsuario = req.usuario.idUsuario;

        const multimedia = await Multimedia.findByPk(idMultimedia, {
            include: [
                { model: Artistas, attributes: ['idArtista', 'nombreArtista', 'cover'] },
                { model: Album, attributes: ['idAlbum', 'nombreAlbum', 'cover'] },
                { model: Generos, attributes: ['genero_id', 'nombre'], through: { attributes: [] } }
            ]
        });

        if (!multimedia || multimedia.estado !== 'ENABLE') {
            return res.redirect('/ritmaap/');
        }

        // Verificar si el usuario ya compro este multimedia
        const descargaExistente = await HistorialDescargas.findOne({
            where: { idMultimedia, idUsuario }
        });
        const yaComprado = !!descargaExistente;

        // Verificar si esta en wishlist
        const wishlistItem = await Wishlist.findOne({
            where: { idMultimedia, idUsuario, estado: 'en lista' }
        });
        const enWishlist = !!wishlistItem;

        // Creditos del usuario
        const creditosDisponibles = await RitmaCoins.sum('cantidadActual', { where: { idUsuario } }) || 0;

        // Cover URL: prioridad artista → album → generico
        let coverUrl = '/img/coverGenerico.webp';
        if (multimedia.ARTISTA && multimedia.ARTISTA.cover) {
            coverUrl = `${R2_PUBLIC_URL}/images/artistas/${multimedia.ARTISTA.cover}`;
        } else if (multimedia.ALBUM && multimedia.ALBUM.cover) {
            coverUrl = `${R2_PUBLIC_URL}/${multimedia.ALBUM.cover}`;
        }

        // Relacionados: 5 multimedia del mismo artista o mismo genero
        const relacionados = await getRelacionados(idMultimedia, multimedia.idArtista, multimedia.GENEROs);

        return res.status(200).render('../views/client/mediafile', {
            tituloPagina: multimedia.nombreComposicion,
            subtitulo: multimedia.ARTISTA ? multimedia.ARTISTA.nombreArtista : '',
            active: 'home',
            csrfToken: req.csrfToken(),
            multimedia: multimedia.toJSON(),
            coverUrl,
            creditosDisponibles,
            yaComprado,
            enWishlist,
            relacionados,
            R2_PUBLIC_URL,
            notificaciones: 0
        });
    } catch (error) {
        console.error('Error client mediafile:', error);
        return res.redirect('/ritmaap/');
    }
};

// ==========================================
// HELPERS
// ==========================================

async function getRecomendados(idUsuario) {
    try {
        const descargados = await HistorialDescargas.findAll({
            where: { idUsuario },
            attributes: ['idMultimedia'],
            raw: true
        });
        const idsDescargados = descargados.map(d => d.idMultimedia);

        const whereClause = {
            estado: 'ENABLE',
            ...(idsDescargados.length > 0 && { idMultimedia: { [Op.notIn]: idsDescargados } })
        };

        return await Multimedia.findAll({
            where: whereClause,
            include: [
                { model: Artistas, attributes: ['nombreArtista'] },
                { model: Album, attributes: ['cover'] }
            ],
            order: literal('RAND()'),
            limit: 5,
            raw: false
        });
    } catch (err) {
        console.error('Error getRecomendados:', err.message);
        return [];
    }
}

async function getTopSemanal(desde) {
    try {
        const [rows] = await db.query(`
            SELECT
                m.idMultimedia,
                m.nombreComposicion,
                m.tipoAsset,
                a.nombreArtista,
                COUNT(*) AS totalDescargas
            FROM HISTORIAL_DESCARGAS_MULTIMEDIA h
            JOIN MULTIMEDIA m ON m.idMultimedia = h.idMultimedia
            LEFT JOIN ARTISTAS a ON a.idArtista = m.idArtista
            WHERE h.fechaDescarga >= :desde
              AND m.estado = 'ENABLE'
            GROUP BY m.idMultimedia, m.nombreComposicion, m.tipoAsset, a.nombreArtista
            ORDER BY totalDescargas DESC
            LIMIT 10
        `, { replacements: { desde } });

        return rows.map(r => ({
            idMultimedia: r.idMultimedia,
            nombreComposicion: r.nombreComposicion,
            tipoAsset: r.tipoAsset,
            totalDescargas: r.totalDescargas,
            Artista: { nombreArtista: r.nombreArtista || 'Desconocido' }
        }));
    } catch (err) {
        console.error('Error getTopSemanal:', err.message);
        return [];
    }
}

/**
 * Relacionados: 5 multimedia del mismo artista o mismo genero
 * Excluye el multimedia actual
 */
async function getRelacionados(idMultimedia, idArtista, generos) {
    try {
        const generoIds = (generos || []).map(g => g.genero_id);

        // IDs de multimedia con mismos generos
        let idsConGenero = [];
        if (generoIds.length > 0) {
            const mgRows = await MultimediaGeneros.findAll({
                where: { idGenero: { [Op.in]: generoIds } },
                attributes: ['idMultimedia'],
                group: ['idMultimedia'],
                raw: true
            });
            idsConGenero = mgRows.map(r => r.idMultimedia);
        }

        // Buscar: mismo artista OR mismo genero, excluyendo el actual
        const orConditions = [];
        if (idArtista) orConditions.push({ idArtista });
        if (idsConGenero.length > 0) orConditions.push({ idMultimedia: { [Op.in]: idsConGenero } });

        if (orConditions.length === 0) return [];

        return await Multimedia.findAll({
            where: {
                estado: 'ENABLE',
                idMultimedia: { [Op.ne]: idMultimedia },
                [Op.or]: orConditions
            },
            include: [
                { model: Artistas, attributes: ['nombreArtista', 'cover'] },
                { model: Album, attributes: ['nombreAlbum', 'cover'] }
            ],
            attributes: ['idMultimedia', 'nombreComposicion', 'tipoAsset', 'costoCreditos', 'formato'],
            order: literal('RAND()'),
            limit: 5
        });
    } catch (err) {
        console.error('Error getRelacionados:', err.message);
        return [];
    }
}

// ==========================================
// API: Generos
// ==========================================
const getGeneros = async (req, res) => {
    try {
        const genres = await Generos.findAll({
            attributes: ['genero_id', 'nombre', 'slug']
        });
        res.json(genres);
    } catch (error) {
        console.error('Error getGeneros client:', error.message);
        res.status(500).json({ msg: 'Error al obtener generos' });
    }
};

// ==========================================
// API: Busqueda de multimedia (paginada + filtros)
// ==========================================
const searchMultimedia = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;
        const limit = parseInt(process.env.MAX_ROWS_FOR_PAGE) || 10;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const offset = (page - 1) * limit;

        const rawSearch = (req.query.search || '').trim();
        const search = rawSearch.replace(/[^\w\sáéíóúñÁÉÍÓÚÑüÜ.\-]/gi, '').substring(0, 100);

        const tipo = ['audio', 'video'].includes(req.query.tipo) ? req.query.tipo : 'all';

        const bpmMin = Math.max(20, Math.min(200, parseInt(req.query.bpmMin) || 20));
        const bpmMax = Math.max(20, Math.min(200, parseInt(req.query.bpmMax) || 200));

        let generos = [];
        try {
            const parsed = JSON.parse(req.query.generos || '[]');
            if (Array.isArray(parsed)) {
                generos = parsed.map(g => parseInt(g)).filter(g => !isNaN(g) && g > 0);
            }
        } catch {}

        const where = { estado: 'ENABLE' };

        if (tipo === 'audio') where.tipoAsset = 'AUDIO';
        else if (tipo === 'video') where.tipoAsset = 'VIDEO';

        if (bpmMin > 20 || bpmMax < 200) {
            where.bpm = { [Op.between]: [bpmMin, bpmMax] };
        }

        if (search) {
            where[Op.or] = [
                { nombreComposicion: { [Op.like]: `%${search}%` } }
            ];
            const artistasMatch = await Artistas.findAll({
                where: { nombreArtista: { [Op.like]: `%${search}%` } },
                attributes: ['idArtista'],
                raw: true
            });
            if (artistasMatch.length > 0) {
                where[Op.or].push({
                    idArtista: { [Op.in]: artistasMatch.map(a => a.idArtista) }
                });
            }
        }

        if (generos.length > 0) {
            const multimediaConGenero = await MultimediaGeneros.findAll({
                where: { idGenero: { [Op.in]: generos } },
                attributes: ['idMultimedia'],
                group: ['idMultimedia'],
                raw: true
            });
            const idsConGenero = multimediaConGenero.map(m => m.idMultimedia);
            if (idsConGenero.length > 0) {
                where.idMultimedia = where.idMultimedia
                    ? { [Op.and]: [where.idMultimedia, { [Op.in]: idsConGenero }] }
                    : { [Op.in]: idsConGenero };
            } else {
                return res.json({ ok: true, data: [], total: 0, page, totalPages: 0 });
            }
        }

        const { count, rows } = await Multimedia.findAndCountAll({
            where,
            include: [{ model: Artistas, attributes: ['nombreArtista'] }],
            attributes: ['idMultimedia', 'nombreComposicion', 'tipoAsset', 'formato', 'costoCreditos', 'bpm'],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true
        });

        const creditosDisponibles = await RitmaCoins.sum('cantidadActual', { where: { idUsuario } }) || 0;

        const data = rows.map(m => ({
            idMultimedia: m.idMultimedia,
            nombreComposicion: m.nombreComposicion,
            artista: m.ARTISTA ? m.ARTISTA.nombreArtista : '—',
            tipoAsset: m.tipoAsset,
            formato: (m.formato || '').toUpperCase(),
            costoCreditos: m.costoCreditos || 0,
            bpm: m.bpm || null,
            puedeDescargar: creditosDisponibles >= (m.costoCreditos || 0)
        }));

        res.json({
            ok: true,
            data,
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
            creditosDisponibles
        });

    } catch (error) {
        console.error('Error searchMultimedia:', error);
        res.status(500).json({ ok: false, msg: 'Error en la busqueda' });
    }
};

// ==========================================
// WISHLIST TOGGLE
// ==========================================
const toggleWishlist = async (req, res) => {
    try {
        const { idMultimedia } = req.params;
        const idUsuario = req.usuario.idUsuario;

        // Verificar que el multimedia existe
        const multimedia = await Multimedia.findByPk(idMultimedia, { attributes: ['idMultimedia'] });
        if (!multimedia) return res.status(404).json({ ok: false, msg: 'Multimedia no encontrado' });

        // Buscar si ya esta en wishlist
        const existing = await Wishlist.findOne({
            where: { idMultimedia, idUsuario, estado: 'en lista' }
        });

        if (existing) {
            // Quitar de wishlist
            await existing.destroy();
            return res.json({ ok: true, enWishlist: false });
        } else {
            // Agregar a wishlist
            await Wishlist.create({
                idUsuario,
                idMultimedia,
                estado: 'en lista'
            });
            return res.json({ ok: true, enWishlist: true });
        }
    } catch (error) {
        console.error('Error toggleWishlist:', error);
        res.status(500).json({ ok: false, msg: 'Error al actualizar wishlist' });
    }
};

// ==========================================
// SOLICITAR TOKEN DE DESCARGA (OTP Redis)
// — Verifica creditos y propiedad antes de generar token
// ==========================================
const requestDownloadToken = async (req, res) => {
    try {
        const { idMultimedia } = req.params;
        const idUsuario = req.usuario.idUsuario;

        const multimedia = await Multimedia.findByPk(idMultimedia);
        if (!multimedia) return res.status(404).json({ ok: false, msg: 'Multimedia no encontrado' });
        if (!multimedia.keyOriginal) return res.status(400).json({ ok: false, msg: 'Archivo original no disponible' });
        if (multimedia.estado !== 'ENABLE') return res.status(403).json({ ok: false, msg: 'Este archivo no esta disponible' });

        // Verificar si ya lo compro (historial de descargas)
        const descargaExistente = await HistorialDescargas.findOne({
            where: { idMultimedia, idUsuario }
        });
        const yaComprado = !!descargaExistente;

        if (!yaComprado) {
            // Verificar creditos suficientes
            const creditosDisponibles = await RitmaCoins.sum('cantidadActual', { where: { idUsuario } }) || 0;

            if (creditosDisponibles < (multimedia.costoCreditos || 0)) {
                return res.status(403).json({ ok: false, msg: 'No tienes suficientes creditos para descargar este archivo.' });
            }

            // Descontar creditos — ir descontando de las compras mas antiguas
            let creditosPorDescontar = multimedia.costoCreditos || 0;
            const compras = await RitmaCoins.findAll({
                where: { idUsuario, cantidadActual: { [Op.gt]: 0 } },
                order: [['fechaCompra', 'ASC']]
            });

            for (const compra of compras) {
                if (creditosPorDescontar <= 0) break;
                const descuento = Math.min(compra.cantidadActual, creditosPorDescontar);
                await compra.update({ cantidadActual: compra.cantidadActual - descuento });
                creditosPorDescontar -= descuento;
            }

            // Registrar en historial de descargas
            await HistorialDescargas.create({
                idMultimedia,
                idUsuario,
                creditos: multimedia.costoCreditos || 0
            });

            // Incrementar contador de descargas del multimedia
            await multimedia.increment('descargas');

            // Si estaba en wishlist, marcarlo como comprada
            await Wishlist.update(
                { estado: 'comprada' },
                { where: { idMultimedia, idUsuario, estado: 'en lista' } }
            );
        }

        // Generar token OTP para descarga (60s TTL)
        const token = crypto.randomUUID();
        await redisClient.setEx(`download:${token}`, 60, JSON.stringify({
            idMultimedia,
            idUsuario
        }));

        res.json({ ok: true, token });
    } catch (error) {
        console.error('Error requestDownloadToken client:', error);
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
            return res.status(403).json({ ok: false, msg: 'Token expirado o invalido' });
        }

        // Eliminar token (un solo uso)
        await redisClient.del(`download:${token}`);

        const { idMultimedia } = JSON.parse(data);
        const multimedia = await Multimedia.findByPk(idMultimedia);

        if (!multimedia || !multimedia.keyOriginal) {
            return res.status(404).json({ ok: false, msg: 'Archivo no encontrado' });
        }

        // Generar presigned URL para descarga
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: `multimedia/originals/${multimedia.keyOriginal}`,
            ResponseContentDisposition: `attachment; filename="${multimedia.nombreComposicion}.${multimedia.formato}"`
        });
        const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 30 });

        res.redirect(downloadUrl);
    } catch (error) {
        console.error('Error verifyAndDownload client:', error);
        res.status(500).json({ ok: false, msg: 'Error al procesar descarga' });
    }
};

// ==========================================
// CHECK DOWNLOAD BAN
// ==========================================
const checkDownloadBan = async (req, res) => {
    try {
        const userId = req.usuario.idUsuario;
        const keyBan = `rtm:dl:ban:${userId}`;
        const banData = await redisClient.get(keyBan);

        if (banData) {
            const ban = JSON.parse(banData);
            const ttl = await redisClient.ttl(keyBan);
            return res.json({
                ok: true,
                banned: true,
                msg: ban.strike >= 3
                    ? `No podras descargar mas archivos hoy. Contacta soporte.`
                    : `Descargas suspendidas por ${ban.label}. Tiempo restante: ${Math.ceil(ttl / 60)} min.`,
                ttl
            });
        }

        res.json({ ok: true, banned: false });
    } catch (error) {
        console.error('Error checkDownloadBan:', error);
        res.json({ ok: true, banned: false }); // fail open
    }
};

// ==========================================
// STREAMING: Token para video
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

        const existingSession = await redisClient.get(sessionKey);

        if (!existingSession) {
            if (!token) return res.status(403).json({ msg: 'Token requerido' });

            const tokenData = await redisClient.get(`stream:${token}`);
            if (!tokenData) return res.status(403).json({ msg: 'Token expirado o invalido' });

            const parsed = JSON.parse(tokenData);
            if (parsed.idMultimedia !== idMultimedia) return res.status(403).json({ msg: 'Token no corresponde' });

            await redisClient.del(`stream:${token}`);
            await redisClient.setEx(sessionKey, 300, '1');
        } else {
            await redisClient.expire(sessionKey, 300);
        }

        const multimedia = await Multimedia.findByPk(idMultimedia, {
            attributes: ['idMultimedia', 'keyPreview', 'tipoAsset']
        });
        if (!multimedia || !multimedia.keyPreview) return res.status(404).end();

        const r2Key = `multimedia/previews/${multimedia.keyPreview}`;
        const contentType = multimedia.tipoAsset === 'VIDEO' ? 'video/mp4' : 'audio/mpeg';

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
        if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
            console.error('Error streamVideo client:', error);
        }
        if (!res.headersSent) res.status(500).end();
    }
};

// ==========================================
// PROXY STREAMING DE PREVIEW (no expone R2 URL)
// ==========================================
const streamPreview = async (req, res) => {
    try {
        const { idMultimedia } = req.params;
        const multimedia = await Multimedia.findByPk(idMultimedia, {
            attributes: ['idMultimedia', 'keyPreview', 'keyOriginal', 'formato', 'tipoAsset']
        });

        if (!multimedia) return res.status(404).end();

        let r2Key;
        if (multimedia.keyPreview) {
            r2Key = `multimedia/previews/${multimedia.keyPreview}`;
        } else if (multimedia.keyOriginal) {
            r2Key = `multimedia/originals/${multimedia.keyOriginal}`;
        } else {
            return res.status(404).end();
        }

        const contentType = multimedia.tipoAsset === 'VIDEO' ? 'video/mp4' : 'audio/mpeg';

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
            console.error('Error streamPreview client:', error);
        }
        if (!res.headersSent) res.status(500).end();
    }
};

export {
    dashboard,
    getGeneros,
    searchMultimedia,
    mediafile,
    toggleWishlist,
    requestDownloadToken,
    verifyAndDownload,
    checkDownloadBan,
    requestStreamToken,
    streamVideo,
    streamPreview
}
