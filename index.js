import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import adminRoutes from "./routes/adminRoutes.js";

dotenv.config()
const  app = express();

app.set("view engine", "pug")
app.set("views", "./views/")

app.use("/admin", adminRoutes);




app.use( express.static("public") );
app.use( express.urlencoded( { extended : true}));
app.use( cookieParser());

app.listen(process.env.APP_PORT, ()=>{
    console.log(`app running in ${process.env.APP_ADDRESS}:${process.env.APP_PORT} `)
})