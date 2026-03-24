import express from "express";
import downloadRateLimiter from '../middlewares/downloadRateLimiter.js';
import upload from '../middlewares/upload.js';
import { dashboard, getGeneros, searchMultimedia, mediafile, toggleWishlist, requestDownloadToken, verifyAndDownload, checkDownloadBan, requestStreamToken, streamVideo, streamPreview, biblioteca, searchBiblioteca, getArtistasBiblioteca, wishlistPage, searchWishlist, removeFromWishlist, settingsPage, updateProfile, updatePassword, uploadAvatar, favoritosPage, getFavoritos, addFavorito, removeFavorito, toggleFavorito, creditosPage, getMisCompras, getMisTransacciones } from '../controllers/clientControllers.js';
import { createBoldPayment } from '../controllers/boldController.js';

const routes = express.Router();

// Paginas
routes.get("/", dashboard);
routes.get("/profile/mediafile/:idMultimedia", mediafile);

// APIs JSON
routes.get("/json/generos", getGeneros);
routes.get("/json/search", searchMultimedia);
routes.get("/json/download-ban-status", checkDownloadBan);

// Wishlist toggle
routes.post("/json/wishlist/:idMultimedia/toggle", toggleWishlist);

// Download flow (con rate limiter)
routes.post("/json/multimedia/:idMultimedia/request-download", downloadRateLimiter, requestDownloadToken);
routes.get("/api/download/:token", verifyAndDownload);

// Streaming (proxy — no expone R2 URLs)
routes.post("/json/multimedia/:idMultimedia/request-stream", requestStreamToken);
routes.get("/api/video/stream/:idMultimedia", streamVideo);
routes.get("/api/preview/:idMultimedia", streamPreview);

// Biblioteca
routes.get("/biblioteca", biblioteca);
routes.get("/json/biblioteca/search", searchBiblioteca);
routes.get("/json/biblioteca/artistas", getArtistasBiblioteca);

// Wishlist page
routes.get("/wishlist", wishlistPage);
routes.get("/json/wishlist/search", searchWishlist);
routes.delete("/json/wishlist/:idMultimedia", removeFromWishlist);

// Favoritos
routes.get("/favoritos", favoritosPage);
routes.get("/json/favoritos", getFavoritos);
routes.post("/json/favoritos/:idMultimedia", addFavorito);
routes.delete("/json/favoritos/:idMultimedia", removeFavorito);
routes.post("/json/favoritos/:idMultimedia/toggle", toggleFavorito);

// Créditos
routes.get("/creditos", creditosPage);
routes.get("/json/creditos/compras", getMisCompras);
routes.get("/json/creditos/transacciones", getMisTransacciones);
routes.post("/json/creditos/bold/create-payment", createBoldPayment);

// Settings
routes.get("/settings", settingsPage);
routes.put("/json/settings/profile", updateProfile);
routes.put("/json/settings/password", updatePassword);
routes.post("/json/settings/avatar", upload.single('avatar'), uploadAvatar);

export default routes
