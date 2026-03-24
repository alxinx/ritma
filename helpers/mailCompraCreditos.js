import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Envía email de confirmación de compra de créditos (aprobada)
 * @param {{ emailUsuario, nombreUsuario, nombrePack, nroCreditos, valorFinal, referencia }} datos
 */
const mailCompraAprobada = async ({ emailUsuario, nombreUsuario, nombrePack, nroCreditos, valorFinal, referencia }) => {
    const transport = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });

    const valorFormateado = `$${Number(valorFinal).toLocaleString('es-CO')}`;
    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    await transport.sendMail({
        from: process.env.APP_NAME,
        to: emailUsuario,
        subject: 'RITMA — Compra de Créditos Exitosa',
        text: `Tu compra de ${nroCreditos} créditos (${nombrePack}) por ${valorFormateado} COP ha sido procesada exitosamente. Referencia: ${referencia}`,
        html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>RITMA - Compra Exitosa</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Space Grotesk', Helvetica, Arial, sans-serif; color: #ffffff;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #000000;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #000000; border: 1px solid #1a1a1a;">

                    <!-- HEADER -->
                    <tr>
                        <td align="center" style="padding: 40px 0 30px 0;">
                            <div style="width: 60px; height: 60px; border: 1px solid rgba(201, 218, 43, 0.3); border-radius: 50%; display: inline-block; line-height: 60px; text-align: center;">
                                <span style="color: #C9DA2B; font-size: 24px;">&#9889;</span>
                            </div>
                            <h2 style="color: #C9DA2B; font-weight: bold; letter-spacing: 5px; margin: 20px 0 0 0; font-size: 20px;">RITMA</h2>
                            <div style="width: 40px; height: 2px; background-color: #C9DA2B; margin: 15px auto;"></div>
                        </td>
                    </tr>

                    <!-- TITULO -->
                    <tr>
                        <td align="center" style="padding: 0 40px 30px 40px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.4); padding: 30px;">
                                <tr>
                                    <td align="center">
                                        <span style="color: #22c55e; font-size: 36px;">&#10003;</span>
                                        <h1 style="color: #22c55e; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; font-size: 22px; margin: 10px 0 0 0;">Compra Exitosa</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- TEXTO -->
                    <tr>
                        <td align="center" style="padding: 0 50px 15px 50px;">
                            <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.7; margin: 0; text-align: center;">
                                &iexcl;Hola <strong>${nombreUsuario}</strong>! Tu recarga de cr&eacute;ditos ha sido procesada exitosamente.
                            </p>
                        </td>
                    </tr>

                    <!-- DETALLE DE COMPRA -->
                    <tr>
                        <td align="center" style="padding: 20px 60px 30px 60px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #C9DA2B; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 15px 0;">Detalle de la Compra</p>

                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Pack</span>
                                                </td>
                                                <td align="right" style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: #ffffff; font-size: 14px; font-weight: bold;">${nombrePack}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Cr&eacute;ditos</span>
                                                </td>
                                                <td align="right" style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: #C9DA2B; font-size: 18px; font-weight: bold;">+${Number(nroCreditos).toLocaleString('es-CO')}</span>
                                                    <span style="color: rgba(255,255,255,0.3); font-size: 10px;"> R$</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Valor Pagado</span>
                                                </td>
                                                <td align="right" style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: #ffffff; font-size: 14px; font-weight: bold;">${valorFormateado} COP</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Fecha</span>
                                                </td>
                                                <td align="right" style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: rgba(255,255,255,0.7); font-size: 12px;">${fecha}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <span style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Referencia</span>
                                                </td>
                                                <td align="right" style="padding: 10px 0;">
                                                    <span style="color: rgba(255,255,255,0.5); font-size: 11px; font-family: monospace;">${referencia}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- STATUS -->
                    <tr>
                        <td align="center" style="padding: 0 60px 30px 60px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a; border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 8px;">
                                <tr>
                                    <td style="padding: 20px 25px;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="color: #22c55e; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Status</td>
                                                <td align="right" style="color: #22c55e; font-size: 14px; font-weight: bold;">APROBADA</td>
                                            </tr>
                                        </table>
                                        <table border="0" cellpadding="0" cellspacing="4" width="100%" style="margin-top: 10px;">
                                            <tr>
                                                <td style="width: 25%; height: 6px; background-color: #22c55e; border-radius: 3px;"></td>
                                                <td style="width: 25%; height: 6px; background-color: #22c55e; border-radius: 3px;"></td>
                                                <td style="width: 25%; height: 6px; background-color: #22c55e; border-radius: 3px;"></td>
                                                <td style="width: 25%; height: 6px; background-color: #22c55e; border-radius: 3px;"></td>
                                            </tr>
                                        </table>
                                        <p style="color: rgba(255,255,255,0.35); font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; margin: 10px 0 0 0;">
                                            &#9989; Cr&eacute;ditos acreditados a tu cuenta
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- INFO -->
                    <tr>
                        <td align="center" style="padding: 0 50px 35px 50px;">
                            <p style="color: rgba(255,255,255,0.35); font-size: 11px; line-height: 1.6; margin: 0; text-align: center;">
                                Los cr&eacute;ditos ya est&aacute;n disponibles en tu cuenta y nunca expiran. Puedes usarlos para descargar contenido multimedia en RITMA.
                            </p>
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td align="center" style="padding: 30px; border-top: 1px solid #1a1a1a; background-color: #050505;">
                            <p style="color: #C9DA2B; font-weight: bold; font-style: italic; letter-spacing: 4px; font-size: 18px; margin: 0 0 5px 0;">SWING LATINO</p>
                            <p style="color: rgba(255,255,255,0.2); font-size: 9px; letter-spacing: 1px; text-transform: uppercase;">Private Tech Membership Network</p>
                            <table border="0" cellpadding="0" cellspacing="0" width="160" style="margin-top: 20px;">
                                <tr>
                                    <td style="width: 10px; height: 4px; background-color: #C9DA2B; padding: 1px;"></td>
                                    <td style="width: 10px; height: 4px; background-color: #C9DA2B; padding: 1px;"></td>
                                    <td style="width: 10px; height: 4px; background-color: #C9DA2B; padding: 1px;"></td>
                                    <td style="width: 10px; height: 4px; background-color: #C9DA2B; padding: 1px;"></td>
                                    <td style="width: 10px; height: 4px; background-color: #C9DA2B; padding: 1px;"></td>
                                    <td style="width: 10px; height: 4px; background-color: #C9DA2B; padding: 1px;"></td>
                                </tr>
                            </table>
                            <p style="color: rgba(255,255,255,0.15); font-size: 8px; margin-top: 20px;">&copy; ${new Date().getFullYear()} RITMA DIGITAL SYSTEMS. ALL RIGHTS RESERVED.</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
    });
};

/**
 * Envía email de notificación de pago rechazado
 * @param {{ emailUsuario, nombreUsuario, nombrePack, nroCreditos, valorFinal, referencia }} datos
 */
const mailCompraRechazada = async ({ emailUsuario, nombreUsuario, nombrePack, nroCreditos, valorFinal, referencia }) => {
    const transport = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });

    const valorFormateado = `$${Number(valorFinal).toLocaleString('es-CO')}`;
    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    await transport.sendMail({
        from: process.env.APP_NAME,
        to: emailUsuario,
        subject: 'RITMA — Pago Rechazado',
        text: `Tu pago de ${valorFormateado} COP por ${nombrePack} (${nroCreditos} créditos) fue rechazado. Referencia: ${referencia}. Intenta de nuevo o usa otro método de pago.`,
        html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>RITMA - Pago Rechazado</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Space Grotesk', Helvetica, Arial, sans-serif; color: #ffffff;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #000000;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #000000; border: 1px solid #1a1a1a;">

                    <!-- HEADER -->
                    <tr>
                        <td align="center" style="padding: 40px 0 30px 0;">
                            <div style="width: 60px; height: 60px; border: 1px solid rgba(201, 218, 43, 0.3); border-radius: 50%; display: inline-block; line-height: 60px; text-align: center;">
                                <span style="color: #C9DA2B; font-size: 24px;">&#9889;</span>
                            </div>
                            <h2 style="color: #C9DA2B; font-weight: bold; letter-spacing: 5px; margin: 20px 0 0 0; font-size: 20px;">RITMA</h2>
                            <div style="width: 40px; height: 2px; background-color: #C9DA2B; margin: 15px auto;"></div>
                        </td>
                    </tr>

                    <!-- TITULO -->
                    <tr>
                        <td align="center" style="padding: 0 40px 30px 40px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.4); padding: 30px;">
                                <tr>
                                    <td align="center">
                                        <span style="color: #ef4444; font-size: 36px;">&#10007;</span>
                                        <h1 style="color: #ef4444; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; font-size: 22px; margin: 10px 0 0 0;">Pago Rechazado</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- TEXTO -->
                    <tr>
                        <td align="center" style="padding: 0 50px 15px 50px;">
                            <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.7; margin: 0; text-align: center;">
                                Hola <strong>${nombreUsuario}</strong>, lamentablemente tu pago no fue procesado. No se realiz&oacute; ning&uacute;n cobro a tu tarjeta.
                            </p>
                        </td>
                    </tr>

                    <!-- DETALLE -->
                    <tr>
                        <td align="center" style="padding: 20px 60px 30px 60px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #ef4444; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 15px 0;">Detalle del Intento</p>

                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Pack</span>
                                                </td>
                                                <td align="right" style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: #ffffff; font-size: 14px; font-weight: bold;">${nombrePack}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Cr&eacute;ditos</span>
                                                </td>
                                                <td align="right" style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: rgba(255,255,255,0.5); font-size: 14px;">${Number(nroCreditos).toLocaleString('es-CO')} R$</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Valor</span>
                                                </td>
                                                <td align="right" style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: rgba(255,255,255,0.5); font-size: 14px;">${valorFormateado} COP</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <span style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Referencia</span>
                                                </td>
                                                <td align="right" style="padding: 10px 0;">
                                                    <span style="color: rgba(255,255,255,0.5); font-size: 11px; font-family: monospace;">${referencia}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- STATUS -->
                    <tr>
                        <td align="center" style="padding: 0 60px 30px 60px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px;">
                                <tr>
                                    <td style="padding: 20px 25px;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="color: #ef4444; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Status</td>
                                                <td align="right" style="color: #ef4444; font-size: 14px; font-weight: bold;">RECHAZADA</td>
                                            </tr>
                                        </table>
                                        <p style="color: rgba(255,255,255,0.35); font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; margin: 10px 0 0 0;">
                                            &#10060; No se realiz&oacute; ning&uacute;n cobro
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- SUGERENCIA -->
                    <tr>
                        <td align="center" style="padding: 0 50px 35px 50px;">
                            <p style="color: rgba(255,255,255,0.35); font-size: 11px; line-height: 1.6; margin: 0; text-align: center;">
                                Puedes intentar de nuevo con otra tarjeta o m&eacute;todo de pago desde la secci&oacute;n de cr&eacute;ditos en tu panel.
                            </p>
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td align="center" style="padding: 30px; border-top: 1px solid #1a1a1a; background-color: #050505;">
                            <p style="color: #C9DA2B; font-weight: bold; font-style: italic; letter-spacing: 4px; font-size: 18px; margin: 0 0 5px 0;">SWING LATINO</p>
                            <p style="color: rgba(255,255,255,0.2); font-size: 9px; letter-spacing: 1px; text-transform: uppercase;">Private Tech Membership Network</p>
                            <table border="0" cellpadding="0" cellspacing="0" width="160" style="margin-top: 20px;">
                                <tr>
                                    <td style="width: 10px; height: 4px; background-color: #C9DA2B; padding: 1px;"></td>
                                    <td style="width: 10px; height: 4px; background-color: #C9DA2B; padding: 1px;"></td>
                                    <td style="width: 10px; height: 4px; background-color: #C9DA2B; padding: 1px;"></td>
                                    <td style="width: 10px; height: 4px; background-color: #C9DA2B; padding: 1px;"></td>
                                    <td style="width: 10px; height: 4px; background-color: #C9DA2B; padding: 1px;"></td>
                                    <td style="width: 10px; height: 4px; background-color: #C9DA2B; padding: 1px;"></td>
                                </tr>
                            </table>
                            <p style="color: rgba(255,255,255,0.15); font-size: 8px; margin-top: 20px;">&copy; ${new Date().getFullYear()} RITMA DIGITAL SYSTEMS. ALL RIGHTS RESERVED.</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
    });
};

export { mailCompraAprobada, mailCompraRechazada };
