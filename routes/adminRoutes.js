import express from "express";
import { dashboard, usersPanel, multimediaPanel, uploadboard, jsonCheckArtistByName, getAlbumsByArtist, getAllGenres} from '../controllers/adminControllers.js'
const routes = express.Router();



//PANEL CONTROLLERS
routes.get("/", dashboard)
routes.get("/users", usersPanel)
routes.get("/downloads", dashboard)
routes.get("/credits", dashboard)
routes.get("/multimedia", multimediaPanel)
    routes.get("/uploadboard", uploadboard)











//**********************[POST] ***********************/

//routes.post("/", loginPost)
//routes.post("/register", newAdmin)

//loginPost



//*******************[JSON]******************* */
//routes.get('/json/artist/:nombreArtista', jsonCheckArtistByName)
routes.get('/json/artistas', jsonCheckArtistByName);
routes.get('/json/generos', getAllGenres);

routes.get('/json/album/:idArtista', getAlbumsByArtist);

export default routes