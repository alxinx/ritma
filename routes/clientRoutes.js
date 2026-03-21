import express from "express";
import { dashboard, getGeneros, searchMultimedia } from '../controllers/clientControllers.js';

const routes = express.Router();

// Paginas
routes.get("/", dashboard);

// APIs JSON
routes.get("/json/generos", getGeneros);
routes.get("/json/search", searchMultimedia);

export default routes
