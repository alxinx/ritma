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

export {
    dashboard,
    getGeneros
}
