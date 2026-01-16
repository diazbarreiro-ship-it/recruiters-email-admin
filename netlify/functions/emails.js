// Email operations - GET, POST, DELETE, PUT
const { getCpanelBaseUrl, getCpanelHeaders, jsonResponse, corsHeaders, fetchUrl } = require('./utils');

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    const path = event.path.replace('/.netlify/functions/emails', '');
    const segments = path.split('/').filter(Boolean);

    try {
        switch (event.httpMethod) {
            case 'GET':
                return await getEmails(event);
            case 'POST':
                return await createEmail(event);
            case 'DELETE':
                return await deleteEmail(event, segments);
            case 'PUT':
                return await handlePut(event, segments);
            default:
                return jsonResponse(405, { success: false, error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Email operation error:', error);
        return jsonResponse(500, { success: false, error: error.message });
    }
};

// GET /api/emails
async function getEmails(event) {
    const domain = event.queryStringParameters?.domain;

    const response = await fetchUrl(
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

        return jsonResponse(200, { success: true, emails });
    } else {
        return jsonResponse(200, { success: false, error: data.errors?.[0] || 'Failed to fetch emails' });
    }
}

// POST /api/emails
async function createEmail(event) {
    console.log('[DEBUG] Raw event body:', event.body);
    console.log('[DEBUG] isBase64Encoded:', event.isBase64Encoded);

    let bodyStr = event.body;
    if (event.isBase64Encoded) {
        bodyStr = Buffer.from(event.body, 'base64').toString('utf8');
        console.log('[DEBUG] Decoded body:', bodyStr);
    }

    const body = JSON.parse(bodyStr || '{}');
    console.log('[DEBUG] Parsed body:', body);
    const { email, password, quota = 1024, domain } = body;

    console.log(`[DEBUG] Attempting to create email: '${email}' @ '${domain}' with quota ${quota}`);

    // Explicit check to see what values are missing
    if (!email) console.error('[DEBUG] ERROR: Email field is missing or empty');
    if (!domain) console.error('[DEBUG] ERROR: Domain field is missing or empty');

    if (!email || !password || !domain) {
        return jsonResponse(400, { success: false, error: 'Email, password, and domain are required' });
    }

    // Use URL query parameters instead of JSON body
    // Some cPanel versions struggle with JSON body in add_pop
    const params = new URLSearchParams({
        email: `${email}@${domain}`,
        password: password,
        quota: quota.toString(),
        domain: domain
    });

    const response = await fetchUrl(
        `${getCpanelBaseUrl()}/Email/add_pop?${params.toString()}`,
        {
            headers: getCpanelHeaders(),
            method: 'GET' // Force GET to bypass body parsing issues completely
        }
    );
    const data = await response.json();

    if (data.status === 1) {
        return jsonResponse(200, { success: true, message: `Email account ${email}@${domain} created successfully` });
    } else {
        console.error('cPanel error:', data.errors);
        return jsonResponse(200, { success: false, error: data.errors?.[0] || 'Failed to create email account' });
    }
}

// DELETE /api/emails/:email
async function deleteEmail(event, segments) {
    const email = segments[0];
    const domain = event.queryStringParameters?.domain;

    if (!email || !domain) {
        return jsonResponse(400, { success: false, error: 'Email and domain are required' });
    }

    const bodyParams = JSON.stringify({
        email: `${email}@${domain}`,
        domain: domain
    });

    const response = await fetchUrl(
        `${getCpanelBaseUrl()}/Email/delete_pop`,
        {
            headers: getCpanelHeaders(),
            method: 'POST',
            body: bodyParams
        }
    );
    const data = await response.json();

    if (data.status === 1) {
        return jsonResponse(200, { success: true, message: `Email account ${email}@${domain} deleted successfully` });
    } else {
        return jsonResponse(200, { success: false, error: data.errors?.[0] || 'Failed to delete email account' });
    }
}

// PUT /api/emails/:email/password or /api/emails/:email/suspend or /api/emails/:email/quota
async function handlePut(event, segments) {
    const email = segments[0];
    const action = segments[1];
    const body = JSON.parse(event.body || '{}');

    switch (action) {
        case 'password':
            return await changePassword(email, body);
        case 'suspend':
            return await toggleSuspend(email, body);
        case 'quota':
            return await changeQuota(email, body);
        default:
            return jsonResponse(400, { success: false, error: 'Invalid action' });
    }
}

async function changePassword(email, body) {
    const { password, domain } = body;

    if (!password || !domain) {
        return jsonResponse(400, { success: false, error: 'Password and domain are required' });
    }

    const bodyParams = JSON.stringify({
        email: `${email}@${domain}`,
        password: password,
        domain: domain
    });

    const response = await fetchUrl(
        `${getCpanelBaseUrl()}/Email/passwd_pop`,
        {
            headers: getCpanelHeaders(),
            method: 'POST',
            body: bodyParams
        }
    );
    const data = await response.json();

    if (data.status === 1) {
        return jsonResponse(200, { success: true, message: `Password changed for ${email}@${domain}` });
    } else {
        return jsonResponse(200, { success: false, error: data.errors?.[0] || 'Failed to change password' });
    }
}

async function toggleSuspend(email, body) {
    const { suspend, domain } = body;

    if (suspend === undefined || !domain) {
        return jsonResponse(400, { success: false, error: 'Suspend flag and domain are required' });
    }

    const endpoint = suspend ? 'suspend_login' : 'unsuspend_login';
    const bodyParams = JSON.stringify({ email: `${email}@${domain}` });

    const response = await fetchUrl(
        `${getCpanelBaseUrl()}/Email/${endpoint}`,
        {
            headers: getCpanelHeaders(),
            method: 'POST',
            body: bodyParams
        }
    );
    const data = await response.json();

    if (data.status === 1) {
        return jsonResponse(200, { success: true, message: `Email ${email}@${domain} ${suspend ? 'suspended' : 'unsuspended'} successfully` });
    } else {
        return jsonResponse(200, { success: false, error: data.errors?.[0] || `Failed to ${suspend ? 'suspend' : 'unsuspend'} email` });
    }
}

async function changeQuota(email, body) {
    const { quota, domain } = body;

    if (quota === undefined || !domain) {
        return jsonResponse(400, { success: false, error: 'Quota and domain are required' });
    }

    const bodyParams = JSON.stringify({
        email: `${email}@${domain}`,
        quota: quota.toString(),
        domain: domain
    });

    const response = await fetchUrl(
        `${getCpanelBaseUrl()}/Email/edit_pop_quota`,
        {
            headers: getCpanelHeaders(),
            method: 'POST',
            body: bodyParams
        }
    );
    const data = await response.json();

    if (data.status === 1) {
        return jsonResponse(200, { success: true, message: `Quota updated for ${email}@${domain}` });
    } else {
        return jsonResponse(200, { success: false, error: data.errors?.[0] || 'Failed to update quota' });
    }
}
