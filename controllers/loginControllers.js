import {validationResult } from "express-validator";
import {Usuarios} from '../models/index.js'
import {generarJwt} from '../helpers/genToken.js'
import redirection from '../helpers/redirection.js'
import crypto from "crypto"
import nodemailer from "nodemailer"
import {mailRecovery} from '../helpers/mailRecovery.js'
import { Op } from 'sequelize';

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

const sendRecovery = (req, res)=>{
    res.render( "./auth/showRecovery", {
        tituloPagina : "Recuperar Contraseña"
    } )
}

//RECUPERAR CONTRASENÑAS
const recovery = (req, res)=>{
    try {
        const {token} = req.params
        if(!token){
            return res.redirect("/app/");
        }

        res.render( "./auth/recovery", {
                tituloPagina : "Recuperar Contraseña",
                token
            } )

    } catch (error) {
        console.error("Error en recovery controller:", error);
        return res.status(500).send("Error interno del servidor");
    }
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

        // Mensaje genérico para evitar user enumeration
        if (!usuario) {
            return res.status(401).render('./auth/login', {
                tituloPagina: 'Login',
                mensaje: '❌ Credenciales inválidas'
            });
        }

        //Compruebo que la contraseña sea correcta
        const passwordCorrecto = await usuario.checkPassword(password);
        if (!passwordCorrecto) {
            return res.status(401).render('./auth/login', {
                tituloPagina: 'Login',
                mensaje: '❌ Credenciales inválidas'
            });
        }

        //GENERO EN JWT
        const tkn = generarJwt({id : usuario.idUsuario, name : usuario.nombreUsuario, rol : usuario.permisos});
        const urlRedireccion = redirection(usuario.permisos);
        return res.cookie('_token', tkn, {
            httpOnly : true,
            secure : process.env.COOKIE_SECURE === 'true',
            sameSite: 'strict',
            maxAge: 1000 * 60 * 60 * 8
        }).redirect(urlRedireccion)

    } catch (error) {
        console.error('Error en loginPost:', error.message);
        return res.status(500).render('./auth/login', {
            tituloPagina: 'Login',
            mensaje: '❌ Error interno del servidor. Intenta más tarde.'
        });
    }
}




//RECUPERAR CONTRASEÑA

const postRecovery = async (req, res)=>{
    //Valido si lo que me pasó el frontend es confiable 😑
     const errores = validationResult(req);
     if (!errores.isEmpty()) {
        
        return  res.status(401).render('./auth/forgot',{
                tituloPagina : "Recuperar Contraseña",
                errores: errores.array().reduce((acc, err) => ({ ...acc, [err.path]: err.msg }), {}) 
        })
     }


   //Validamos la existencia del email
   try {

    const { email} = req.body

    //VERIFICO QUE ESE EMAIL EXISTA:
    const usuario = await Usuarios.findOne({where : {emailUsuario:email}})

    console.log(usuario)
    if(!usuario){
        return  res.status(201).render('./auth/forgot',{
                tituloPagina : "Recuperar Contraseña",
                mensaje: 'Te enviamos un email para que recuperes tu contraseña, revisa en spam en caso que no esté en la bandeja de entrada' 
        })
    }

    //generamos un token de confirmación y se lo asigno al usuario.

    const token = crypto.randomBytes(20).toString('hex');
    usuario.token = token;
    usuario.expiracion = Date.now() + 3600000; // 1 hora 
    await usuario.save();

    //Envio el email de confirmacion
    mailRecovery(usuario)

    //Retorno a un mensaje
    return res.redirect('/app/sendRecovery')
   


   } catch (error) {
        console.error("Error en postRecovery:", error);
        res.status(500).render('app/forgot', {
            tituloPagina: "Recuperar Contraseña",
            error: "Hubo un error interno, intenta más tarde."
        });
   }

}


const resetPassword = async (req, res)=>{
    //Valido si lo que me pasó el frontend es confiable 😑

     const errores = validationResult(req);
     if (!errores.isEmpty()) {
        
        return  res.status(401).render('/app/forgot',{
                tituloPagina : "Recuperar Contraseña",
                errores: errores.array().reduce((acc, err) => ({ ...acc, [err.path]: err.msg }), {}) 
        })
     }

     try {

        const {password, token}= req.body

        const usuario = await Usuarios.findOne({
            where: {
                token: token,
                expiracion: { [Op.gt]: new Date() }
            }
        });


        if (!usuario) {
            // Si no hay usuario o el token expiró, enviamos al login o error
            return res.render('/app/', {
                tituloPagina: "Recuperar Contraseña",
                error: "El enlace es inválido o ha expirado. Solicita uno nuevo."
            });
        }

        //Actualizo 
        usuario.password = password; 
        usuario.token = null;
        usuario.expiracion = null;
        await usuario.save();

        return res.redirect('/app/?reset=success');



        
     } catch (error) {
            console.error("Error en postRecovery:", error);
            res.status(500).render('auth/forgot', {
                tituloPagina: "Recuperar Contraseña",
                error: "Hubo un error interno, intenta más tarde."
            })
     }

}



const logout = (req, res) => {
    return res.clearCookie('_token').redirect('/');

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
    recovery,
    postRecovery,
    sendRecovery,
    resetPassword,
    loginPost,
    dashboard,
    logout,
    register, // DELETE BEFORE DEPLOY 
    newAdmin // DELETE BEFORE DEPLOY 🚨🚨
}