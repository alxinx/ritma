/**
 * securityHeaders.js
 * Middleware equivalente a Helmet — agrega headers HTTP de seguridad.
 * Se aplica globalmente en index.js antes de las rutas.
 */
const securityHeaders = (req, res, next) => {

    // Evita que la app se embeba en iframes (protege contra clickjacking)
    res.setHeader('X-Frame-Options', 'DENY');

    // Evita que el navegador detecte el MIME type por su cuenta
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Activa el filtro XSS del navegador (legacy, pero complementario)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Controla la información enviada en el header Referer
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Deshabilita funcionalidades del navegador que no se usan
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // HSTS: fuerza HTTPS en futuras visitas (solo si el entorno es seguro)
    if (req.secure || process.env.COOKIE_SECURE === 'true') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Elimina el header que expone que el servidor usa Express
    res.removeHeader('X-Powered-By');

    next();
};

export default securityHeaders;
