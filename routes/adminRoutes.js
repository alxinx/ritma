import express from "express";
import {adminLogin, adminForgot} from '../controllers/adminControllers.js';
const routes = express.Router();

routes.get("/", adminLogin)
routes.get("/forgot", adminForgot)




export default routes