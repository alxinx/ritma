import express from "express";
import { dashboard, getGeneros } from '../controllers/clientControllers.js';

const routes = express.Router();

// Paginas
routes.get("/", dashboard);

// APIs JSON
routes.get("/json/generos", getGeneros);

export default routes
