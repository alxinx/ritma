import { Usuarios, Multimedia, Artistas, HistorialDescargas, RitmaCoins, Wishlist } from '../models/index.js';
import { Op, fn, col } from 'sequelize';
import dotenv from "dotenv";

dotenv.config();

// ==========================================
// DASHBOARD — Panel principal del usuario
// ==========================================
const dashboard = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;

        const [creditosDisponibles, totalDescargas, wishlistCount, descargasRecientes] = await Promise.all([
            // Creditos disponibles
            RitmaCoins.sum('cantidadActual', { where: { idUsuario } }).then(v => v || 0),

            // Total descargas
            HistorialDescargas.count({ where: { idUsuario } }),

            // Wishlist count
            Wishlist.count({ where: { idUsuario, estado: 'en lista' } }),

            // Ultimas 5 descargas
            HistorialDescargas.findAll({
                where: { idUsuario },
                include: [{
                    model: Multimedia,
                    attributes: ['nombreComposicion', 'formato', 'tipoAsset'],
                    include: [{ model: Artistas, attributes: ['nombreArtista'] }]
                }],
                order: [['fechaDescarga', 'DESC']],
                limit: 5,
                raw: false
            })
        ]);

        return res.status(200).render('../views/client/dashboard', {
            tituloPagina: "Home",
            subtitulo: "Tu espacio musical",
            active: 'home',
            csrfToken: req.csrfToken(),
            creditosDisponibles,
            totalDescargas,
            wishlistCount,
            descargasRecientes,
            notificaciones: 0
        });

    } catch (error) {
        console.error('Error client dashboard:', error);
        return res.status(200).render('../views/client/dashboard', {
            tituloPagina: "Home",
            subtitulo: "Tu espacio musical",
            active: 'home',
            csrfToken: req.csrfToken(),
            creditosDisponibles: 0,
            totalDescargas: 0,
            wishlistCount: 0,
            descargasRecientes: [],
            notificaciones: 0
        });
    }
};

export {
    dashboard
}
