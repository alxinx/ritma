import { Aspirantes } from '../models/index.js';
import { validationResult } from 'express-validator';
import { mailAspirante } from '../helpers/mailAspirante.js';
import redisClient from '../config/redis.js';

const home =(req,res)=>{
    res.status(200).render('../views/layout/main',{
        tituloPagina : "RITMA | La Plataforma #1 para DJs"
    })

}

const vision =(req,res)=>{
    res.status(200).render('../views/layout/vision',{
        tituloPagina : "RITMA | La Plataforma #1 para DJs"
    })

}

const estructura =(req,res)=>{
    res.status(200).render('../views/layout/estructura',{
        tituloPagina : "RITMA | La Plataforma #1 para DJs"
    })

}

const acceso =(req,res)=>{
    res.status(200).render('../views/layout/acceso',{
        tituloPagina : "RITMA | La Plataforma #1 para DJs"
    })
}


const accesoPost = async (req, res) => {
    const renderSuccess = () => {
        return res.status(200).render('../views/layout/accesoAfter', {
            tituloPagina: 'RITMA | La Plataforma #1 para DJs'
        });
    };

    try {
        // Si hay errores de validación, error silencioso
        const errors = validationResult(req);
        if (!errors.isEmpty()) return renderSuccess();

        const { full_name, user_email, whatsapp_num, city, instagram_handle, tiktok_handle } = req.body;

        // Separar nombre y apellido
        const nameParts = full_name.trim().split(/\s+/);
        const nombreAspirante = nameParts[0];
        const apellidoAspirante = nameParts.slice(1).join(' ') || '';

        // Si el email ya existe, error silencioso (no revelar si existe)
        const existe = await Aspirantes.findOne({ where: { emailAspirante: user_email } });
        if (existe) return renderSuccess();

        // Crear aspirante
        await Aspirantes.create({
            nombreAspirante,
            apellidoAspirante,
            emailAspirante: user_email,
            whatsappAspirante: whatsapp_num,
            ciudadAspirante: city || null,
            instagramAspirante: instagram_handle || null,
            tiktokAspirante: tiktok_handle || null
        });

        // Notificar panel admin en tiempo real vía Redis Pub/Sub
        try {
            await redisClient.publish('admin:userpanel', JSON.stringify({
                type: 'new-aspirante',
                data: {
                    nombre: nombreAspirante,
                    apellido: apellidoAspirante,
                    email: user_email,
                    whatsapp: whatsapp_num,
                    ciudad: city || null,
                    fecha: new Date().toISOString()
                }
            }));
        } catch (_) { /* non-blocking */ }

        // Enviar email (no bloquear si falla)
        try {
            await mailAspirante({ emailAspirante: user_email, nombreAspirante });
        } catch (mailErr) {
            console.error('[ACCESO] Error enviando email:', mailErr.message);
        }

        return renderSuccess();
    } catch (error) {
        console.error('[ACCESO] Error:', error.message);
        return renderSuccess();
    }
}


const trendingTracks =(req,res)=>{
    res.status(200).render('../views/layout/trending-tracks',{
        tituloPagina : "RITMA | Trending Tracks Detallado"
    })
}


const trendingVideos =(req,res)=>{
    res.status(200).render('../views/layout/trending-videos',{
        tituloPagina : "RITMA | La Plataforma #1 para DJs"
    })
}


const profileTrack =(req,res)=>{
    res.status(200).render('../views/layout/profile-Track',{
        tituloPagina : "Perfil"
    })
}






//BORRAR ANTES DE  DESPLEGAR! 


//BASES DE FRONTEND. 
const frontend  = (req, res)=>{
     res.status(200).render('../views/layout/frontend',{
        tituloPagina : "FRONTEND"
    })
}

export {
    frontend,
    home,
    vision,
    estructura,
    acceso, 
    accesoPost,
    trendingTracks,
    trendingVideos,
    profileTrack
}


