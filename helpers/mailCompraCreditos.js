import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

function getTransport() {
    return nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });
}

function baseTemplate(content) {
    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>RITMA - Créditos</title>
    <style>@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap');</style>
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;color:#ffffff;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#000000;">
<tr><td align="center" style="padding:40px 0;">
    <table border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse:collapse;background-color:#000000;border:1px solid #1a1a1a;">
        <tr><td align="center" style="padding:40px 0 30px 0;">
            <div style="width:60px;height:60px;border:1px solid rgba(201,218,43,0.3);border-radius:50%;display:inline-block;line-height:60px;text-align:center;">
                <span style="color:#C9DA2B;font-size:24px;">⚡</span>
            </div>
            <h2 style="color:#C9DA2B;font-weight:bold;letter-spacing:5px;margin:20px 0 0 0;font-size:20px;">RITMA</h2>
            <div style="width:40px;height:2px;background-color:#C9DA2B;margin:15px auto;"></div>
        </td></tr>
        ${content}
        <tr><td align="center" style="padding:30px;border-top:1px solid #1a1a1a;background-color:#050505;">
            <p style="color:#C9DA2B;font-weight:bold;font-style:italic;letter-spacing:4px;font-size:18px;margin:0 0 5px 0;">RITMA</p>
            <p style="color:rgba(255,255,255,0.2);font-size:9px;letter-spacing:1px;text-transform:uppercase;">Digital Music Platform</p>
            <p style="color:rgba(255,255,255,0.15);font-size:8px;margin-top:20px;">&copy; ${new Date().getFullYear()} RITMA DIGITAL SYSTEMS. ALL RIGHTS RESERVED.</p>
        </td></tr>
    </table>
</td></tr>
</table>
</body>
</html>`;
}

export const mailCompraAprobada = async (datos) => {
    const { emailUsuario, nombreUsuario, nombrePack, nroCreditos, valorFinal, referencia } = datos;
    const transport = getTransport();

    const content = `
        <tr><td align="center" style="padding:0 40px 30px 40px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.3);padding:30px;">
                <tr><td align="center">
                    <span style="font-size:48px;">✅</span>
                    <h1 style="color:#22C55E;font-weight:bold;text-transform:uppercase;letter-spacing:3px;font-size:22px;margin:15px 0 0 0;">Pago Aprobado</h1>
                </td></tr>
            </table>
        </td></tr>
        <tr><td align="center" style="padding:0 50px 30px 50px;">
            <p style="color:rgba(255,255,255,0.8);font-size:16px;line-height:1.6;margin:0;">
                Hola <strong>${nombreUsuario}</strong>, tu compra de créditos ha sido procesada exitosamente.
            </p>
        </td></tr>
        <tr><td align="center" style="padding:0 50px 30px 50px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0a0a0a;border:1px solid #1a1a1a;">
                <tr>
                    <td style="padding:15px 20px;border-bottom:1px solid #1a1a1a;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Pack</td>
                    <td style="padding:15px 20px;border-bottom:1px solid #1a1a1a;color:#ffffff;font-size:14px;font-weight:bold;text-align:right;">${nombrePack}</td>
                </tr>
                <tr>
                    <td style="padding:15px 20px;border-bottom:1px solid #1a1a1a;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Créditos</td>
                    <td style="padding:15px 20px;border-bottom:1px solid #1a1a1a;color:#C9DA2B;font-size:18px;font-weight:bold;text-align:right;">+${nroCreditos}</td>
                </tr>
                <tr>
                    <td style="padding:15px 20px;border-bottom:1px solid #1a1a1a;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Total Pagado</td>
                    <td style="padding:15px 20px;border-bottom:1px solid #1a1a1a;color:#ffffff;font-size:14px;font-weight:bold;text-align:right;">$${Number(valorFinal).toLocaleString('es-CO')} COP</td>
                </tr>
                <tr>
                    <td style="padding:15px 20px;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Referencia</td>
                    <td style="padding:15px 20px;color:rgba(255,255,255,0.3);font-size:11px;font-family:monospace;text-align:right;">${referencia}</td>
                </tr>
            </table>
        </td></tr>
        <tr><td align="center" style="padding:0 50px 30px 50px;">
            <p style="color:rgba(255,255,255,0.5);font-size:13px;">Tus créditos ya están disponibles para usar. ¡Disfruta el catálogo!</p>
        </td></tr>`;

    await transport.sendMail({
        from: process.env.APP_NAME,
        to: emailUsuario,
        subject: `✅ Compra aprobada — ${nroCreditos} Ritma Coins`,
        text: `Tu compra de ${nroCreditos} créditos (${nombrePack}) fue aprobada. Ref: ${referencia}`,
        html: baseTemplate(content)
    });
};

export const mailCompraRechazada = async (datos) => {
    const { emailUsuario, nombreUsuario, nombrePack, nroCreditos, valorFinal, referencia } = datos;
    const transport = getTransport();

    const content = `
        <tr><td align="center" style="padding:0 40px 30px 40px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);padding:30px;">
                <tr><td align="center">
                    <span style="font-size:48px;">❌</span>
                    <h1 style="color:#EF4444;font-weight:bold;text-transform:uppercase;letter-spacing:3px;font-size:22px;margin:15px 0 0 0;">Pago Rechazado</h1>
                </td></tr>
            </table>
        </td></tr>
        <tr><td align="center" style="padding:0 50px 30px 50px;">
            <p style="color:rgba(255,255,255,0.8);font-size:16px;line-height:1.6;margin:0;">
                Hola <strong>${nombreUsuario}</strong>, lamentamos informarte que tu pago no fue procesado.
            </p>
        </td></tr>
        <tr><td align="center" style="padding:0 50px 30px 50px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0a0a0a;border:1px solid #1a1a1a;">
                <tr>
                    <td style="padding:15px 20px;border-bottom:1px solid #1a1a1a;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Pack intentado</td>
                    <td style="padding:15px 20px;border-bottom:1px solid #1a1a1a;color:#ffffff;font-size:14px;text-align:right;">${nombrePack}</td>
                </tr>
                <tr>
                    <td style="padding:15px 20px;border-bottom:1px solid #1a1a1a;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Monto</td>
                    <td style="padding:15px 20px;border-bottom:1px solid #1a1a1a;color:#ffffff;font-size:14px;text-align:right;">$${Number(valorFinal).toLocaleString('es-CO')} COP</td>
                </tr>
                <tr>
                    <td style="padding:15px 20px;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Referencia</td>
                    <td style="padding:15px 20px;color:rgba(255,255,255,0.3);font-size:11px;font-family:monospace;text-align:right;">${referencia}</td>
                </tr>
            </table>
        </td></tr>
        <tr><td align="center" style="padding:0 50px 30px 50px;">
            <p style="color:rgba(255,255,255,0.5);font-size:13px;">Verifica los datos de tu método de pago e intenta nuevamente. Si el problema persiste, contacta a tu banco.</p>
        </td></tr>`;

    await transport.sendMail({
        from: process.env.APP_NAME,
        to: emailUsuario,
        subject: `❌ Pago rechazado — ${nombrePack}`,
        text: `Tu pago por ${nombrePack} ($${valorFinal} COP) fue rechazado. Ref: ${referencia}`,
        html: baseTemplate(content)
    });
};
