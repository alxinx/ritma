import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const mailBienvenida = async ({ emailUsuario, nombreUsuario, password }) => {
    const transport = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });

    await transport.sendMail({
        from: process.env.APP_NAME,
        to: emailUsuario,
        subject: 'RITMA — Acceso Aprobado',
        text: `Tu solicitud ha sido aprobada. Usuario: ${emailUsuario} / Contraseña: tu número de WhatsApp`,
        html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>RITMA - Acceso Aprobado</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Space Grotesk', Helvetica, Arial, sans-serif; color: #ffffff;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #000000;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #000000; border: 1px solid #1a1a1a;">

                    <!-- HEADER: Logo RITMA -->
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
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(201, 218, 43, 0.05); border: 1px solid #C9DA2B; padding: 30px;">
                                <tr>
                                    <td align="center">
                                        <h1 style="color: #C9DA2B; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; font-size: 26px; margin: 0;">Acceso Aprobado</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- TEXTO -->
                    <tr>
                        <td align="center" style="padding: 0 50px 15px 50px;">
                            <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.7; margin: 0; text-align: center;">
                                &iexcl;Felicitaciones <strong>${nombreUsuario}</strong>! Tu solicitud ha sido aprobada. Ya puedes acceder al panel de usuario de RITMA.
                            </p>
                        </td>
                    </tr>

                    <!-- CREDENCIALES -->
                    <tr>
                        <td align="center" style="padding: 20px 60px 30px 60px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #C9DA2B; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 15px 0;">Tus Credenciales</p>

                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Usuario</span>
                                                </td>
                                                <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                    <span style="color: #ffffff; font-size: 14px; font-weight: bold;">${emailUsuario}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Contrase&ntilde;a</span>
                                                </td>
                                                <td align="right" style="padding: 8px 0;">
                                                    <span style="color: #C9DA2B; font-size: 14px; font-weight: bold;">Tu n&uacute;mero de WhatsApp</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- WARNING -->
                    <tr>
                        <td align="center" style="padding: 0 50px 35px 50px;">
                            <p style="color: rgba(255,255,255,0.35); font-size: 11px; line-height: 1.6; margin: 0; text-align: center;">
                                Te recomendamos cambiar tu contrase&ntilde;a despu&eacute;s de tu primer inicio de sesi&oacute;n.
                            </p>
                        </td>
                    </tr>

                    <!-- STATUS CARD -->
                    <tr>
                        <td align="center" style="padding: 0 60px 30px 60px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a; border: 1px solid rgba(201, 218, 43, 0.2); border-radius: 8px; padding: 20px;">
                                <tr>
                                    <td style="padding: 20px 25px 5px 25px;">
                                        <p style="color: #C9DA2B; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0;">Status</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 25px 15px 25px;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="color: #ffffff; font-size: 16px; font-weight: bold;">Acceso Concedido</td>
                                                <td align="right" style="color: #C9DA2B; font-size: 16px; font-weight: bold;">100%</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <!-- Progress Bar -->
                                <tr>
                                    <td style="padding: 0 25px 15px 25px;">
                                        <table border="0" cellpadding="0" cellspacing="4" width="100%">
                                            <tr>
                                                <td style="width: 25%; height: 6px; background-color: #C9DA2B; border-radius: 3px;"></td>
                                                <td style="width: 25%; height: 6px; background-color: #C9DA2B; border-radius: 3px;"></td>
                                                <td style="width: 25%; height: 6px; background-color: #C9DA2B; border-radius: 3px;"></td>
                                                <td style="width: 25%; height: 6px; background-color: #C9DA2B; border-radius: 3px;"></td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 0 25px 20px 25px;">
                                        <p style="color: rgba(255,255,255,0.35); font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0;">
                                            &#9989; Cuenta activa y lista para usar
                                        </p>
                                    </td>
                                </tr>
                            </table>
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

export { mailBienvenida };
