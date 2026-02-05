import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
//CONFIGURACION CLIENTE CORREO. 
const mailRecovery = async(datos)=>{
    var transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
    });

    const {emailUsuario, token} = datos

    await transport.sendMail({
        from : process.env.APP_NAME,
        to : emailUsuario,
        subject : `Recuperar Password `,
        text :  `Recuperación de contraseña`,
        html : `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>RITMA - Acceso</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Space Grotesk', Helvetica, Arial, sans-serif; color: #ffffff;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #000000;">
        <tr>
            <td align="center" style="padding: 40px 0 40px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #000000; border: 1px solid #1a1a1a; position: relative;">
                    <tr>
                        <td align="center" style="padding: 40px 0 30px 0;">
                            <div style="width: 60px; height: 60px; border: 1px solid rgba(201, 218, 43, 0.3); border-radius: 50%; display: inline-block; line-height: 60px; text-align: center;">
                                <span style="color: #C9DA2B; font-size: 24px;">⚡</span>
                            </div>
                            <h2 style="color: #C9DA2B; font-weight: bold; letter-spacing: 5px; margin: 20px 0 0 0; font-size: 20px;">RITMA</h2>
                            <div style="width: 40px; height: 2px; background-color: #C9DA2B; margin: 15px auto;"></div>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 40px 40px 40px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(201, 218, 43, 0.05); border: 1px solid #C9DA2B; padding: 30px;">
                                <tr>
                                    <td align="center">
                                        <h1 style="color: #C9DA2B; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; font-size: 24px; margin: 0;">Restablecer Acceso</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 60px 30px 60px;">
                            <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; margin: 0;">
                                Se ha solicitado un cambio de contraseña para tu perfil técnico en la red privada.
                            </p>
                            <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 20px;">
                                Si no has solicitado este cambio, ignora este mensaje o contacta a seguridad.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 60px 40px 60px;">
                            <a href="${process.env.APP_ADDRESS_PRODUCTION}/app/recovery/${token}" style="background-color: #C9DA2B; color: #000000; padding: 18px 35px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; display: inline-block;">
                                Restablecer Contraseña
                            </a>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 60px 40px 60px;">
                            <p style="color: rgba(255,255,255,0.3); font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Security Token</p>
                            <div style="background-color: #050505; border: 1px solid rgba(255,255,255,0.1); padding: 10px; width: 200px;">
                                <code style="color: #C9DA2B; font-family: monospace; font-size: 12px;">SEC_TOKEN_${token.substring(0,8).toUpperCase()}</code>
                            </div>
                        </td>
                    </tr>

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
                                    <td style="width: 10px; height: 4px; background-color: #1a1a1a; padding: 1px;"></td>
                                    <td style="width: 10px; height: 4px; background-color: #1a1a1a; padding: 1px;"></td>
                                </tr>
                            </table>
                            
                            <p style="color: rgba(255,255,255,0.15); font-size: 8px; margin-top: 20px;">© ${new Date().getFullYear()} RITMA DIGITAL SYSTEMS. ALL RIGHTS RESERVED.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`
    })




}


export { mailRecovery};