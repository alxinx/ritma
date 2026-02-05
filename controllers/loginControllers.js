import {Usuarios} from '../models/index.js'
import {generarJwt} from '../helpers/genToken.js'
import redirection from '../helpers/redirection.js'
import dotenv from "dotenv";

dotenv.config();


const adminLogin = (req, res)=>{
    res.render( "./auth/login", {
        tituloPagina : "Login"
    } )
}


const register = async (req, res)=>{
    res.render( "./auth/register", {
        tituloPagina : "Registrar",
        csrfToken : req.csrfToken()

    } )
}

const adminForgot = (req, res)=>{
    res.render( "./auth/forgot", {
        tituloPagina : "Recuperar Contraseña"
    } )
}


const dashboard = (req, res)=>{
    res.json({mensaje : "Dashboard  Administrador"})
}






//POST ELEMENTS



const loginPost = async (req, res)=>{
    try {
    const {email, password}= req.body
        const usuario = await Usuarios.findOne({
        where : {emailUsuario : email}
            })

        if (!usuario) {
            return res.status(404).json({ msg: "El usuario no existe" });
        }
        //Compruebo que la contraseña sea correcta
        const passwordCorrecto = await usuario.checkPassword(password);

        if (!passwordCorrecto) {
            return res.status(401).json({ msg: "Contraseña incorrecta" });
        }

        //GENERO EN JWT
        const tkn = generarJwt({id : usuario.idUsuario, name : usuario.nombreUsuario, rol : usuario.permisos});
        const urlRedireccion = redirection(usuario.permisos);
        console.log(tkn)
        return res.cookie('_token', tkn, {
            httpOnly : true,
            secure : process.env.COOKIE_SECURE === 'true',
            sameSite: 'strict',
            maxAge: 1000 * 60 * 60 * 8
        }).redirect(urlRedireccion)

    } catch (error) {
        throw new Error('Error en server')
    }
}


//*******************🚨🚨🚨🚨DELETE BEFORE DEPLOY🚨🚨🚨🚨🚨🚨 */
const newAdmin = async (req, res)=>{
    const {nombreUsuario,apellidoUsuario,emailUsuario,password} = req.body
    const usuario = await Usuarios.create({
        nombreUsuario,
        apellidoUsuario,
        emailUsuario,
        password,
        permisos : 'ADMIN'
    })

    return res.status(200).render("./auth/register",{
            tituloPagina: "Registro de Admins",
            csrfToken : req.csrfToken(),
            success : {msg : "Creado Con exito"}
        })

}

export {
    adminLogin,
    adminForgot,
    loginPost,
    dashboard,
    register, // DELETE BEFORE DEPLOY 
    newAdmin // DELETE BEFORE DEPLOY 🚨🚨
}