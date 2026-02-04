import express from "express";
import {frontend,home, vision, estructura, acceso, accesoPost, trendingTracks,
trendingVideos, profileTrack} from "../controllers/pageControllers.js"
const routes = express.Router();

routes.get("/", home )
routes.get("/vision/", vision )
routes.get("/estructura/", estructura )
routes.get("/acceso", acceso)
routes.post('/acceso',accesoPost )


routes.get("/trending-tracks", trendingTracks)
routes.get("/trending-tracks/:idCancion", profileTrack)
routes.get("/trending-videos", trendingVideos)




//BORRAR ANTES DE SUBIR A PRODUCCION:
routes.get('/frontend', frontend )


export default routes