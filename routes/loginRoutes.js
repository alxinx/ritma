import express from "express";
import {emailValidation, checkPasswords} from '../middlewares/validationFields.js'

import {adminLogin, adminForgot,  recovery, postRecovery, resetPassword,sendRecovery, register, newAdmin, loginPost, logout} from '../controllers/loginControllers.js';
//import {rutaProtegida,verificarRol} from "../middlewares/authMiddleware.js"
const routes = express.Router();

//LOGIN CONTROLLERS
routes.get("/", adminLogin)
routes.get("/register", register)
routes.get("/forgot", adminForgot)
routes.get("/sendRecovery", sendRecovery)
routes.get("/recovery/:token", recovery)




//POST 
routes.post("/recovery/:token", checkPasswords, resetPassword)
routes.post("/forgot/", emailValidation, postRecovery)

routes.post("/logout", logout)

//PANEL CONTROLLERS





//**********************[POST] ***********************/

routes.post("/", loginPost)
routes.post("/register", newAdmin)

//loginPost


export default routes