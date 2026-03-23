import { Usuarios, Multimedia, Artistas, Album, Generos, HistorialDescargas, RitmaCoins, PacksCreditos, Wishlist, Favoritos, MultimediaGeneros, Aspirantes } from '../models/index.js';
import { Op, fn, col, literal } from 'sequelize';
import db from '../config/bd.js';
import s3Client from "../config/r2.js";
import redisClient from "../config/redis.js";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { pipeline } from 'stream/promises';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
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

        // Verificar si esta en favoritos
        const favoritoItem = await Favoritos.findOne({
            where: { idMultimedia, idUsuario }
        });
        const enFavoritos = !!favoritoItem;

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
            enFavoritos,
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
            LIMIT 5
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

        const [creditosDisponibles, descargasUsuario, favoritosUsuario] = await Promise.all([
            RitmaCoins.sum('cantidadActual', { where: { idUsuario } }).then(v => v || 0),
            HistorialDescargas.findAll({
                where: { idUsuario },
                attributes: ['idMultimedia'],
                raw: true
            }),
            Favoritos.findAll({
                where: { idUsuario },
                attributes: ['idMultimedia'],
                raw: true
            })
        ]);
        const idsComprados = new Set(descargasUsuario.map(d => d.idMultimedia));
        const idsFavoritos = new Set(favoritosUsuario.map(f => f.idMultimedia));

        const data = rows.map(m => {
            const yaComprado = idsComprados.has(m.idMultimedia);
            return {
                idMultimedia: m.idMultimedia,
                nombreComposicion: m.nombreComposicion,
                artista: m.ARTISTA ? m.ARTISTA.nombreArtista : '—',
                tipoAsset: m.tipoAsset,
                formato: (m.formato || '').toUpperCase(),
                costoCreditos: m.costoCreditos || 0,
                bpm: m.bpm || null,
                yaComprado,
                puedeDescargar: yaComprado || creditosDisponibles >= (m.costoCreditos || 0),
                enFavoritos: idsFavoritos.has(m.idMultimedia)
            };
        });

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

// ==========================================
// BIBLIOTECA — Página principal
// ==========================================
const biblioteca = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;

        // Creditos y total descargas
        const creditosDisponibles = await RitmaCoins.sum('cantidadActual', { where: { idUsuario } }) || 0;
        const totalDescargas = await HistorialDescargas.count({ where: { idUsuario } });

        // Generos presentes en las descargas del usuario (para pills de filtro)
        const [generosBiblioteca] = await db.query(`
            SELECT DISTINCT g.genero_id, g.nombre
            FROM HISTORIAL_DESCARGAS_MULTIMEDIA h
            JOIN MULTIMEDIA m ON m.idMultimedia = h.idMultimedia
            JOIN MULTIMEDIA_GENEROS mg ON mg.idMultimedia = m.idMultimedia
            JOIN GENEROS g ON g.genero_id = mg.idGenero
            WHERE h.idUsuario = :idUsuario AND m.estado = 'ENABLE'
            ORDER BY g.nombre
        `, { replacements: { idUsuario } });

        // Artistas del usuario (para el JS: pasamos el R2_PUBLIC_URL al template)
        const [artistasBiblioteca] = await db.query(`
            SELECT a.idArtista, a.nombreArtista, a.cover, COUNT(DISTINCT m.idMultimedia) as total
            FROM HISTORIAL_DESCARGAS_MULTIMEDIA h
            JOIN MULTIMEDIA m ON m.idMultimedia = h.idMultimedia
            LEFT JOIN ARTISTAS a ON a.idArtista = m.idArtista
            WHERE h.idUsuario = :idUsuario AND m.estado = 'ENABLE' AND a.idArtista IS NOT NULL
            GROUP BY a.idArtista, a.nombreArtista, a.cover
            ORDER BY total DESC
        `, { replacements: { idUsuario } });

        return res.status(200).render('../views/client/biblioteca', {
            tituloPagina: 'Mi Biblioteca',
            subtitulo: 'Mis descargas',
            active: 'biblioteca',
            csrfToken: req.csrfToken(),
            creditosDisponibles,
            totalDescargas,
            generosBiblioteca,
            artistasBiblioteca,
            R2_PUBLIC_URL,
            notificaciones: 0
        });

    } catch (error) {
        console.error('Error biblioteca:', error);
        return res.redirect('/ritmaap/');
    }
};

// ==========================================
// BIBLIOTECA — Búsqueda paginada dentro de las descargas del usuario
// ==========================================
const searchBiblioteca = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;
        const limit = parseInt(process.env.MAX_ROWS_FOR_PAGE) || 10;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const offset = (page - 1) * limit;

        // Sanitizar inputs
        const rawSearch = (req.query.search || '').trim();
        const search = rawSearch.replace(/[^\w\sáéíóúñÁÉÍÓÚÑüÜ.\-]/gi, '').substring(0, 100);
        const generoId = parseInt(req.query.genero) || null;
        const idArtista = (req.query.idArtista || '').trim().replace(/[^a-f0-9\-]/gi, '').substring(0, 36) || null;

        // Condiciones adicionales SQL
        let whereClauses = ['h.idUsuario = :idUsuario', 'm.estado = \'ENABLE\''];
        const replacements = { idUsuario, limit, offset };

        if (search) {
            whereClauses.push('(m.nombreComposicion LIKE :search OR a.nombreArtista LIKE :search)');
            replacements.search = `%${search}%`;
        }
        if (idArtista) {
            whereClauses.push('m.idArtista = :idArtista');
            replacements.idArtista = idArtista;
        }
        if (generoId) {
            whereClauses.push(`m.idMultimedia IN (
                SELECT idMultimedia FROM MULTIMEDIA_GENEROS WHERE idGenero = :generoId
            )`);
            replacements.generoId = generoId;
        }

        const whereSQL = whereClauses.join(' AND ');

        const [rows] = await db.query(`
            SELECT
                m.idMultimedia,
                m.nombreComposicion,
                m.tipoAsset,
                m.formato,
                m.costoCreditos,
                m.bpm,
                a.idArtista,
                a.nombreArtista AS artista,
                MAX(h.fechaDescarga) AS fechaDescarga
            FROM HISTORIAL_DESCARGAS_MULTIMEDIA h
            JOIN MULTIMEDIA m ON m.idMultimedia = h.idMultimedia
            LEFT JOIN ARTISTAS a ON a.idArtista = m.idArtista
            WHERE ${whereSQL}
            GROUP BY m.idMultimedia, m.nombreComposicion, m.tipoAsset, m.formato, m.costoCreditos, m.bpm, a.idArtista, a.nombreArtista
            ORDER BY fechaDescarga DESC
            LIMIT :limit OFFSET :offset
        `, { replacements });

        const [[{ total }]] = await db.query(`
            SELECT COUNT(DISTINCT m.idMultimedia) AS total
            FROM HISTORIAL_DESCARGAS_MULTIMEDIA h
            JOIN MULTIMEDIA m ON m.idMultimedia = h.idMultimedia
            LEFT JOIN ARTISTAS a ON a.idArtista = m.idArtista
            WHERE ${whereSQL}
        `, { replacements });

        const data = rows.map(r => ({
            idMultimedia: r.idMultimedia,
            nombreComposicion: r.nombreComposicion,
            tipoAsset: r.tipoAsset,
            formato: (r.formato || '').toUpperCase(),
            costoCreditos: r.costoCreditos || 0,
            bpm: r.bpm || null,
            artista: r.artista || '—',
            fechaDescarga: r.fechaDescarga
        }));

        res.json({
            ok: true,
            data,
            total: parseInt(total),
            page,
            totalPages: Math.ceil(parseInt(total) / limit)
        });

    } catch (error) {
        console.error('Error searchBiblioteca:', error);
        res.status(500).json({ ok: false, msg: 'Error en la búsqueda de biblioteca' });
    }
};

// ==========================================
// BIBLIOTECA — Artistas de las descargas del usuario
// ==========================================
const getArtistasBiblioteca = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;

        const [rows] = await db.query(`
            SELECT a.idArtista, a.nombreArtista, a.cover, COUNT(DISTINCT m.idMultimedia) AS total
            FROM HISTORIAL_DESCARGAS_MULTIMEDIA h
            JOIN MULTIMEDIA m ON m.idMultimedia = h.idMultimedia
            LEFT JOIN ARTISTAS a ON a.idArtista = m.idArtista
            WHERE h.idUsuario = :idUsuario AND m.estado = 'ENABLE' AND a.idArtista IS NOT NULL
            GROUP BY a.idArtista, a.nombreArtista, a.cover
            ORDER BY total DESC
        `, { replacements: { idUsuario } });

        res.json({ ok: true, data: rows });
    } catch (error) {
        console.error('Error getArtistasBiblioteca:', error);
        res.status(500).json({ ok: false, msg: 'Error al obtener artistas' });
    }
};

// ==========================================
// WISHLIST — Página principal
// ==========================================
const wishlistPage = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;

        const creditosDisponibles = await RitmaCoins.sum('cantidadActual', { where: { idUsuario } }) || 0;

        return res.status(200).render('../views/client/wishlist', {
            tituloPagina: 'Mi Wishlist',
            subtitulo: 'Archivos guardados',
            active: 'wishlist',
            csrfToken: req.csrfToken(),
            creditosDisponibles,
            R2_PUBLIC_URL,
            notificaciones: 0
        });

    } catch (error) {
        console.error('Error wishlistPage:', error);
        return res.redirect('/ritmaap/');
    }
};

// ==========================================
// WISHLIST — Búsqueda/listado JSON (para cargar el grid)
// ==========================================
const searchWishlist = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;

        const rawSearch = (req.query.search || '').trim();
        const search = rawSearch.replace(/[^\w\sáéíóúñÁÉÍÓÚÑüÜ.\-]/gi, '').substring(0, 100);

        let whereClauses = ['w.idUsuario = :idUsuario', "w.estado = 'en lista'", "m.estado = 'ENABLE'"];
        const replacements = { idUsuario };

        if (search) {
            whereClauses.push('(m.nombreComposicion LIKE :search OR a.nombreArtista LIKE :search)');
            replacements.search = `%${search}%`;
        }

        const whereSQL = whereClauses.join(' AND ');

        const [rows] = await db.query(`
            SELECT
                w.idWishlist,
                m.idMultimedia,
                m.nombreComposicion,
                m.tipoAsset,
                m.formato,
                m.costoCreditos,
                m.bpm,
                m.keyPreview,
                a.idArtista,
                a.nombreArtista AS artista,
                a.cover AS artistaCover,
                al.cover AS albumCover,
                w.fechaCreacion
            FROM WISHLIST w
            JOIN MULTIMEDIA m ON m.idMultimedia = w.idMultimedia
            LEFT JOIN ARTISTAS a ON a.idArtista = m.idArtista
            LEFT JOIN ALBUM al ON al.idAlbum = m.idAlbum
            WHERE ${whereSQL}
            ORDER BY w.fechaCreacion DESC
        `, { replacements });

        // Verificar cuales ya compro el usuario
        const idsMultimedia = rows.map(r => r.idMultimedia);
        let comprados = new Set();
        if (idsMultimedia.length > 0) {
            const [compradosRows] = await db.query(`
                SELECT DISTINCT idMultimedia FROM HISTORIAL_DESCARGAS_MULTIMEDIA
                WHERE idUsuario = :idUsuario AND idMultimedia IN (:ids)
            `, { replacements: { idUsuario, ids: idsMultimedia } });
            comprados = new Set(compradosRows.map(r => r.idMultimedia));
        }

        const data = rows.map(r => {
            // Cover: album → artista → generico
            let coverUrl = '/img/coverGenerico.webp';
            if (r.albumCover) {
                coverUrl = `${R2_PUBLIC_URL}/${r.albumCover}`;
            } else if (r.artistaCover) {
                coverUrl = `${R2_PUBLIC_URL}/images/artistas/${r.artistaCover}`;
            }

            return {
                idWishlist: r.idWishlist,
                idMultimedia: r.idMultimedia,
                nombreComposicion: r.nombreComposicion,
                tipoAsset: r.tipoAsset,
                formato: (r.formato || '').toUpperCase(),
                costoCreditos: r.costoCreditos || 0,
                bpm: r.bpm || null,
                artista: r.artista || '—',
                coverUrl,
                hasPreview: !!r.keyPreview,
                yaComprado: comprados.has(r.idMultimedia),
                fechaCreacion: r.fechaCreacion
            };
        });

        res.json({ ok: true, data, total: data.length });

    } catch (error) {
        console.error('Error searchWishlist:', error);
        res.status(500).json({ ok: false, msg: 'Error al buscar en wishlist' });
    }
};

// ==========================================
// WISHLIST — Eliminar item (DELETE)
// ==========================================
const removeFromWishlist = async (req, res) => {
    try {
        const { idMultimedia } = req.params;
        const idUsuario = req.usuario.idUsuario;

        const deleted = await Wishlist.destroy({
            where: { idMultimedia, idUsuario, estado: 'en lista' }
        });

        if (deleted === 0) {
            return res.status(404).json({ ok: false, msg: 'No se encontró en tu wishlist' });
        }

        res.json({ ok: true });
    } catch (error) {
        console.error('Error removeFromWishlist:', error);
        res.status(500).json({ ok: false, msg: 'Error al eliminar de wishlist' });
    }
};

// ==========================================
// SETTINGS — Página principal
// ==========================================
const settingsPage = async (req, res) => {
    try {
        const usuario = req.usuario;

        // Buscar aspirante vinculado por email
        const aspirante = await Aspirantes.findOne({
            where: { emailAspirante: usuario.emailUsuario }
        });

        const imagenActual = aspirante?.imagen || null;

        return res.status(200).render('../views/client/settings', {
            tituloPagina: 'Settings',
            subtitulo: 'Configuración de cuenta',
            active: 'settings',
            csrfToken: req.csrfToken(),
            creditosDisponibles: await RitmaCoins.sum('cantidadActual', { where: { idUsuario: usuario.idUsuario } }) || 0,
            aspirante,
            imagenActual,
            R2_PUBLIC_URL,
            notificaciones: 0
        });

    } catch (error) {
        console.error('Error settingsPage:', error);
        return res.redirect('/ritmaap/');
    }
};

// ==========================================
// SETTINGS — Actualizar perfil (PUT)
// ==========================================
const updateProfile = async (req, res) => {
    try {
        const usuario = req.usuario;
        let { nombre, apellido, whatsapp, instagram, tiktok } = req.body;

        // Sanitización server-side
        const sanitize = (str) => (str || '').replace(/[<>"'`;\\]/g, '').trim();
        nombre = sanitize(nombre).substring(0, 100);
        apellido = sanitize(apellido).substring(0, 100);
        whatsapp = sanitize(whatsapp).substring(0, 30);
        instagram = sanitize(instagram).substring(0, 100);
        tiktok = sanitize(tiktok).substring(0, 100);

        // Validaciones
        if (!nombre || !apellido) {
            return res.status(400).json({ ok: false, msg: 'Nombre y Apellido son obligatorios.' });
        }
        if (!whatsapp) {
            return res.status(400).json({ ok: false, msg: 'WhatsApp es obligatorio.' });
        }
        if (!instagram && !tiktok) {
            return res.status(400).json({ ok: false, msg: 'Debes tener al menos Instagram o TikTok.' });
        }

        // Transacción para actualizar ambas tablas
        const t = await db.transaction();

        try {
            // Actualizar USUARIOS
            await Usuarios.update({
                nombreUsuario: nombre,
                apellidoUsuario: apellido
            }, {
                where: { idUsuario: usuario.idUsuario },
                transaction: t,
                individualHooks: false // No disparar hook de password
            });

            // Actualizar ASPIRANTES
            await Aspirantes.update({
                nombreAspirante: nombre,
                apellidoAspirante: apellido,
                whatsappAspirante: whatsapp,
                instagramAspirante: instagram || null,
                tiktokAspirante: tiktok || null
            }, {
                where: { emailAspirante: usuario.emailUsuario },
                transaction: t
            });

            await t.commit();

            res.json({ ok: true });

        } catch (innerErr) {
            await t.rollback();
            throw innerErr;
        }

    } catch (error) {
        console.error('Error updateProfile:', error);
        res.status(500).json({ ok: false, msg: 'Error al actualizar el perfil.' });
    }
};

// ==========================================
// SETTINGS — Cambiar contraseña (PUT)
// ==========================================
const updatePassword = async (req, res) => {
    try {
        const usuario = req.usuario;
        const { password, confirmPassword } = req.body;

        // Validaciones
        if (!password || password.length < 6) {
            return res.status(400).json({ ok: false, msg: 'La contraseña debe tener al menos 6 caracteres.' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ ok: false, msg: 'Las contraseñas no coinciden.' });
        }

        // Verificar que la nueva contraseña no sea igual a la actual
        const usuarioFull = await Usuarios.findByPk(usuario.idUsuario);
        const esIgual = await bcrypt.compare(password, usuarioFull.password);
        if (esIgual) {
            return res.status(400).json({ ok: false, msg: 'La nueva contraseña no puede ser igual a la actual.' });
        }

        // Actualizar (el hook beforeUpdate de Sequelize se encargará del hashing)
        usuarioFull.password = password;
        await usuarioFull.save();

        res.json({ ok: true });

    } catch (error) {
        console.error('Error updatePassword:', error);
        res.status(500).json({ ok: false, msg: 'Error al cambiar la contraseña.' });
    }
};

// ==========================================
// SETTINGS — Subir avatar (POST, multipart)
// ==========================================
const uploadAvatar = async (req, res) => {
    try {
        const usuario = req.usuario;

        if (!req.file) {
            return res.status(400).json({ ok: false, msg: 'No se recibió ningún archivo.' });
        }

        const file = req.file;

        // Validar MIME real (no solo extensión)
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedMimes.includes(file.mimetype)) {
            // Eliminar archivo temporal
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return res.status(400).json({ ok: false, msg: 'Solo se permiten archivos .jpg y .png' });
        }

        // Validar tamaño (2MB)
        if (file.size > 2 * 1024 * 1024) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return res.status(400).json({ ok: false, msg: 'El tamaño máximo es 2MB.' });
        }

        // Procesar con Sharp: 500x500 → webp
        const nuevoNombre = `${uuidv4()}.webp`;
        const outputPath = `upload/${nuevoNombre}`;

        await sharp(file.path)
            .resize(500, 500, { fit: 'cover', position: 'center' })
            .webp({ quality: 80 })
            .toFile(outputPath);

        // Eliminar archivo original
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

        // Leer el archivo procesado para subirlo a R2
        const fileBuffer = fs.readFileSync(outputPath);
        const r2Key = `images/users/${nuevoNombre}`;

        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: r2Key,
            Body: fileBuffer,
            ContentType: 'image/webp'
        }));

        // Eliminar archivo local procesado
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        // Buscar aspirante y obtener imagen anterior para borrarla de R2
        const aspirante = await Aspirantes.findOne({
            where: { emailAspirante: usuario.emailUsuario }
        });

        if (aspirante && aspirante.imagen) {
            // Intentar borrar imagen anterior de R2
            try {
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: `images/users/${aspirante.imagen}`
                }));
            } catch (delErr) {
                console.warn('No se pudo borrar imagen anterior de R2:', delErr.message);
            }
        }

        // Actualizar campo imagen en ASPIRANTES
        await Aspirantes.update(
            { imagen: nuevoNombre },
            { where: { emailAspirante: usuario.emailUsuario } }
        );

        const imageUrl = `${R2_PUBLIC_URL}/images/users/${nuevoNombre}`;
        res.json({ ok: true, imageUrl });

    } catch (error) {
        console.error('Error uploadAvatar:', error);
        // Limpiar archivos temporales
        if (req.file && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (_) {}
        }
        res.status(500).json({ ok: false, msg: 'Error al subir la imagen.' });
    }
};

// ==========================================
// FAVORITOS — Página principal
// ==========================================
const favoritosPage = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;
        const creditosDisponibles = await RitmaCoins.sum('cantidadActual', { where: { idUsuario } }) || 0;

        return res.render('../views/client/favoritos', {
            tituloPagina: 'Mis Favoritos',
            subtitulo: 'Tu colección personal',
            active: 'favoritos',
            csrfToken: req.csrfToken(),
            creditosDisponibles,
            R2_PUBLIC_URL,
            notificaciones: 0
        });
    } catch (error) {
        console.error('Error favoritosPage:', error);
        return res.redirect('/ritmaap/');
    }
};

// ==========================================
// FAVORITOS — Listado paginado JSON (infinite scroll)
// ==========================================
const getFavoritos = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;
        let { page, search } = req.query;
        page = Math.max(1, parseInt(page) || 1);
        const limit = 12;
        const offset = (page - 1) * limit;

        const rawSearch = (search || '').trim();
        const searchTerm = rawSearch.replace(/[^\w\sáéíóúñÁÉÍÓÚÑüÜ.\-]/gi, '').substring(0, 100);

        let whereClauses = ['f.idUsuario = :idUsuario', "m.estado = 'ENABLE'"];
        const replacements = { idUsuario };

        if (searchTerm) {
            whereClauses.push('(m.nombreComposicion LIKE :search OR a.nombreArtista LIKE :search)');
            replacements.search = `%${searchTerm}%`;
        }

        const whereSQL = whereClauses.join(' AND ');

        // Contar total
        const [[{ total }]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM FAVORITOS f
            JOIN MULTIMEDIA m ON m.idMultimedia = f.idMultimedia
            LEFT JOIN ARTISTAS a ON a.idArtista = m.idArtista
            WHERE ${whereSQL}
        `, { replacements });

        // Datos paginados
        const [rows] = await db.query(`
            SELECT
                f.idFavorito,
                m.idMultimedia,
                m.nombreComposicion,
                m.tipoAsset,
                m.formato,
                m.costoCreditos,
                m.bpm,
                m.keyPreview,
                a.idArtista,
                a.nombreArtista AS artista,
                a.cover AS artistaCover,
                al.cover AS albumCover,
                f.createdAt
            FROM FAVORITOS f
            JOIN MULTIMEDIA m ON m.idMultimedia = f.idMultimedia
            LEFT JOIN ARTISTAS a ON a.idArtista = m.idArtista
            LEFT JOIN ALBUM al ON al.idAlbum = m.idAlbum
            WHERE ${whereSQL}
            ORDER BY f.createdAt DESC
            LIMIT :limit OFFSET :offset
        `, { replacements: { ...replacements, limit, offset } });

        // Verificar cuáles ya compró
        const idsMultimedia = rows.map(r => r.idMultimedia);
        let comprados = new Set();
        if (idsMultimedia.length > 0) {
            const [compradosRows] = await db.query(`
                SELECT DISTINCT idMultimedia FROM HISTORIAL_DESCARGAS_MULTIMEDIA
                WHERE idUsuario = :idUsuario AND idMultimedia IN (:ids)
            `, { replacements: { idUsuario, ids: idsMultimedia } });
            comprados = new Set(compradosRows.map(r => r.idMultimedia));
        }

        const data = rows.map(r => {
            let coverUrl = '/img/coverGenerico.webp';
            if (r.albumCover) {
                coverUrl = `${R2_PUBLIC_URL}/${r.albumCover}`;
            } else if (r.artistaCover) {
                coverUrl = `${R2_PUBLIC_URL}/images/artistas/${r.artistaCover}`;
            }

            return {
                idFavorito: r.idFavorito,
                idMultimedia: r.idMultimedia,
                nombreComposicion: r.nombreComposicion,
                tipoAsset: r.tipoAsset,
                formato: (r.formato || '').toUpperCase(),
                costoCreditos: r.costoCreditos || 0,
                bpm: r.bpm || null,
                artista: r.artista || '—',
                coverUrl,
                hasPreview: !!r.keyPreview,
                yaComprado: comprados.has(r.idMultimedia)
            };
        });

        const totalPages = Math.ceil(total / limit);
        res.json({ ok: true, data, total, page, totalPages, hasMore: page < totalPages });

    } catch (error) {
        console.error('Error getFavoritos:', error);
        res.status(500).json({ ok: false, msg: 'Error al obtener favoritos' });
    }
};

// ==========================================
// FAVORITOS — Agregar (POST)
// ==========================================
const addFavorito = async (req, res) => {
    try {
        const { idMultimedia } = req.params;
        const idUsuario = req.usuario.idUsuario;

        // Verificar que el multimedia existe y está activo
        const multimedia = await Multimedia.findOne({
            where: { idMultimedia, estado: 'ENABLE' }
        });
        if (!multimedia) return res.status(404).json({ ok: false, msg: 'Multimedia no encontrado' });

        // Verificar si ya está en favoritos
        const existe = await Favoritos.findOne({ where: { idUsuario, idMultimedia } });
        if (existe) return res.status(409).json({ ok: false, msg: 'Ya está en favoritos' });

        await Favoritos.create({ idUsuario, idMultimedia });
        res.json({ ok: true, msg: 'Agregado a favoritos' });

    } catch (error) {
        console.error('Error addFavorito:', error);
        res.status(500).json({ ok: false, msg: 'Error al agregar a favoritos' });
    }
};

// ==========================================
// FAVORITOS — Eliminar (DELETE)
// ==========================================
const removeFavorito = async (req, res) => {
    try {
        const { idMultimedia } = req.params;
        const idUsuario = req.usuario.idUsuario;

        const deleted = await Favoritos.destroy({ where: { idMultimedia, idUsuario } });
        if (!deleted) return res.status(404).json({ ok: false, msg: 'No se encontró en favoritos' });

        res.json({ ok: true, msg: 'Eliminado de favoritos' });

    } catch (error) {
        console.error('Error removeFavorito:', error);
        res.status(500).json({ ok: false, msg: 'Error al eliminar de favoritos' });
    }
};

// ==========================================
// FAVORITOS — Toggle (POST) para uso en mediafile/search
// ==========================================
const toggleFavorito = async (req, res) => {
    try {
        const { idMultimedia } = req.params;
        const idUsuario = req.usuario.idUsuario;

        const multimedia = await Multimedia.findOne({
            where: { idMultimedia, estado: 'ENABLE' }
        });
        if (!multimedia) return res.status(404).json({ ok: false, msg: 'Multimedia no encontrado' });

        const existe = await Favoritos.findOne({ where: { idUsuario, idMultimedia } });

        if (existe) {
            await existe.destroy();
            return res.json({ ok: true, enFavoritos: false, msg: 'Eliminado de favoritos' });
        }

        await Favoritos.create({ idUsuario, idMultimedia });
        res.json({ ok: true, enFavoritos: true, msg: 'Agregado a favoritos' });

    } catch (error) {
        console.error('Error toggleFavorito:', error);
        res.status(500).json({ ok: false, msg: 'Error al modificar favoritos' });
    }
};

// ==========================================
// CREDITOS (USUARIO) — Página principal
// ==========================================
const creditosPage = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;

        const [creditosDisponibles, creditosGastados, ultimasDescargas, packs] = await Promise.all([
            RitmaCoins.sum('cantidadActual', { where: { idUsuario } }).then(v => v || 0),
            HistorialDescargas.sum('creditos', { where: { idUsuario } }).then(v => v || 0),
            HistorialDescargas.findAll({
                where: { idUsuario },
                include: [{
                    model: Multimedia,
                    as: 'multimedia',
                    attributes: ['idMultimedia', 'nombreComposicion', 'tipoAsset'],
                    required: false
                }],
                order: [['fechaDescarga', 'DESC']],
                limit: 3
            }),
            PacksCreditos.findAll({
                where: { estado: 'enable' },
                order: [['nroCreditos', 'ASC']],
                limit: 4
            })
        ]);

        return res.render('../views/client/creditos', {
            tituloPagina: 'Mis Créditos',
            active: 'creditos',
            csrfToken: req.csrfToken(),
            creditosDisponibles,
            creditosGastados,
            ultimasDescargas,
            packs,
            R2_PUBLIC_URL
        });
    } catch (error) {
        console.error('Error creditosPage:', error);
        return res.render('../views/client/creditos', {
            tituloPagina: 'Mis Créditos',
            active: 'creditos',
            csrfToken: req.csrfToken(),
            creditosDisponibles: 0,
            creditosGastados: 0,
            ultimasDescargas: [],
            packs: []
        });
    }
};

// ==========================================
// CREDITOS — JSON: Mis Compras (paginado)
// ==========================================
const getMisCompras = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await RitmaCoins.findAndCountAll({
            where: { idUsuario },
            include: [{
                model: PacksCreditos,
                attributes: ['nombrePack', 'valorPack', 'nroCreditos', 'descuento'],
                required: false
            }],
            order: [['fechaCompra', 'DESC']],
            limit,
            offset
        });

        const data = rows.map(r => {
            const pack = r.PACKS_CREDITO;
            return {
                idRitma: r.idRitma,
                nombrePack: pack ? pack.nombrePack : 'Recarga manual',
                valorPack: pack ? pack.valorPack : r.valorPack,
                nroCreditos: pack ? pack.nroCreditos : r.cantidadComprada,
                descuento: pack ? pack.descuento : 0,
                cantidadComprada: r.cantidadComprada,
                cantidadActual: r.cantidadActual,
                fechaCompra: r.fechaCompra
            };
        });

        res.json({
            ok: true,
            data,
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
            hasMore: offset + rows.length < count
        });
    } catch (error) {
        console.error('Error getMisCompras:', error);
        res.status(500).json({ ok: false, msg: 'Error al obtener compras' });
    }
};

// ==========================================
// CREDITOS — JSON: Mis Transacciones (paginado)
// ==========================================
const getMisTransacciones = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await HistorialDescargas.findAndCountAll({
            where: { idUsuario },
            include: [{
                model: Multimedia,
                as: 'multimedia',
                attributes: ['idMultimedia', 'nombreComposicion', 'tipoAsset'],
                required: false
            }],
            order: [['fechaDescarga', 'DESC']],
            limit,
            offset
        });

        const data = rows.map(r => ({
            idDescarga: r.idDescarga,
            fechaDescarga: r.fechaDescarga,
            creditos: r.creditos,
            idMultimedia: r.idMultimedia,
            multimedia: r.multimedia ? {
                idMultimedia: r.multimedia.idMultimedia,
                nombreComposicion: r.multimedia.nombreComposicion,
                tipoAsset: r.multimedia.tipoAsset
            } : null
        }));

        res.json({
            ok: true,
            data,
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
            hasMore: offset + rows.length < count
        });
    } catch (error) {
        console.error('Error getMisTransacciones:', error);
        res.status(500).json({ ok: false, msg: 'Error al obtener transacciones' });
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
    streamPreview,
    biblioteca,
    searchBiblioteca,
    getArtistasBiblioteca,
    wishlistPage,
    searchWishlist,
    removeFromWishlist,
    settingsPage,
    updateProfile,
    updatePassword,
    uploadAvatar,
    favoritosPage,
    getFavoritos,
    addFavorito,
    removeFavorito,
    toggleFavorito,
    creditosPage,
    getMisCompras,
    getMisTransacciones
}
