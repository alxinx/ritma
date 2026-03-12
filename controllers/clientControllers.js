
import dotenv from "dotenv";

dotenv.config();

const dashboard = (req, res)=>{
    return res.status(200).render('../views/client/dashboard', {
        tituloPagina : "PANEL PRINCIPAL CLIENTE",
        csrfToken : req.csrfToken()
    })
}

export {
    dashboard
}