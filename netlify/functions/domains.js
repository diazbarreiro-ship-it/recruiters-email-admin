// Get domains from cPanel
const { getCpanelBaseUrl, getCpanelHeaders, jsonResponse, corsHeaders, fetchUrl } = require('./utils');

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        const response = await fetchUrl(
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

            return jsonResponse(200, { success: true, domains });
        } else {
            return jsonResponse(200, { success: false, error: data.errors?.[0] || 'Failed to fetch domains' });
        }
    } catch (error) {
        console.error('Error fetching domains:', error);
        return jsonResponse(500, { success: false, error: error.message });
    }
};
