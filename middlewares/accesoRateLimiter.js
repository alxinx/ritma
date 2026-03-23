import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisRL = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 3000,
});

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 30 * 60; // 30 minutos

const accesoRateLimiter = async (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const key = `rtm:acceso:ratelimit:${ip}`;

    try {
        const current = await redisRL.incr(key);

        if (current === 1) {
            await redisRL.expire(key, WINDOW_SECONDS);
        }

        if (current > MAX_ATTEMPTS) {
            // Error silencioso — renderiza éxito igual para no dar pistas
            return res.status(200).render('../views/layout/accesoAfter', {
                tituloPagina: 'RITMA | La Plataforma #1 para DJs'
            });
        }

        next();
    } catch (err) {
        // Fail closed: bloqueamos silenciosamente igual que cuando se excede el límite.
        console.error('[RTM-ACCESO-RATE-LIMITER] Redis no disponible, bloqueando por seguridad:', err.message);
        return res.status(200).render('../views/layout/accesoAfter', {
            tituloPagina: 'RITMA | La Plataforma #1 para DJs'
        });
    }
};

export default accesoRateLimiter;
