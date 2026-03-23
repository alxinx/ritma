import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import {Usuarios, Aspirantes} from '../models/index.js';
import redisClient from '../config/redis.js';
import {generarJwt} from '../helpers/genToken.js';
dotenv.config();

const rutaProtegida = async (req, res, next)=>{

    let token = req.cookies?._token //Capturo el token en la cookie

    if(!token){
        // Intentar auto-refresh si hay refresh token
        const refreshed = await tryRefreshToken(req, res);
        if (!refreshed) return res.redirect('/');
        token = req.cookies?._token;
    }

    try {
        const decoded = jwt.verify(token, process.env.APP_PRIVATEKEY);
        const usuario = await Usuarios.findByPk(decoded.id.id || decoded.id);

        if (!usuario){
            res.clearCookie('_token').clearCookie('_refresh');
            return res.redirect('/');
        }

        // Verificar si el usuario está suspendido
        if (usuario.estado === 'suspendido') {
            // Invalidar refresh token
            const rt = req.cookies?._refresh;
            if (rt) await redisClient.del(`refresh:${rt}`).catch(() => {});
            res.clearCookie('_token').clearCookie('_refresh');
            return res.redirect('/app/?suspended=1');
        }

        // Adjuntar imagen de perfil desde ASPIRANTES
        await attachUserImage(usuario, res);

        // Disponibles para controladores y vistas
        req.usuario = usuario;
        req.rol = usuario.permisos;
        res.locals.usuario = usuario;
        res.set('Cache-Control', 'no-store');
        return next();

    } catch (e) {
        // Token expirado — intentar refresh
        if (e.name === 'TokenExpiredError') {
            const refreshed = await tryRefreshToken(req, res);
            if (refreshed) {
                // Re-decode con el nuevo token
                try {
                    const newToken = req.cookies?._token;
                    const decoded = jwt.verify(newToken, process.env.APP_PRIVATEKEY);
                    const usuario = await Usuarios.findByPk(decoded.id.id || decoded.id);
                    if (!usuario || usuario.estado === 'suspendido') {
                        res.clearCookie('_token').clearCookie('_refresh');
                        return res.redirect('/');
                    }
                    await attachUserImage(usuario, res);
                    req.usuario = usuario;
                    req.rol = usuario.permisos;
                    res.locals.usuario = usuario;
                    res.set('Cache-Control', 'no-store');
                    return next();
                } catch {
                    res.clearCookie('_token').clearCookie('_refresh');
                    return res.redirect('/');
                }
            }
        }

        console.error('Error en protegerRuta:', e.message);
        res.clearCookie('_token').clearCookie('_refresh');
        return res.redirect('/');
    }
}

/**
 * Adjunta la imagen de perfil desde ASPIRANTES al objeto usuario
 * para que esté disponible en las vistas (headerUser.pug)
 */
async function attachUserImage(usuario, res) {
    try {
        const aspirante = await Aspirantes.findOne({
            where: { emailAspirante: usuario.emailUsuario },
            attributes: ['imagen']
        });
        // Pasar como variable separada a las vistas (Sequelize no permite props arbitrarias)
        res.locals.userImagen = aspirante?.imagen || null;
    } catch (_) {
        res.locals.userImagen = null;
    }
}

/**
 * Intenta refrescar el access token usando el refresh token de Redis
 * @returns {boolean} true si se logró refrescar
 */
async function tryRefreshToken(req, res) {
    const refreshToken = req.cookies?._refresh;
    if (!refreshToken) return false;

    try {
        const data = await redisClient.get(`refresh:${refreshToken}`);
        if (!data) return false;

        const parsed = JSON.parse(data);
        const usuario = await Usuarios.findByPk(parsed.id);
        if (!usuario || usuario.estado === 'suspendido') {
            await redisClient.del(`refresh:${refreshToken}`).catch(() => {});
            return false;
        }

        // Generar nuevo access token
        const newAccessToken = generarJwt({
            id: usuario.idUsuario,
            name: usuario.nombreUsuario,
            rol: usuario.permisos
        });

        // Setear nueva cookie de access token
        res.cookie('_token', newAccessToken, {
            httpOnly: true,
            secure: process.env.COOKIE_SECURE === 'true',
            sameSite: 'strict',
            maxAge: 1000 * 60 * 15 // 15 min
        });

        // Actualizar req.cookies para que el caller lo vea
        req.cookies._token = newAccessToken;
        return true;
    } catch (err) {
        console.error('Error en tryRefreshToken:', err.message);
        return false;
    }
}

const verificarRol = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!rolesPermitidos.includes(req.rol)) {
            if (req.rol === 'USUARIO') {
                return res.redirect(process.env.USER_LINK);
            }
            if (req.rol === 'ADMIN') {
               // Admin puede acceder a todo opcionalmente
            }
            return res.redirect('/');
        }
        next();
    }
}

export {
    rutaProtegida,
    verificarRol
}
