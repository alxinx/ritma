import express from "express";
import {adminLogin, adminForgot, register, newAdmin, loginPost} from '../controllers/loginControllers.js';
//import {rutaProtegida,verificarRol} from "../middlewares/authMiddleware.js"
const routes = express.Router();

//LOGIN CONTROLLERS
routes.get("/", adminLogin)
routes.get("/register", register)
routes.get("/forgot", adminForgot)




//PANEL CONTROLLERS





//**********************[POST] ***********************/

routes.post("/", loginPost)
routes.post("/register", newAdmin)

//loginPost


export default routes