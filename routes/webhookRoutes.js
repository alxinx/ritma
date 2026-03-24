import express from 'express';
import { boldWebhook, boldStatusPage } from '../controllers/boldController.js';

const routes = express.Router();

// POST — Bold llama aquí con el resultado del pago (server-to-server)
routes.post('/bold', boldWebhook);

// GET — Página de estado — Bold redirige al usuario aquí tras completar el pago
routes.get('/bold', boldStatusPage);

export default routes;
