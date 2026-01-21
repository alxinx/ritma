import express from "express";
import {home, vision, estructura, acceso} from "../controllers/pageControllers.js"
const routes = express.Router();

routes.get("/", home )
routes.get("/vision/", vision )
routes.get("/estructura/", estructura )
routes.get("/acceso", acceso)



export default routes