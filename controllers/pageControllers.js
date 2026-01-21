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


export {
    home,
    vision,
    estructura,
    acceso
}


