import express from "express";
import dotenv from "dotenv";
import upload from '../middlewares/upload.js';
import procesarImagenes from '../middlewares/imageProcessor.js'
import validarErrores  from '../middlewares/validarErrores.js'
import {checkUploadMultimedia} from '../middlewares/validationFields.js';
import  {getPresignedUrl}  from '../controllers/uploadController.js';

import { dashboard, usersPanel, multimediaPanel, uploadboard, mediafile, postUploadMultimedia, validateUpload, liveUploadMonitor, jsonCheckArtistByName, getAlbumsByArtist, getAllGenres, getMultimediaList, getMultimediaStatus, toggleMultimediaEstado, requestDownloadToken, verifyAndDownload, updateMultimediaData, requestStreamToken, streamVideo, streamPreview, getActiveMembers, getAspirantes, aprobarAspirante, rechazarAspirante, sseUserPanel, getSolicitudesPendientes } from '../controllers/adminControllers.js'
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
    checkUploadMultimedia,
    validarErrores,
    postUploadMultimedia
);
        routes.post("/uploadboard/validate", validateUpload);
routes.get("/live-upload-monitor", upload.any(), liveUploadMonitor)



routes.get("/profile/mediafile/:idMultimedia", mediafile)






//********************[API] ******************* */

routes.post('/api/upload/sign', getPresignedUrl);



//*******************[JSON]******************* */
//routes.get('/json/artist/:nombreArtista', jsonCheckArtistByName)
routes.get('/json/artistas', jsonCheckArtistByName);
routes.get('/json/generos', getAllGenres);

routes.get('/json/album/:idArtista', getAlbumsByArtist);

routes.get('/json/multimedia', getMultimediaList);
routes.get('/json/multimedia/status', getMultimediaStatus);
routes.patch('/json/multimedia/:idMultimedia/toggle', toggleMultimediaEstado);
routes.post('/json/multimedia/:idMultimedia/request-download', requestDownloadToken);
routes.patch('/json/multimedia/:idMultimedia/update', updateMultimediaData);
routes.post('/json/multimedia/:idMultimedia/request-stream', requestStreamToken);
routes.get('/api/download/:token', verifyAndDownload);
routes.get('/api/video/stream/:idMultimedia', streamVideo);
routes.get('/api/preview/:idMultimedia', streamPreview);

// SSE (real-time)
routes.get('/sse/userpanel', sseUserPanel);

// Users panel
routes.get('/json/users/members', getActiveMembers);
routes.get('/json/users/aspirantes', getAspirantes);
routes.post('/json/users/aspirantes/:idAspirante/aprobar', aprobarAspirante);
routes.post('/json/users/aspirantes/:idAspirante/rechazar', rechazarAspirante);
routes.get('/json/solicitudes-pendientes', getSolicitudesPendientes);

export default routes