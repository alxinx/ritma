import express from "express";
import csrf from "csurf";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import db from "./config/bd.js";


import pageRoutes from "./routes/pageRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import clientRoutes from "./routes/clientRoutes.js"
import loginRoutes from "./routes/loginRoutes.js";


import {rutaProtegida, verificarRol} from "./middlewares/authMiddleware.js"


dotenv.config();

const app = express();

/* ======================
   BASE DE DATOS
====================== */
try {
  await db.authenticate();

  if (process.env.DB_SYNC === "true") {
    await db.sync();
  }

  console.log("Conexión a la base de datos establecida correctamente.");
} catch (error) {
  console.error("No se pudo conectar a la base de datos:", error);
  process.exit(1);
}

/* ======================
   VIEW ENGINE
====================== */
app.set("view engine", "pug");
app.set("views", "./views");

/* ======================
   MIDDLEWARES BASE
====================== */
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
/* ======================
   CSRF (solo después de cookies)
====================== */
const csrfProtection = csrf({ cookie: true });

// Inyectar token en vistas
app.use((req, res, next) => {
  // Si la ruta es para firmar subidas, saltamos el CSRF
  if (req.path.startsWith('/app/dash/api/upload/sign')) {
    return next();
  }

  try {
    csrfProtection(req, res, () => {
      res.locals.csrfToken = req.csrfToken();
      next();
    });
  } catch (err) {
    next(err);
  }
});

/* ======================
   RUTAS
====================== */
app.use("/", pageRoutes);
app.use("/app", loginRoutes);



//INGRESO A ADMINISTRADORES
app.use("/app/dash/",rutaProtegida, verificarRol('ADMIN'), adminRoutes);


app.use("/ritmaap/",rutaProtegida, verificarRol('USUARIO'), clientRoutes);






//RUTA PARA EL SUPER ADMININSTRADOR
//app.use("/dash", rutaProtegida, adminRoutes);

//Ruta para el usuario
//app.use("/app/user",rutaProtegida, adminRoutes);

/* ======================
   MANEJO DE ERRORES CSRF
====================== */
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).send("CSRF token inválido");
  }
  next(err);
});

/* ======================
   SERVER
====================== */
app.listen(process.env.APP_PORT, () => {
  console.log(
    `app running in ${process.env.APP_ADDRESS}:${process.env.APP_PORT}`
  );
});
