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

// Helper to extract username if full email is provided
const getUsername = (email) => {
  if (!email) return '';
  return email.split('@')[0];
};

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
        user: email.user || email.email.split('@')[0],
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
    const { email: rawEmail, password, quota = 1024, domain } = req.body;
    const email = getUsername(rawEmail);

    console.log(`[API] Creating email: ${email}@${domain}`);

    if (!email || !password || !domain) {
      return res.status(400).json({ success: false, error: 'Email, password, and domain are required' });
    }

    // Build request payload
    const payload = {
      email,
      password,
      quota: quota.toString(),
      domain
    };

    console.log(`[API] Creating account with payload:`, { ...payload, password: '***' });

    const response = await fetch(
      `${getCpanelBaseUrl()}/Email/add_pop`,
      {
        headers: getCpanelHeaders(),
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (data.status === 1) {
      res.json({ success: true, message: `Email account ${email}@${domain} created successfully` });
    } else {
      res.json({ success: false, error: data.errors?.[0] || 'Failed to create email account' });
    }
  } catch (error) {
    console.error('Error creating email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete email account
app.delete('/api/emails/:email(*)', async (req, res) => {
  try {
    const rawEmail = req.params.email;
    const { domain } = req.query;

    console.log(`[SERVER] Delete request for: '${rawEmail}' domain: '${domain}'`);

    if (!domain) {
      return res.status(400).json({ success: false, error: 'Domain is required' });
    }

    const email = getUsername(rawEmail);
    if (!email) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // Try sending parameters in BOTH body and URL to be absolutely sure
    const params = new URLSearchParams({ email, domain });
    const url = `${getCpanelBaseUrl()}/Email/delete_pop?${params.toString()}`;

    console.log(`[API] Deleting account via cPanel. User: '${email}', Domain: '${domain}'`);

    const response = await fetch(url, {
      method: 'POST',
      headers: getCpanelHeaders(),
      body: JSON.stringify({ email, domain }) // Also send as JSON body since header is application/json
    });

    const data = await response.json();
    console.log('[API] cPanel result:', JSON.stringify(data));

    if (data.status === 1) {
      res.json({ success: true, message: `Email account ${email}@${domain} deleted successfully` });
    } else {
      const errorMsg = data.errors?.[0] || 'Failed to delete email account';
      console.error('[API] cPanel Error Details:', data.errors);

      // If we see the empty name error, it means the param didn't reach correctly
      if (errorMsg.includes('named “”') || errorMsg.includes('named ""')) {
        console.warn('[API] Detected "empty name" error. Retrying with different param names...');
        // Fallback: try different param name or full email
        const retryParams = new URLSearchParams({ email: `${email}@${domain}`, domain });
        const retryResponse = await fetch(`${getCpanelBaseUrl()}/Email/delete_pop?${retryParams.toString()}`, {
          method: 'POST',
          headers: { 'Authorization': `cpanel ${CPANEL_USERNAME}:${CPANEL_API_TOKEN}` }
        });
        const retryData = await retryResponse.json();
        if (retryData.status === 1) {
          return res.json({ success: true, message: `Deleted successfully (via fallback)` });
        }
      }

      res.json({ success: false, error: errorMsg });
    }
  } catch (error) {
    console.error('Error deleting email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Change email password
app.put('/api/emails/:email/password', async (req, res) => {
  try {
    const rawEmail = req.params.email;
    const { password, domain } = req.body;
    const email = getUsername(rawEmail);

    if (!password || !domain) {
      return res.status(400).json({
        success: false,
        error: 'Password and domain are required'
      });
    }

    const payload = { email, password, domain };
    console.log(`[API] Changing password for ${email}@${domain}`);

    const response = await fetch(
      `${getCpanelBaseUrl()}/Email/passwd_pop`,
      {
        headers: getCpanelHeaders(),
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
    const data = await response.json();

    if (data.status === 1) {
      res.json({ success: true, message: `Password changed for ${email}@${domain}` });
    } else {
      res.json({ success: false, error: data.errors?.[0] || 'Failed to change password' });
    }
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Change email quota
app.put('/api/emails/:email/quota', async (req, res) => {
  try {
    const rawEmail = req.params.email;
    const { quota, domain } = req.body;
    const email = getUsername(rawEmail);

    if (quota === undefined || !domain) {
      return res.status(400).json({
        success: false,
        error: 'Quota and domain are required'
      });
    }

    const params = new URLSearchParams({ email, quota: quota.toString(), domain });

    const response = await fetch(
      `${getCpanelBaseUrl()}/Email/edit_pop_quota?${params.toString()}`,
      { headers: getCpanelHeaders(), method: 'POST' }
    );
    const data = await response.json();

    if (data.status === 1) {
      res.json({ success: true, message: `Quota updated for ${email}@${domain}` });
    } else {
      res.json({ success: false, error: data.errors?.[0] || 'Failed to update quota' });
    }
  } catch (error) {
    console.error('Error updating quota:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Suspend/Unsuspend email
app.put('/api/emails/:email/suspend', async (req, res) => {
  try {
    const rawEmail = req.params.email;
    const { suspend, domain } = req.body;
    const email = getUsername(rawEmail);
    const fullEmail = `${email}@${domain}`;

    if (suspend === undefined || !domain) {
      return res.status(400).json({
        success: false,
        error: 'Suspend flag and domain are required'
      });
    }

    const endpoint = suspend ? 'suspend_login' : 'unsuspend_login';
    const params = new URLSearchParams({ email: fullEmail });

    const response = await fetch(
      `${getCpanelBaseUrl()}/Email/${endpoint}?${params.toString()}`,
      { headers: getCpanelHeaders(), method: 'POST' }
    );
    const data = await response.json();

    if (data.status === 1) {
      res.json({ success: true, message: `Email ${fullEmail} ${suspend ? 'suspended' : 'unsuspended'} successfully` });
    } else {
      res.json({ success: false, error: data.errors?.[0] || `Failed to ${suspend ? 'suspend' : 'unsuspend'} email` });
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
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!email || !password || !domain || !to) {
      return res.status(400).json({ success: false, error: 'Faltan campos obligatorios' });
    }

    if (!SUPABASE_URL || !supabaseKey) {
      console.error('Missing Supabase URL or Key');
      return res.status(500).json({ success: false, error: 'Server configuration error: Missing Supabase credentials.' });
    }

    const settingsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/notification_settings?domain=eq.${domain}&select=*`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    );

    if (!settingsResponse.ok) {
      throw new Error(`Failed to fetch settings: ${settingsResponse.statusText}`);
    }

    const settingsList = await settingsResponse.json();
    const settings = settingsList?.[0];

    if (!settings?.smtp_host) {
      return res.status(400).json({ success: false, error: 'La configuración SMTP no ha sido establecida para este dominio.' });
    }

    let subject = settings.welcome_subject || 'Bienvenido a tu nueva cuenta de correo';
    let body = settings.welcome_body || 'Hola,\n\nTu cuenta de correo ha sido creada:\n\nEmail: {email}\nContraseña: {password}\n\nPuedes acceder via Webmail en: https://webmail.{domain}';

    subject = subject.replace(/{email}/g, email).replace(/{domain}/g, domain);
    body = body.replace(/{email}/g, email).replace(/{password}/g, password).replace(/{domain}/g, domain);

    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.smtp_port == 465,
      auth: { user: settings.smtp_user, pass: settings.smtp_pass },
      tls: { rejectUnauthorized: false }
    });

    const mailOptions = {
      from: `"${settings.from_name || 'Mail Admin'}" <${settings.from_email || settings.smtp_user}>`,
      to,
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

// Test SMTP
app.post('/api/test-smtp', async (req, res) => {
  try {
    const config = req.body;

    if (!config.smtp_host || !config.smtp_port || !config.smtp_user || !config.smtp_pass || !config.test_email) {
      return res.status(400).json({ success: false, error: 'Missing required SMTP configuration fields or test email.' });
    }

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_port == 465,
      auth: { user: config.smtp_user, pass: config.smtp_pass },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from: `"${config.from_name || 'SMTP Test'}" <${config.from_email || config.smtp_user}>`,
      to: config.test_email,
      subject: 'Prueba de Configuración SMTP',
      text: 'Este es un correo de prueba para verificar tu configuración SMTP.'
    });

    res.json({ success: true, message: 'SMTP Test successful' });
  } catch (error) {
    console.error('SMTP Test error:', error);
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

const PORT = 5811; // Forced per user request
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
