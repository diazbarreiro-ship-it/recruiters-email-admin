import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const CPANEL_HOST = process.env.CPANEL_HOST || 'chaaj.net';
const CPANEL_USERNAME = process.env.CPANEL_USERNAME || 'chaajnet';
const CPANEL_API_TOKEN = process.env.CPANEL_API_TOKEN;
const CPANEL_PORT = process.env.CPANEL_PORT || 2083;

// Base URL for cPanel UAPI
const getCpanelBaseUrl = () => {
  return `https://${CPANEL_HOST}:${CPANEL_PORT}/execute`;
};

// Headers for cPanel API authentication
const getCpanelHeaders = () => ({
  'Authorization': `cpanel ${CPANEL_USERNAME}:${CPANEL_API_TOKEN}`,
  'Content-Type': 'application/json'
});

// ============================================
// API ENDPOINTS
// ============================================

// Get list of domains
app.get('/api/domains', async (req, res) => {
  try {
    const response = await fetch(
      `${getCpanelBaseUrl()}/DomainInfo/list_domains`,
      { headers: getCpanelHeaders(), method: 'GET' }
    );
    const data = await response.json();

    if (data.status === 1) {
      const domains = [
        data.data.main_domain,
        ...(data.data.addon_domains || []),
        ...(data.data.parked_domains || []),
        ...(data.data.sub_domains || [])
      ].filter(Boolean);

      res.json({ success: true, domains });
    } else {
      res.json({ success: false, error: data.errors?.[0] || 'Failed to fetch domains' });
    }
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get email accounts for a domain
app.get('/api/emails', async (req, res) => {
  try {
    const { domain } = req.query;

    const response = await fetch(
      `${getCpanelBaseUrl()}/Email/list_pops_with_disk${domain ? `?domain=${encodeURIComponent(domain)}` : ''}`,
      { headers: getCpanelHeaders(), method: 'GET' }
    );
    const data = await response.json();

    if (data.status === 1) {
      const emails = data.data.map(email => ({
        email: email.email,
        user: email.user,
        domain: email.domain,
        diskused: email.diskused,
        diskusedpercent: email.diskusedpercent,
        humandiskused: email.humandiskused,
        diskquota: email.diskquota,
        humandiskquota: email.humandiskquota,
        suspended_login: email.suspended_login,
        suspended_incoming: email.suspended_incoming,
        hold_outgoing: email.hold_outgoing
      }));

      res.json({ success: true, emails });
    } else {
      res.json({ success: false, error: data.errors?.[0] || 'Failed to fetch emails' });
    }
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new email account
app.post('/api/emails', async (req, res) => {
  try {
    const { email, password, quota = 1024, domain } = req.body;

    console.log(`[API] Creating email account: ${email}@${domain} (Quota: ${quota}MB)`);

    if (!email || !password || !domain) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and domain are required'
      });
    }

    // Parameters for cPanel UAPI Email::add_pop
    const bodyParams = {
      email: `${email}@${domain}`,
      password: password,
      quota: quota.toString(),
      domain: domain
    };

    // Use POST for state-changing operations in cPanel UAPI
    const response = await fetch(
      `${getCpanelBaseUrl()}/Email/add_pop`,
      {
        headers: getCpanelHeaders(),
        method: 'POST',
        body: JSON.stringify(bodyParams)
      }
    );

    const data = await response.json();

    if (data.status === 1) {
      console.log(`[API] Success: ${email}@${domain} created`);
      res.json({
        success: true,
        message: `Email account ${email}@${domain} created successfully`
      });
    } else {
      const errorMessage = data.errors?.[0] || 'Failed to create email account';
      console.error(`[API] cPanel Error: ${errorMessage}`, data);
      res.json({
        success: false,
        error: errorMessage
      });
    }
  } catch (error) {
    console.error('Error creating email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete email account
app.delete('/api/emails/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { domain } = req.query;

    if (!domain) {
      return res.status(400).json({ success: false, error: 'Domain is required' });
    }

    const bodyParams = {
      email: `${email}@${domain}`,
      domain: domain
    };

    const response = await fetch(
      `${getCpanelBaseUrl()}/Email/delete_pop`,
      {
        headers: getCpanelHeaders(),
        method: 'POST',
        body: JSON.stringify(bodyParams)
      }
    );
    const data = await response.json();

    if (data.status === 1) {
      res.json({
        success: true,
        message: `Email account ${email}@${domain} deleted successfully`
      });
    } else {
      res.json({
        success: false,
        error: data.errors?.[0] || 'Failed to delete email account'
      });
    }
  } catch (error) {
    console.error('Error deleting email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Change email password
app.put('/api/emails/:email/password', async (req, res) => {
  try {
    const { email } = req.params;
    const { password, domain } = req.body;

    if (!password || !domain) {
      return res.status(400).json({
        success: false,
        error: 'Password and domain are required'
      });
    }

    const bodyParams = {
      email: `${email}@${domain}`,
      password: password,
      domain: domain
    };

    const response = await fetch(
      `${getCpanelBaseUrl()}/Email/passwd_pop`,
      {
        headers: getCpanelHeaders(),
        method: 'POST',
        body: JSON.stringify(bodyParams)
      }
    );
    const data = await response.json();

    if (data.status === 1) {
      res.json({
        success: true,
        message: `Password changed for ${email}@${domain}`
      });
    } else {
      res.json({
        success: false,
        error: data.errors?.[0] || 'Failed to change password'
      });
    }
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Change email quota
app.put('/api/emails/:email/quota', async (req, res) => {
  try {
    const { email } = req.params;
    const { quota, domain } = req.body;

    if (quota === undefined || !domain) {
      return res.status(400).json({
        success: false,
        error: 'Quota and domain are required'
      });
    }

    const bodyParams = {
      email: `${email}@${domain}`,
      quota: quota.toString(),
      domain: domain
    };

    const response = await fetch(
      `${getCpanelBaseUrl()}/Email/edit_pop_quota`,
      {
        headers: getCpanelHeaders(),
        method: 'POST',
        body: JSON.stringify(bodyParams)
      }
    );
    const data = await response.json();

    if (data.status === 1) {
      res.json({
        success: true,
        message: `Quota updated for ${email}@${domain}`
      });
    } else {
      res.json({
        success: false,
        error: data.errors?.[0] || 'Failed to update quota'
      });
    }
  } catch (error) {
    console.error('Error updating quota:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Suspend/Unsuspend email
app.put('/api/emails/:email/suspend', async (req, res) => {
  try {
    const { email } = req.params;
    const { suspend, domain } = req.body;

    if (suspend === undefined || !domain) {
      return res.status(400).json({
        success: false,
        error: 'Suspend flag and domain are required'
      });
    }

    const endpoint = suspend ? 'suspend_login' : 'unsuspend_login';
    const bodyParams = {
      email: `${email}@${domain}`
    };

    const response = await fetch(
      `${getCpanelBaseUrl()}/Email/${endpoint}`,
      {
        headers: getCpanelHeaders(),
        method: 'POST',
        body: JSON.stringify(bodyParams)
      }
    );
    const data = await response.json();

    if (data.status === 1) {
      res.json({
        success: true,
        message: `Email ${email}@${domain} ${suspend ? 'suspended' : 'unsuspended'} successfully`
      });
    } else {
      res.json({
        success: false,
        error: data.errors?.[0] || `Failed to ${suspend ? 'suspend' : 'unsuspend'} email`
      });
    }
  } catch (error) {
    console.error('Error suspending email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get email forwarders
app.get('/api/forwarders', async (req, res) => {
  try {
    const { domain } = req.query;

    const response = await fetch(
      `${getCpanelBaseUrl()}/Email/list_forwarders${domain ? `?domain=${encodeURIComponent(domain)}` : ''}`,
      { headers: getCpanelHeaders(), method: 'GET' }
    );
    const data = await response.json();

    if (data.status === 1) {
      res.json({ success: true, forwarders: data.data || [] });
    } else {
      res.json({ success: false, error: data.errors?.[0] || 'Failed to fetch forwarders' });
    }
  } catch (error) {
    console.error('Error fetching forwarders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Send Notification Email
app.post('/api/notifications', async (req, res) => {
  try {
    const { email, password, domain, to } = req.body;

    if (!email || !password || !domain || !to) {
      return res.status(400).json({ success: false, error: 'Faltan campos obligatorios' });
    }

    // Fallback credentials if not in env
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qetgzdxvxbzuyzejbpdn.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFldGd6ZHh2eGJ6dXl6ZWpicGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTkzNTQsImV4cCI6MjA4Mzk5NTM1NH0.eAmDOBkmjqBvE08bHE4Ykq0noNLiFO71zscHD83HzB8';

    if (!supabaseKey) {
      console.error('Missing Supabase Key');
      return res.status(500).json({ success: false, error: 'Server configuration error: Missing Supabase Key.' });
    }

    // 1. Fetch settings from Supabase
    const settingsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/notification_settings?domain=eq.${domain}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    if (!settingsResponse.ok) {
      throw new Error(`Failed to fetch settings: ${settingsResponse.statusText}`);
    }

    const settingsList = await settingsResponse.json();
    const settings = settingsList && settingsList.length > 0 ? settingsList[0] : null;

    if (!settings || !settings.smtp_host) {
      return res.status(400).json({
        success: false,
        error: 'La configuración SMTP no ha sido establecida para este dominio.'
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
      secure: settings.smtp_port == 465, // true for 465, false for other ports
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
      text: body
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Notificación enviada correctamente' });

  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    cpanelHost: CPANEL_HOST,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     📧 Email Admin Panel Server Running                   ║
╠═══════════════════════════════════════════════════════════╣
║  🌐 Local:   http://localhost:${PORT}                       ║
║  📡 cPanel:  ${CPANEL_HOST}:${CPANEL_PORT}                         ║
║  👤 User:    ${CPANEL_USERNAME}                               ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
