// Email operations - GET, POST, DELETE, PUT
const { getCpanelBaseUrl, getCpanelHeaders, jsonResponse, corsHeaders, fetchUrl } = require('./utils');

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    // Parse path - handle both /api/emails/... and /.netlify/functions/emails/...
    let path = event.path;
    console.log('[DEBUG] Original path:', path);

    // Remove known prefixes
    path = path.replace('/.netlify/functions/emails', '');
    path = path.replace('/api/emails', '');

    const segments = path.split('/').filter(Boolean);
    console.log('[DEBUG] Parsed segments:', segments);

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

    // Build request exactly like server.js does (which works)
    const cpanelUrl = `${getCpanelBaseUrl()}/Email/add_pop`;
    const requestBody = {
        email: email,  // Just username, not full address
        password: password,
        quota: quota.toString(),
        domain: domain
    };

    console.log('[DEBUG] cPanel URL:', cpanelUrl);
    console.log('[DEBUG] Request body:', JSON.stringify(requestBody));
    console.log('[DEBUG] Headers:', JSON.stringify(getCpanelHeaders()));

    try {
        // Use native fetch (Node 18+) instead of custom fetchUrl
        const response = await fetch(cpanelUrl, {
            method: 'POST',
            headers: getCpanelHeaders(),
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log('[DEBUG] cPanel response:', JSON.stringify(data));

        if (data.status === 1) {
            return jsonResponse(200, { success: true, message: `Email account ${email}@${domain} created successfully` });
        } else {
            console.error('cPanel error:', data.errors);
            return jsonResponse(200, { success: false, error: data.errors?.[0] || 'Failed to create email account' });
        }
    } catch (fetchError) {
        console.error('[DEBUG] Fetch error:', fetchError.message);
        return jsonResponse(500, { success: false, error: `Connection error: ${fetchError.message}` });
    }
}

// Helper to extract username if full email is provided
const getUsername = (email) => {
    if (!email) return '';
    return email.split('@')[0];
};

// DELETE /api/emails/:email
async function deleteEmail(event, segments) {
    const rawEmail = segments[0];
    const domain = event.queryStringParameters?.domain;

    if (!rawEmail || !domain) {
        return jsonResponse(400, { success: false, error: 'Email and domain are required' });
    }

    const email = getUsername(rawEmail);

    // Build URL with query parameters (cPanel UAPI often expects this format)
    const params = new URLSearchParams({
        email: email,
        domain: domain
    });
    const cpanelUrl = `${getCpanelBaseUrl()}/Email/delete_pop?${params.toString()}`;

    console.log('[DEBUG DELETE] URL:', cpanelUrl);
    console.log('[DEBUG DELETE] email param:', email, '| domain param:', domain);

    try {
        const response = await fetch(cpanelUrl, {
            method: 'POST',
            headers: getCpanelHeaders()
        });

        const data = await response.json();
        console.log('[DEBUG DELETE] Response:', JSON.stringify(data));

        if (data.status === 1) {
            return jsonResponse(200, { success: true, message: `Email account ${email}@${domain} deleted successfully` });
        } else {
            return jsonResponse(200, { success: false, error: data.errors?.[0] || 'Failed to delete email account' });
        }
    } catch (error) {
        console.error('[DEBUG DELETE] Error:', error);
        return jsonResponse(500, { success: false, error: error.message });
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

async function changePassword(rawEmail, body) {
    const { password, domain } = body;

    if (!password || !domain) {
        return jsonResponse(400, { success: false, error: 'Password and domain are required' });
    }

    const email = getUsername(rawEmail);
    const cpanelUrl = `${getCpanelBaseUrl()}/Email/passwd_pop`;
    const requestBody = { email, password, domain };

    console.log('[DEBUG PASSWORD] URL:', cpanelUrl);
    console.log('[DEBUG PASSWORD] Body:', JSON.stringify(requestBody));

    try {
        const response = await fetch(cpanelUrl, {
            method: 'POST',
            headers: getCpanelHeaders(),
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();

        if (data.status === 1) {
            return jsonResponse(200, { success: true, message: `Password changed for ${email}@${domain}` });
        } else {
            return jsonResponse(200, { success: false, error: data.errors?.[0] || 'Failed to change password' });
        }
    } catch (error) {
        return jsonResponse(500, { success: false, error: error.message });
    }
}

async function toggleSuspend(rawEmail, body) {
    const { suspend, domain } = body;

    if (suspend === undefined || !domain) {
        return jsonResponse(400, { success: false, error: 'Suspend flag and domain are required' });
    }

    // suspend_login / unsuspend_login require full email address mostly
    const email = getUsername(rawEmail);
    const fullEmail = `${email}@${domain}`;

    const endpoint = suspend ? 'suspend_login' : 'unsuspend_login';
    const cpanelUrl = `${getCpanelBaseUrl()}/Email/${endpoint}`;

    const requestBody = { email: fullEmail };

    console.log(`[DEBUG SUSPEND] URL: ${cpanelUrl}`);
    console.log(`[DEBUG SUSPEND] Body: ${JSON.stringify(requestBody)}`);

    try {
        const response = await fetch(cpanelUrl, {
            method: 'POST',
            headers: getCpanelHeaders(),
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();

        if (data.status === 1) {
            return jsonResponse(200, { success: true, message: `Email ${fullEmail} ${suspend ? 'suspended' : 'unsuspended'} successfully` });
        } else {
            return jsonResponse(200, { success: false, error: data.errors?.[0] || `Failed to ${suspend ? 'suspend' : 'unsuspend'} email` });
        }
    } catch (error) {
        return jsonResponse(500, { success: false, error: error.message });
    }
}

async function changeQuota(rawEmail, body) {
    const { quota, domain } = body;

    if (quota === undefined || !domain) {
        return jsonResponse(400, { success: false, error: 'Quota and domain are required' });
    }

    const email = getUsername(rawEmail);
    const cpanelUrl = `${getCpanelBaseUrl()}/Email/edit_pop_quota`;
    const requestBody = {
        email,
        quota: quota.toString(),
        domain
    };

    console.log('[DEBUG QUOTA] URL:', cpanelUrl);
    console.log('[DEBUG QUOTA] Body:', JSON.stringify(requestBody));

    try {
        const response = await fetch(cpanelUrl, {
            method: 'POST',
            headers: getCpanelHeaders(),
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();

        if (data.status === 1) {
            return jsonResponse(200, { success: true, message: `Quota updated for ${email}@${domain}` });
        } else {
            return jsonResponse(200, { success: false, error: data.errors?.[0] || 'Failed to update quota' });
        }
    } catch (error) {
        return jsonResponse(500, { success: false, error: error.message });
    }
}

