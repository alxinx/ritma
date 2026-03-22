import express from "express";
import downloadRateLimiter from '../middlewares/downloadRateLimiter.js';
import { dashboard, getGeneros, searchMultimedia, mediafile, toggleWishlist, requestDownloadToken, verifyAndDownload, checkDownloadBan, requestStreamToken, streamVideo, streamPreview } from '../controllers/clientControllers.js';

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

export default routes
