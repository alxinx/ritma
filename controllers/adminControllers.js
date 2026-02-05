import {Usuarios} from '../models/index.js'
import {generarJwt} from '../helpers/genToken.js'
import redirection from '../helpers/redirection.js'
import dotenv from "dotenv";

dotenv.config();

const dashboard = (req, res)=>{
    res.json({
        msg : "Panel Admin"
    })
}

export {
    dashboard
}