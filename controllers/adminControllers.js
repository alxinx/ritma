import {Usuarios} from '../models/index.js'
import dotenv from "dotenv";

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


export {
    dashboard,
    usersPanel
}