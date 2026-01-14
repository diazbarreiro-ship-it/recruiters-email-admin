// Health check endpoint
const { CPANEL_HOST, jsonResponse, corsHeaders } = require('./utils');

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    return jsonResponse(200, {
        status: 'ok',
        cpanelHost: CPANEL_HOST,
        timestamp: new Date().toISOString(),
        environment: 'netlify'
    });
};
