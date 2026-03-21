import { Usuarios, Multimedia, Artistas, Album, Generos, HistorialDescargas, RitmaCoins, Wishlist } from '../models/index.js';
import { Op, fn, col, literal } from 'sequelize';
import db from '../config/bd.js';
import dotenv from "dotenv";

dotenv.config();

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
            // Creditos disponibles
            RitmaCoins.sum('cantidadActual', { where: { idUsuario } }).then(v => v || 0),

            // Total descargas
            HistorialDescargas.count({ where: { idUsuario } }),

            // Wishlist count
            Wishlist.count({ where: { idUsuario, estado: 'en lista' } }),

            // Recomendados: 5 archivos random que el usuario NO ha descargado
            getRecomendados(idUsuario),

            // Top descargas de la semana (global, 10 mas descargados)
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
// HELPERS
// ==========================================

/**
 * Recomendados: 5 archivos que el usuario NO ha descargado,
 * priorizando generos que ha descargado antes
 */
async function getRecomendados(idUsuario) {
    try {
        // IDs de multimedia ya descargados por este usuario
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

/**
 * Top 10 descargas de la ultima semana (global)
 */
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

        // Mapear para que el template acceda como .Artista.nombreArtista
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

// ==========================================
// API: Generos (para el modal de busqueda)
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

        // Sanitizar inputs — solo permitir caracteres seguros
        const rawSearch = (req.query.search || '').trim();
        const search = rawSearch.replace(/[^\w\sáéíóúñÁÉÍÓÚÑüÜ.\-]/gi, '').substring(0, 100);

        const tipo = ['audio', 'video'].includes(req.query.tipo) ? req.query.tipo : 'all';

        // BPM range — forzar numeros validos
        const bpmMin = Math.max(20, Math.min(200, parseInt(req.query.bpmMin) || 20));
        const bpmMax = Math.max(20, Math.min(200, parseInt(req.query.bpmMax) || 200));

        // Generos — parsear y validar como array de enteros
        let generos = [];
        try {
            const parsed = JSON.parse(req.query.generos || '[]');
            if (Array.isArray(parsed)) {
                generos = parsed.map(g => parseInt(g)).filter(g => !isNaN(g) && g > 0);
            }
        } catch {}

        // Construir WHERE
        const where = { estado: 'ENABLE' };

        // Filtro tipo
        if (tipo === 'audio') where.tipoAsset = 'AUDIO';
        else if (tipo === 'video') where.tipoAsset = 'VIDEO';

        // Filtro BPM (solo si no es el rango completo)
        if (bpmMin > 20 || bpmMax < 200) {
            where.bpm = { [Op.between]: [bpmMin, bpmMax] };
        }

        // Filtro busqueda por nombre de composicion o artista
        const include = [
            {
                model: Artistas,
                attributes: ['nombreArtista'],
                ...(search ? { where: {}, required: false } : {})
            }
        ];

        // Busqueda: nombre de composicion OR nombre de artista
        if (search) {
            const { Op: SeqOp } = await import('sequelize');
            where[Op.or] = [
                { nombreComposicion: { [Op.like]: `%${search}%` } }
            ];
            // Para buscar por artista, hacemos un subquery
            // Primero buscamos IDs de artistas que coincidan
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

        // Filtro generos — buscar idMultimedia que tengan esos generos
        if (generos.length > 0) {
            const { MultimediaGeneros: MG } = await import('../models/index.js');
            const multimediaConGenero = await MG.findAll({
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
                // No hay multimedia con esos generos
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

        // Creditos disponibles del usuario (para saber si puede descargar)
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

export {
    dashboard,
    getGeneros,
    searchMultimedia
}
