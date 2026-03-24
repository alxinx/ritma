import crypto from 'crypto';
import { PacksCreditos, RitmaCoins, Usuarios } from '../models/index.js';
import redisClient from '../config/redis.js';
import { mailCompraAprobada, mailCompraRechazada } from '../helpers/mailCompraCreditos.js';
import dotenv from 'dotenv';
dotenv.config();

const BOLD_KEY_ID     = process.env.BOLD_KEY_ID;
const BOLD_SECRET_KEY = process.env.BOLD_SECRET_KEY;
const BOLD_API_URL    = 'https://integrations.api.bold.co/online/link/v1';
const WEBHOOK_URL     = `${process.env.PAY_WEBHOOK}/webhooks/bold`;
const REDIRECT_URL    = `${process.env.PAY_WEBHOOK}/webhooks/bold`;

// =============================================
// POST /ritmaap/json/creditos/bold/create-payment
// Crea un payment link en Bold y devuelve la URL
// =============================================
export const createBoldPayment = async (req, res) => {
    try {
        const idUsuario = req.usuario.idUsuario;
        const { idPack } = req.body;

        if (!idPack) return res.status(400).json({ ok: false, msg: 'idPack requerido' });

        const pack = await PacksCreditos.findByPk(idPack);
        if (!pack || pack.estado !== 'enable') {
            return res.status(404).json({ ok: false, msg: 'Pack no disponible' });
        }

        // Precio final con descuento
        const valorFinal = pack.descuento > 0
            ? Math.round(pack.valorPack * (1 - pack.descuento / 100))
            : Math.round(pack.valorPack);

        // Referencia única — se usará para recuperar contexto en el webhook
        const referencia = `RITMA-${Date.now()}-${idUsuario.substring(0, 8)}`;

        // Guardar contexto en Redis con TTL de 2 horas
        await redisClient.set(
            `bold:ref:${referencia}`,
            JSON.stringify({
                idUsuario,
                idPack: pack.idPack,
                nroCreditos: pack.nroCreditos,
                valorFinal,
                nombrePack: pack.nombrePack
            }),
            { EX: 7200 }
        );

        // Expiración: 30 minutos desde ahora (en nanosegundos UNIX — Bold lo pide así)
        const expirationNs = (Date.now() + 30 * 60 * 1000) * 1_000_000;

        // Llamada a Bold API
        const boldResponse = await fetch(BOLD_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `x-api-key ${BOLD_KEY_ID}`
            },
            body: JSON.stringify({
                amount_type: 'CLOSE',
                amount: {
                    currency: 'COP',
                    total_amount: valorFinal
                },
                description: `${pack.nombrePack} — ${pack.nroCreditos} Ritma Coins`,
                reference: referencia,
                expiration_date: expirationNs,
                callback_url: WEBHOOK_URL,
                payment_methods: ['CREDIT_CARD']
            })
        });

        const rawText = await boldResponse.text();
        console.log(`Bold API [${boldResponse.status}]:`, rawText.substring(0, 500));

        if (!boldResponse.ok) {
            return res.status(502).json({ ok: false, msg: `Bold API respondió ${boldResponse.status}`, detail: rawText });
        }

        let boldData;
        try {
            boldData = JSON.parse(rawText);
        } catch {
            console.error('Bold: respuesta no es JSON:', rawText);
            return res.status(502).json({ ok: false, msg: 'Respuesta inesperada de Bold' });
        }

        // Bold responde: { payload: { payment_link: "LNK_xxx", url: "https://checkout.bold.co/LNK_xxx" }, errors: [] }
        const payload = boldData.payload || boldData;
        const paymentUrl = payload.url || (payload.payment_link ? `https://checkout.bold.co/${payload.payment_link}` : null);
        if (!paymentUrl) {
            console.error('Bold: no se recibió URL de pago', boldData);
            return res.status(502).json({ ok: false, msg: 'Bold no retornó URL de pago', detail: boldData });
        }

        return res.json({ ok: true, paymentUrl, referencia });

    } catch (error) {
        console.error('createBoldPayment error:', error);
        return res.status(500).json({ ok: false, msg: 'Error interno del servidor' });
    }
};

// =============================================
// POST /webhooks/bold
// Bold llama aquí cuando el pago es confirmado
// =============================================
export const boldWebhook = async (req, res) => {
    try {
        // req.body es Buffer (express.raw) — parseamos a string para firma y a objeto para lógica
        const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
        let payload;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return res.status(400).json({ ok: false, msg: 'Body inválido' });
        }

        // Verificar firma HMAC-SHA256
        const signature = req.headers['x-bold-signature'] || req.headers['x-webhook-signature'];
        if (signature && BOLD_SECRET_KEY) {
            const expected = crypto
                .createHmac('sha256', BOLD_SECRET_KEY)
                .update(rawBody)
                .digest('hex');

            const sigBody = signature.replace(/^sha256=/, '');
            if (!crypto.timingSafeEqual(Buffer.from(sigBody, 'hex'), Buffer.from(expected, 'hex'))) {
                console.warn('Bold webhook: firma inválida — rechazando');
                return res.status(401).json({ ok: false, msg: 'Firma inválida' });
            }
        } else {
            console.warn('Bold webhook: sin cabecera de firma — procesando igual (modo prueba)');
        }

        // Extraer campos — Bold puede enviar en distintas estructuras
        const order  = payload.order || payload;
        const status = (order.status || payload.status || '').toUpperCase();
        const ref    = order.reference || payload.reference;

        console.log(`Bold webhook recibido — status: ${status} | ref: ${ref}`);

        if (!ref) {
            console.error('Bold webhook: sin referencia');
            return res.status(200).json({ ok: true, msg: 'Sin referencia' });
        }

        // Recuperar contexto de Redis
        const cached = await redisClient.get(`bold:ref:${ref}`);
        if (!cached) {
            console.error('Bold webhook: referencia no encontrada en Redis:', ref);
            return res.status(200).json({ ok: true, msg: 'Referencia no encontrada o expirada' });
        }

        const { idUsuario, idPack, nroCreditos, valorFinal, nombrePack } = JSON.parse(cached);

        // Buscar datos del usuario para el email
        const usuario = await Usuarios.findByPk(idUsuario, {
            attributes: ['emailUsuario', 'nombreUsuario']
        });

        const emailData = {
            emailUsuario: usuario?.emailUsuario,
            nombreUsuario: usuario?.nombreUsuario || 'Usuario',
            nombrePack: nombrePack || 'Pack de Créditos',
            nroCreditos,
            valorFinal,
            referencia: ref
        };

        // ── PAGO RECHAZADO ──
        if (status === 'REJECTED' || status === 'DECLINED' || status === 'FAILED') {
            console.log(`✗ Bold: pago rechazado — ref ${ref} — usuario ${idUsuario}`);

            // Enviar email de rechazo (no bloqueante)
            if (usuario?.emailUsuario) {
                mailCompraRechazada(emailData).catch(err =>
                    console.error('Error enviando email de rechazo:', err.message)
                );
            }

            return res.status(200).json({ ok: true, msg: 'Rechazo procesado' });
        }

        // ── PAGO APROBADO ──
        if (status !== 'APPROVED') {
            return res.status(200).json({ ok: true, msg: `Status ${status} ignorado` });
        }

        // Idempotencia — evitar doble acreditación
        const yaProcessado = await redisClient.get(`bold:processed:${ref}`);
        if (yaProcessado) {
            console.log('Bold webhook: ya procesado:', ref);
            return res.status(200).json({ ok: true, msg: 'Ya procesado' });
        }

        // Acreditar créditos
        await RitmaCoins.create({
            idUsuario,
            idPack,
            cantidadComprada: nroCreditos,
            cantidadActual:   nroCreditos,
            valorPack:        valorFinal,
            fechaCompra:      new Date()
        });

        // Marcar como procesado (7 días)
        await redisClient.set(`bold:processed:${ref}`, '1', { EX: 86400 * 7 });
        await redisClient.del(`bold:ref:${ref}`);

        console.log(`✓ Bold: ${nroCreditos} créditos acreditados — usuario ${idUsuario}`);

        // Enviar email de confirmación (no bloqueante)
        if (usuario?.emailUsuario) {
            mailCompraAprobada(emailData).catch(err =>
                console.error('Error enviando email de compra aprobada:', err.message)
            );
        }

        return res.status(200).json({ ok: true });

    } catch (error) {
        console.error('boldWebhook error:', error);
        return res.status(500).json({ ok: false });
    }
};

// =============================================
// GET /webhooks/bold
// Página de estado — Bold redirige al usuario aquí
// También procesa la acreditación (fallback si el webhook POST no llega)
// Query params: bold-order-id, bold-tx-status
// =============================================
export const boldStatusPage = async (req, res) => {
    const rawStatus = req.query['bold-tx-status'] || req.query.bold_tx_status || req.query.status || '';
    const status = rawStatus.toUpperCase();
    const reference = req.query['bold-order-id'] || req.query.bold_order_id || req.query.reference || '';

    let procesado = false;
    let nombrePack = '';
    let nroCreditos = 0;

    if (reference) {
        try {
            const cached = await redisClient.get(`bold:ref:${reference}`);

            if (cached) {
                const data = JSON.parse(cached);
                nombrePack = data.nombrePack || '';
                nroCreditos = data.nroCreditos || 0;

                const usuario = await Usuarios.findByPk(data.idUsuario, {
                    attributes: ['emailUsuario', 'nombreUsuario']
                });

                const emailData = {
                    emailUsuario: usuario?.emailUsuario,
                    nombreUsuario: usuario?.nombreUsuario || 'Usuario',
                    nombrePack: data.nombrePack || 'Pack de Créditos',
                    nroCreditos: data.nroCreditos,
                    valorFinal: data.valorFinal,
                    referencia: reference
                };

                if (status === 'APPROVED') {
                    // Idempotencia — evitar doble acreditación
                    const yaProc = await redisClient.get(`bold:processed:${reference}`);
                    if (!yaProc) {
                        await RitmaCoins.create({
                            idUsuario:        data.idUsuario,
                            idPack:           data.idPack,
                            cantidadComprada: data.nroCreditos,
                            cantidadActual:   data.nroCreditos,
                            valorPack:        data.valorFinal,
                            fechaCompra:      new Date()
                        });

                        await redisClient.set(`bold:processed:${reference}`, '1', { EX: 86400 * 7 });
                        await redisClient.del(`bold:ref:${reference}`);

                        console.log(`✓ Bold (redirect): ${data.nroCreditos} créditos acreditados — usuario ${data.idUsuario}`);

                        if (usuario?.emailUsuario) {
                            mailCompraAprobada(emailData).catch(err =>
                                console.error('Error email compra aprobada:', err.message)
                            );
                        }
                        procesado = true;
                    } else {
                        procesado = true; // ya fue procesado antes
                    }
                }

                if (status === 'REJECTED' || status === 'DECLINED' || status === 'FAILED') {
                    if (usuario?.emailUsuario) {
                        // Solo enviar email de rechazo una vez
                        const yaNotificado = await redisClient.get(`bold:rejected:${reference}`);
                        if (!yaNotificado) {
                            mailCompraRechazada(emailData).catch(err =>
                                console.error('Error email rechazo:', err.message)
                            );
                            await redisClient.set(`bold:rejected:${reference}`, '1', { EX: 86400 });
                        }
                    }
                }
            } else {
                // Referencia no en Redis — puede que ya fue procesada
                const yaProc = await redisClient.get(`bold:processed:${reference}`);
                if (yaProc) procesado = true;
            }
        } catch (err) {
            console.error('boldStatusPage error procesando:', err);
        }
    }

    return res.render('../views/webhooks/bold-status', {
        tituloPagina: 'Estado del Pago',
        status,
        reference,
        procesado,
        nombrePack,
        nroCreditos
    });
};
