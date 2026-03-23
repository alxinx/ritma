import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import multimediaQueue from './queues/multimediaQueue.js';

import express from "express";
import csrf from "csurf";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import securityHeaders from "./middlewares/securityHeaders.js";

import db from "./config/bd.js";
import redisClient, { redisSub } from './config/redis.js';

import pageRoutes from "./routes/pageRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import loginRoutes from "./routes/loginRoutes.js";
import './workers/multimediaWorker.js';



const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues'); // ruta donde bull-board estará disponible
createBullBoard({
  queues: [
    new BullMQAdapter(multimediaQueue)
  ],
  serverAdapter
});

import { rutaProtegida, verificarRol } from "./middlewares/authMiddleware.js";

dotenv.config();

const app = express(); // <--- crear app antes

/* ======================
   VIEW ENGINE
====================== */
app.set("view engine", "pug");
app.set("views", "./views");

/* ======================
   SEGURIDAD — HEADERS HTTP
====================== */
app.use(securityHeaders);

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
app.use((req, res, next) => {
  if (req.path.startsWith('/app/dash/api/upload/sign') || req.path.startsWith('/app/dash/sse/') || req.path.startsWith('/admin/queues')) return next();
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
app.use("/app/dash", rutaProtegida, verificarRol('ADMIN'), adminRoutes);
app.use("/ritmaap/", rutaProtegida, verificarRol('USUARIO'), clientRoutes);


app.use('/admin/queues', rutaProtegida, verificarRol('ADMIN'), serverAdapter.getRouter());


/* ======================
   MANEJO DE ERRORES CSRF
====================== */
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") return res.status(403).send("CSRF token inválido");
  next(err);
});

/* ======================
   INICIO DEL SERVIDOR
====================== */
async function startServer() {  
  try {
    // Conectar base de datos
    await db.authenticate();
    if (process.env.DB_SYNC === "true") await db.sync();
    console.log("Conexión a la base de datos establecida correctamente.");

    // Conectar Redis (commands + subscriber)
    await redisClient.connect();
    await redisSub.connect();
    console.log('Redis conectado (commands + pub/sub)');

    // Iniciar servidor Express
    const PORT = process.env.APP_PORT || 5050;
    const ADDRESS = process.env.APP_ADDRESS || 'localhost';

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en ${ADDRESS}:${PORT}`);
    });
  } catch (error) {
    console.error('Error iniciando el servidor:', error);
    process.exit(1);
  }
}

startServer();
