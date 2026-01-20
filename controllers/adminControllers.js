
const adminLogin = (req, res)=>{
    res.render( "./auth/login", {
        pagina : "Login"
    } )
}

export {
    adminLogin
}