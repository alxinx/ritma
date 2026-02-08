import express from "express";
import { dashboard, usersPanel, multimediaPanel, uploadboard} from '../controllers/adminControllers.js'
const routes = express.Router();



//PANEL CONTROLLERS
routes.get("/", dashboard)
routes.get("/users", usersPanel)
routes.get("/downloads", dashboard)
routes.get("/credits", dashboard)
routes.get("/multimedia", multimediaPanel)
    routes.get("/uploadboard", uploadboard)








//**********************[POST] ***********************/

//routes.post("/", loginPost)
//routes.post("/register", newAdmin)

//loginPost


export default routes