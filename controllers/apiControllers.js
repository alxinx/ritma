import { Artistas, Album, Generos, Multimedia, MultimediaGeneros } from '../models/index.js'
import { Op } from 'sequelize';

const jsonCheckArtistByName = async (req, res) => {
    try {
        const { nombreArtista } = req.query;
        if (!nombreArtista || nombreArtista.trim() === '') {
            return res.json([]);
        }
        const term = `%${nombreArtista.trim()}%`;
        const artistas = await Artistas.findAll({
            where: { nombreArtista: { [Op.like]: term } },
            limit: 5,
            order: [['nombreArtista', 'ASC']],
            attributes: ['idArtista', 'nombreArtista', 'cover']
        });
        res.json(artistas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al consultar artistas' });
    }
}

const getAlbumsByArtist = async (req, res) => {
    const { idArtista } = req.params;
    const { q } = req.query;
    try {
        const albums = await Album.findAll({
            where: {
                idArtista,
                nombreAlbum: { [Op.like]: `%${q || ''}%` }
            },
            limit: 10,
            attributes: ['idAlbum', 'nombreAlbum', 'cover']
        });
        res.json(albums);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al consultar álbumes' });
    }
}

const getAllGenres = async (req, res) => {
    try {
        const genres = await Generos.findAll({
            attributes: ['genero_id', 'nombre', 'slug']
        });
        res.json(genres);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al consultar géneros' });
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

        // --- WHERE base sobre MULTIMEDIA ---
        const where = {};

        if (formato === 'audio')      where.tipoAsset = 'AUDIO';
        else if (formato === 'video') where.tipoAsset = 'VIDEO';

        // Busqueda por composicion
        if (q.trim() && buscarpor === 'composicion') {
            where.nombreComposicion = { [Op.like]: `%${q.trim()}%` };
        }

        // --- INCLUDE Artistas ---
        const includeArtista = {
            model: Artistas,
            attributes: ['idArtista', 'nombreArtista'],
            required: false  // LEFT JOIN por defecto
        };

        // Busqueda por nombre de artista (INNER JOIN cuando se filtra)
        if (q.trim() && buscarpor === 'artista') {
            includeArtista.where = { nombreArtista: { [Op.like]: `%${q.trim()}%` } };
            includeArtista.required = true;
        }

        // --- FILTRO POR GENEROS ---
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

        // --- QUERY ---
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
// POLLING DE ESTADOS  (async status update)
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

export {
    jsonCheckArtistByName,
    getAlbumsByArtist,
    getAllGenres,
    getMultimediaList,
    getMultimediaStatus
}
