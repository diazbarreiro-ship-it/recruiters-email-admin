const nodemailer = require('nodemailer');
const { jsonResponse, corsHeaders, fetchUrl } = require('./utils');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qetgzdxvxbzuyzejbpdn.supabase.co';

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
        const { email, password, domain, to } = JSON.parse(event.body || '{}');

        if (!email || !password || !domain || !to) {
            return jsonResponse(400, { success: false, error: 'Faltan campos obligatorios' });
        }

        // 1. Fetch settings from Supabase
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFldGd6ZHh2eGJ6dXl6ZWpicGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTkzNTQsImV4cCI6MjA4Mzk5NTM1NH0.eAmDOBkmjqBvE08bHE4Ykq0noNLiFO71zscHD83HzB8';

        console.log('[DEBUG] Supabase key present:', !!supabaseKey);
        console.log('[DEBUG] Fetching settings for domain:', domain);
        const settingsResponse = await fetchUrl(
            `${SUPABASE_URL}/rest/v1/notification_settings?domain=eq.${domain}&select=*`,
            {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            }
        );

        const settingsList = await settingsResponse.json();
        const settings = settingsList && settingsList.length > 0 ? settingsList[0] : null;

        if (!settings || !settings.smtp_host) {
            return jsonResponse(400, {
                success: false,
                error: 'La configuración SMTP no ha sido establecida para este dominio en la sección de Configuración.'
            });
        }

        // 2. Prepare Template
        let subject = settings.welcome_subject || 'Bienvenido a tu nueva cuenta de correo';
        let body = settings.welcome_body || 'Hola,\n\nTu cuenta de correo ha sido creada:\n\nEmail: {email}\nContraseña: {password}\n\nPuedes acceder via Webmail en: https://webmail.{domain}';

        // Replace placeholders
        subject = subject.replace(/{email}/g, email).replace(/{domain}/g, domain);
        body = body.replace(/{email}/g, email).replace(/{password}/g, password).replace(/{domain}/g, domain);

        // 3. Setup Transporter
        const transporter = nodemailer.createTransport({
            host: settings.smtp_host,
            port: settings.smtp_port || 587,
            secure: settings.smtp_port == 465,
            auth: {
                user: settings.smtp_user,
                pass: settings.smtp_pass
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // 4. Send Email
        const mailOptions = {
            from: `"${settings.from_name || 'Mail Admin'}" <${settings.from_email || settings.smtp_user}>`,
            to: to,
            subject: subject,
            text: body,
            bcc: settings.notification_email
        };

        await transporter.sendMail(mailOptions);

        return jsonResponse(200, { success: true, message: 'Notificación enviada correctamente' });

    } catch (error) {
        console.error('Notification error:', error);
        return jsonResponse(500, { success: false, error: error.message });
    }
};
