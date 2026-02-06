import {Usuarios} from '../models/index.js'
import dotenv from "dotenv";

dotenv.config();

const dashboard = (req, res)=>{
    return res.status(200).render('../views/app/dashboard', {
        tituloPagina : "Panel de control",
        csrfToken : req.csrfToken()
    })
}


export {
    dashboard
}