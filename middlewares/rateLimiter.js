import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

// Conexión dedicada para rate limiting (no bloquea el queue principal)
const redisRL = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 3000,
});

const MAX_ATTEMPTS = 10;          // Intentos máximos
const WINDOW_SECONDS = 15 * 60;  // Ventana de 15 minutos

const loginRateLimiter = async (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const key = `rtm:login:ratelimit:${ip}`;

    try {
        const current = await redisRL.incr(key);

        // Establece el TTL solo al primer intento
        if (current === 1) {
            await redisRL.expire(key, WINDOW_SECONDS);
        }

        if (current > MAX_ATTEMPTS) {
            const ttl = await redisRL.ttl(key);
            const minutesLeft = Math.ceil(ttl / 60);

            return res.status(429).render('./auth/login', {
                tituloPagina: 'Login',
                mensaje: `⚠️ Demasiados intentos. Espera ${minutesLeft} minuto(s) antes de intentar de nuevo.`
            });
        }

        next();
    } catch (err) {
        // Fail closed: si Redis no está disponible, bloqueamos por precaución.
        // Evita que un atacante sature Redis para saltar el rate limit de login.
        console.error('[RTM-RATE-LIMITER] Redis no disponible, bloqueando por seguridad:', err.message);
        return res.status(503).render('./auth/login', {
            tituloPagina: 'Login',
            mensaje: '⚠️ Servicio temporalmente no disponible. Intenta en unos instantes.'
        });
    }
};

export default loginRateLimiter;
