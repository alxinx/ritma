import {Usuarios, Artistas, Album, Genero} from '../models/index.js'
import dotenv from "dotenv";
import { Op } from 'sequelize';

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
    
    const genres = await Genero.findAll({
        attributes: ['genero_id', 'nombre', 'slug']
    });
    res.json(genres)


}




export {
    dashboard,
    usersPanel,
    multimediaPanel, uploadboard,
    getAlbumsByArtist,
    getAllGenres,
    jsonCheckArtistByName,
}