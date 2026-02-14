import express from "express";
import dotenv from "dotenv";
import upload from '../middlewares/upload.js';
import procesarImagenes from '../middlewares/imageProcessor.js'
import validarErrores  from '../middlewares/validarErrores.js'
import {checkUploadMultimedia} from '../middlewares/validationFields.js';
import  {getPresignedUrl}  from '../controllers/uploadController.js';

import { dashboard, usersPanel, multimediaPanel, uploadboard, postUploadMultimedia, validateUpload, liveUploadMonitor, jsonCheckArtistByName, getAlbumsByArtist, getAllGenres} from '../controllers/adminControllers.js'
const routes = express.Router();
dotenv.config();



//PANEL CONTROLLERS
routes.get("/", dashboard)
routes.get("/users", usersPanel)
routes.get("/downloads", dashboard)
routes.get("/credits", dashboard)
routes.get("/multimedia", multimediaPanel)
    routes.get("/uploadboard", uploadboard)
       
    routes.post(
    "/uploadboard", 
    // checkUploadMultimedia, // <-- COMENTALO TEMPORALMENTE para probar
    validarErrores, 
    postUploadMultimedia 
);
        routes.post("/uploadboard/validate", validateUpload);
routes.get("/live-upload-monitor", upload.any(), liveUploadMonitor)











//**********************[POST] ***********************/

//routes.post("/", loginPost)
//routes.post("/register", newAdmin)

//loginPost


//********************[API] ******************* */

routes.post('/api/upload/sign', getPresignedUrl);



//*******************[JSON]******************* */
//routes.get('/json/artist/:nombreArtista', jsonCheckArtistByName)
routes.get('/json/artistas', jsonCheckArtistByName);
routes.get('/json/generos', getAllGenres);

routes.get('/json/album/:idArtista', getAlbumsByArtist);

export default routes