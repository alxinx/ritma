import { Artistas, Album, Generos } from '../models/index.js'
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

export { jsonCheckArtistByName, getAlbumsByArtist, getAllGenres }
