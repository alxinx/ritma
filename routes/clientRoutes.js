import express from "express";
import { dashboard} from '../controllers/clientControllers.js'
const routes = express.Router();



routes.get("/", dashboard)


export default routes