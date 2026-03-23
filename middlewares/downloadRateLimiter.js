import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisRL = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 3000,
});

const LIMIT_PER_MINUTE = parseInt(process.env.ALLOW_DOWNLOAD_PER_MINUTE) || 20;
const WARNING_THRESHOLD = Math.floor(LIMIT_PER_MINUTE * 0.75); // 75% del límite = advertencia
const WINDOW_SECONDS = 60;

// Penalizaciones escalonadas
const PENALTIES = [
    { duration: 10 * 60, label: '10 minutos' },   // 1ra infracción
    { duration: 30 * 60, label: '30 minutos' },   // 2da infracción
    { duration: 24 * 60 * 60, label: '24 horas' } // 3ra infracción
];

const downloadRateLimiter = async (req, res, next) => {
    const userId = req.usuario?.idUsuario;
    if (!userId) return next();

    // Admins exentos del rate limit
    if (req.usuario?.permisos === 'ADMIN') return next();

    const keyCount = `rtm:dl:count:${userId}`;       // descargas en ventana de 1 min
    const keyBan = `rtm:dl:ban:${userId}`;            // ban activo
    const keyStrikes = `rtm:dl:strikes:${userId}`;    // infracciones en 24h

    try {
        // 1. ¿Está baneado?
        const banData = await redisRL.get(keyBan);
        if (banData) {
            const ban = JSON.parse(banData);
            const ttl = await redisRL.ttl(keyBan);
            const minutosRestantes = Math.ceil(ttl / 60);

            // Mensaje según el nivel de strike
            if (ban.strike >= 3) {
                return res.status(429).json({
                    ok: false,
                    blocked: true,
                    msg: `Lamentablemente no podrás volver a descargar más archivos hoy. Comunícate con ${process.env.APP_EMAIL || 'soporte@ritma.co'} para más información.`
                });
            }

            return res.status(429).json({
                ok: false,
                blocked: true,
                msg: `Tus descargas están suspendidas por ${ban.label}. Tiempo restante: ${minutosRestantes} minuto${minutosRestantes !== 1 ? 's' : ''}.`
            });
        }

        // 2. Incrementar contador de ventana
        const current = await redisRL.incr(keyCount);
        if (current === 1) {
            await redisRL.expire(keyCount, WINDOW_SECONDS);
        }

        // 3. ¿Excedió el límite? → Ban escalonado
        if (current > LIMIT_PER_MINUTE) {
            // Obtener strikes actuales (infracciones en 24h)
            let strikes = parseInt(await redisRL.get(keyStrikes)) || 0;
            strikes++;
            await redisRL.setEx(keyStrikes, 24 * 60 * 60, String(strikes));

            // Determinar penalización
            const penaltyIndex = Math.min(strikes - 1, PENALTIES.length - 1);
            const penalty = PENALTIES[penaltyIndex];

            // Aplicar ban
            await redisRL.setEx(keyBan, penalty.duration, JSON.stringify({
                strike: strikes,
                label: penalty.label,
                timestamp: Date.now()
            }));

            // Reset contador
            await redisRL.del(keyCount);

            // Mensaje según strike
            if (strikes >= 3) {
                return res.status(429).json({
                    ok: false,
                    blocked: true,
                    msg: `Lamentablemente no podrás volver a descargar más archivos hoy. Comunícate con ${process.env.APP_EMAIL || 'soporte@ritma.co'} para más información.`
                });
            }

            if (strikes === 2) {
                return res.status(429).json({
                    ok: false,
                    blocked: true,
                    msg: `Sospecho que eres un bot. Si continúas con ese ritmo de descargas, por seguridad de tus créditos suspenderé las descargas por 24 horas.`
                });
            }

            return res.status(429).json({
                ok: false,
                blocked: true,
                msg: `Has excedido el límite de descargas. Tus descargas están suspendidas por ${penalty.label}.`
            });
        }

        // 4. ¿Está cerca del límite? → Advertencia en header
        if (current >= WARNING_THRESHOLD) {
            const strikes = parseInt(await redisRL.get(keyStrikes)) || 0;
            const remaining = LIMIT_PER_MINUTE - current;

            let warningMsg;
            if (strikes >= 1) {
                warningMsg = `Sospecho que eres un bot. Si continúas con ese ritmo de descargas, por seguridad de tus créditos suspenderé las descargas por 24 horas.`;
            } else {
                const nextPenalty = PENALTIES[Math.min(strikes, PENALTIES.length - 1)];
                warningMsg = `Cuidado, de seguir así podría suspender tu actividad por ${nextPenalty.label}. Te quedan ${remaining} descarga${remaining !== 1 ? 's' : ''} este minuto.`;
            }

            res.set('X-Download-Warning', warningMsg);
            res.locals.downloadWarning = warningMsg;
        }

        // 5. Todo OK → continuar
        res.set('X-Download-Remaining', String(LIMIT_PER_MINUTE - current));
        next();

    } catch (err) {
        // Fail closed: si Redis no está disponible, bloqueamos la descarga.
        // Es preferible un error temporal a permitir descargas ilimitadas.
        console.error('[RTM-DL-RATE-LIMITER] Redis no disponible, bloqueando por seguridad:', err.message);
        return res.status(503).json({
            ok: false,
            blocked: true,
            msg: 'Servicio temporalmente no disponible. Intenta en unos instantes.'
        });
    }
};

export default downloadRateLimiter;
