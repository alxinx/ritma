import express from "express";
import { dashboard} from '../controllers/adminControllers.js'
const routes = express.Router();







//PANEL CONTROLLERS

routes.get("/", dashboard)





//**********************[POST] ***********************/

//routes.post("/", loginPost)
//routes.post("/register", newAdmin)

//loginPost


export default routes