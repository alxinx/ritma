import express from "express";
import dotenv from "dotenv";
import upload, { validarMagicBytes } from '../middlewares/upload.js';
import procesarImagenes from '../middlewares/imageProcessor.js'
import validarErrores  from '../middlewares/validarErrores.js'
import {checkUploadMultimedia, checkUploadMultiArtist} from '../middlewares/validationFields.js';
import downloadRateLimiter from '../middlewares/downloadRateLimiter.js';
import  {getPresignedUrl}  from '../controllers/uploadController.js';

import { dashboard, usersPanel, multimediaPanel, uploadboard, mediafile, postUploadMultimedia, validateUpload, liveUploadMonitor, jsonCheckArtistByName, getAlbumsByArtist, getAllGenres, getMultimediaList, getMultimediaStatus, toggleMultimediaEstado, requestDownloadToken, verifyAndDownload, updateMultimediaData, requestStreamToken, streamVideo, streamPreview, getActiveMembers, getAspirantes, aprobarAspirante, rechazarAspirante, sseUserPanel, getSolicitudesPendientes, userProfile, getUserDownloads, addUserCredits, updateUserData, toggleUserStatus, getUserWishlist, getUserCreditHistory, downloadsPanel, getTopGeneros, checkDownloadBan, checkArtistExists, postUploadMultiArtist, creditsPanel, getCreditsHistory, getCreditsChart, exportCreditsExcel, getPacks, createPack, updatePack, togglePackEstado } from '../controllers/adminControllers.js'
const routes = express.Router();
dotenv.config();



//PANEL CONTROLLERS
routes.get("/", dashboard)
routes.get("/users", usersPanel)
routes.get("/downloads", downloadsPanel)
routes.get("/credits", creditsPanel)
routes.get("/multimedia", multimediaPanel)
    routes.get("/uploadboard", uploadboard)
       
    routes.post(
    "/uploadboard",
    checkUploadMultimedia,
    validarErrores,
    postUploadMultimedia
);
        routes.post("/uploadboard/validate", validateUpload);
routes.post("/uploadboard/multi", checkUploadMultiArtist, validarErrores, postUploadMultiArtist);
routes.get("/live-upload-monitor", upload.any(), validarMagicBytes, liveUploadMonitor)



routes.get("/profile/mediafile/:idMultimedia", mediafile)






//********************[API] ******************* */

routes.post('/api/upload/sign', getPresignedUrl);



//*******************[JSON]******************* */
//routes.get('/json/artist/:nombreArtista', jsonCheckArtistByName)
routes.get('/json/artistas', jsonCheckArtistByName);
routes.get('/json/artistas/check', checkArtistExists);
routes.get('/json/generos', getAllGenres);

routes.get('/json/album/:idArtista', getAlbumsByArtist);

routes.get('/json/multimedia', getMultimediaList);
routes.get('/json/multimedia/status', getMultimediaStatus);
routes.patch('/json/multimedia/:idMultimedia/toggle', toggleMultimediaEstado);
routes.get('/json/download-ban-status', checkDownloadBan);
routes.post('/json/multimedia/:idMultimedia/request-download', downloadRateLimiter, requestDownloadToken);
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

// User profile
routes.get('/users/profile/:idUsuario', userProfile);
routes.get('/json/users/:idUsuario/downloads', getUserDownloads);
routes.post('/json/users/:idUsuario/credits', addUserCredits);
routes.patch('/json/users/:idUsuario/update', updateUserData);
routes.patch('/json/users/:idUsuario/toggle-status', toggleUserStatus);
routes.get('/json/users/:idUsuario/wishlist', getUserWishlist);
routes.get('/json/users/:idUsuario/credit-history', getUserCreditHistory);

// Analytics
routes.get('/json/analytics/top-generos', getTopGeneros);

// Credits module
routes.get('/json/credits/history', getCreditsHistory);
routes.get('/json/credits/chart', getCreditsChart);
routes.get('/json/credits/export', exportCreditsExcel);
routes.get('/json/packs', getPacks);
routes.post('/json/packs', createPack);
routes.patch('/json/packs/:idPack', updatePack);
routes.patch('/json/packs/:idPack/toggle', togglePackEstado);

export default routes