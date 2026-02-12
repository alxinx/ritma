import express from "express";
import multer from "multer";
import  validarErrores  from '../middlewares/validarErrores.js'
import {checkUploadMultimedia} from '../middlewares/validationFields.js';
import { dashboard, usersPanel, multimediaPanel, uploadboard, postUploadMultimedia, liveUploadMonitor, jsonCheckArtistByName, getAlbumsByArtist, getAllGenres} from '../controllers/adminControllers.js'
const routes = express.Router();
//const upload = multer({ storage: multer.memoryStorage() });
const upload = multer({ dest: 'upload/' });



//PANEL CONTROLLERS
routes.get("/", dashboard)
routes.get("/users", usersPanel)
routes.get("/downloads", dashboard)
routes.get("/credits", dashboard)
routes.get("/multimedia", multimediaPanel)
    routes.get("/uploadboard", uploadboard)
       
    routes.post(
            "/uploadboard", 
            upload.fields([
                { name: 'archivo[]', maxCount: 20 },
                { name: 'coverAlbum', maxCount: 1 }
            ]),
            checkUploadMultimedia, 
            validarErrores, 
            postUploadMultimedia 
        );

routes.get("/live-upload-monitor", upload.any(), liveUploadMonitor)











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