import express from "express";
import {adminLogin} from '../controllers/adminControllers.js';
const routes = express.Router();

routes.get("/", adminLogin )


export default routes