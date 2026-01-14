// Shared utilities for Netlify Functions
const https = require('https');

const CPANEL_HOST = process.env.CPANEL_HOST || 'chaaj.net';
const CPANEL_USERNAME = process.env.CPANEL_USERNAME || 'chaajnet';
const CPANEL_API_TOKEN = process.env.CPANEL_API_TOKEN;
const CPANEL_PORT = process.env.CPANEL_PORT || 2083;

const getCpanelBaseUrl = () => {
    return `https://${CPANEL_HOST}:${CPANEL_PORT}/execute`;
};

const getCpanelHeaders = () => ({
    'Authorization': `cpanel ${CPANEL_USERNAME}:${CPANEL_API_TOKEN}`,
    'Content-Type': 'application/json'
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const jsonResponse = (statusCode, body) => ({
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

// Custom fetch using native https
const fetchUrl = (url, options = {}) => {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);

        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            rejectUnauthorized: false // Allow self-signed certs for cPanel
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        json: () => Promise.resolve(JSON.parse(data)),
                        text: () => Promise.resolve(data)
                    });
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
};

module.exports = {
    CPANEL_HOST,
    CPANEL_USERNAME,
    CPANEL_API_TOKEN,
    CPANEL_PORT,
    getCpanelBaseUrl,
    getCpanelHeaders,
    corsHeaders,
    jsonResponse,
    fetchUrl
};
