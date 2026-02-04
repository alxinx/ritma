
const adminLogin = (req, res)=>{
    res.render( "./auth/login", {
        tituloPagina : "Login"
    } )
}

const adminForgot = (req, res)=>{
    res.render( "./auth/forgot", {
        tituloPagina : "Recuperar Contraseña"
    } )
}

export {
    adminLogin,
    adminForgot,
}