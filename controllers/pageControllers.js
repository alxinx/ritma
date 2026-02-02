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


const accesoPost =(req,res)=>{
    res.status(200).render('../views/layout/accesoAfter',{
        tituloPagina : "RITMA | La Plataforma #1 para DJs"
    })
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








export {
    home,
    vision,
    estructura,
    acceso, 
    accesoPost,
    trendingTracks,
    trendingVideos,
    profileTrack
}


