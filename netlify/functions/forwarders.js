// Get email forwarders from cPanel
const { getCpanelBaseUrl, getCpanelHeaders, jsonResponse, corsHeaders, fetchUrl } = require('./utils');

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        const domain = event.queryStringParameters?.domain;

        const response = await fetchUrl(
            `${getCpanelBaseUrl()}/Email/list_forwarders${domain ? `?domain=${encodeURIComponent(domain)}` : ''}`,
            { headers: getCpanelHeaders(), method: 'GET' }
        );
        const data = await response.json();

        if (data.status === 1) {
            return jsonResponse(200, { success: true, forwarders: data.data || [] });
        } else {
            return jsonResponse(200, { success: false, error: data.errors?.[0] || 'Failed to fetch forwarders' });
        }
    } catch (error) {
        console.error('Error fetching forwarders:', error);
        return jsonResponse(500, { success: false, error: error.message });
    }
};
