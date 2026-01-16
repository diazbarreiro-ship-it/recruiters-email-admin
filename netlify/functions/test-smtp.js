// SMTP Test Function
const nodemailer = require('nodemailer');
const { jsonResponse, corsHeaders } = require('./utils');

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return jsonResponse(405, { success: false, error: 'Method not allowed' });
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const {
            smtp_host,
            smtp_port,
            smtp_user,
            smtp_pass,
            from_name,
            from_email,
            test_email
        } = body;

        console.log('[SMTP Test] Testing connection to:', smtp_host, smtp_port);

        if (!smtp_host || !smtp_user || !smtp_pass || !test_email) {
            return jsonResponse(400, {
                success: false,
                error: 'Faltan datos: servidor SMTP, usuario, contraseña y email de prueba son obligatorios'
            });
        }

        // Create transporter with provided settings
        const transporter = nodemailer.createTransport({
            host: smtp_host,
            port: parseInt(smtp_port) || 587,
            secure: parseInt(smtp_port) === 465,
            auth: {
                user: smtp_user,
                pass: smtp_pass
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Test connection first
        console.log('[SMTP Test] Verifying connection...');
        await transporter.verify();
        console.log('[SMTP Test] Connection verified successfully');

        // Send test email
        const mailOptions = {
            from: `"${from_name || 'SMTP Test'}" <${from_email || smtp_user}>`,
            to: test_email,
            subject: '✅ Prueba de SMTP Exitosa',
            text: `¡Felicidades!\n\nEsta es una prueba de configuración SMTP.\n\nServidor: ${smtp_host}\nPuerto: ${smtp_port}\nUsuario: ${smtp_user}\n\nSi recibes este correo, tu configuración SMTP está funcionando correctamente.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #22c55e;">✅ Prueba de SMTP Exitosa</h2>
                    <p>¡Felicidades! Esta es una prueba de configuración SMTP.</p>
                    <table style="background: #f1f5f9; padding: 15px; border-radius: 8px; width: 100%;">
                        <tr><td><strong>Servidor:</strong></td><td>${smtp_host}</td></tr>
                        <tr><td><strong>Puerto:</strong></td><td>${smtp_port || 587}</td></tr>
                        <tr><td><strong>Usuario:</strong></td><td>${smtp_user}</td></tr>
                    </table>
                    <p style="color: #64748b; margin-top: 20px;">Si recibes este correo, tu configuración SMTP está funcionando correctamente.</p>
                </div>
            `
        };

        console.log('[SMTP Test] Sending test email to:', test_email);
        const info = await transporter.sendMail(mailOptions);
        console.log('[SMTP Test] Email sent:', info.messageId);

        return jsonResponse(200, {
            success: true,
            message: `Correo de prueba enviado exitosamente a ${test_email}`,
            messageId: info.messageId
        });

    } catch (error) {
        console.error('[SMTP Test] Error:', error);

        let errorMessage = error.message;
        if (error.code === 'EAUTH') {
            errorMessage = 'Error de autenticación: usuario o contraseña SMTP incorrectos';
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Conexión rechazada: verifica el servidor y puerto SMTP';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Tiempo de espera agotado: el servidor SMTP no responde';
        }

        return jsonResponse(500, {
            success: false,
            error: errorMessage
        });
    }
};
