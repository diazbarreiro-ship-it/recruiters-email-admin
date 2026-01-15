// Supabase Client Configuration
const SUPABASE_URL = 'https://qetgzdxvxbzuyzejbpdn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFldGd6ZHh2eGJ6dXl6ZWpicGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTkzNTQsImV4cCI6MjA4Mzk5NTM1NH0.eAmDOBkmjqBvE08bHE4Ykq0noNLiFO71zscHD83HzB8';

// Simple Supabase client for tracking
class SupabaseClient {
    constructor(url, key) {
        this.url = url;
        this.headers = {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }

    async query(table, options = {}) {
        let url = `${this.url}/rest/v1/${table}`;
        const params = new URLSearchParams();

        if (options.select) {
            params.append('select', options.select);
        }
        if (options.order) {
            params.append('order', options.order);
        }
        if (options.limit) {
            params.append('limit', options.limit);
        }

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: this.headers
        });

        if (!response.ok) {
            throw new Error(`Supabase query failed: ${response.statusText}`);
        }

        return response.json();
    }

    async insert(table, data) {
        const response = await fetch(`${this.url}/rest/v1/${table}`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Supabase insert failed: ${response.statusText}`);
        }

        return response.json();
    }

    async update(table, id, data) {
        const response = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, {
            method: 'PATCH',
            headers: this.headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Supabase update failed: ${response.statusText}`);
        }

        return response.json();
    }

    async delete(table, id) {
        const response = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, {
            method: 'DELETE',
            headers: this.headers
        });

        if (!response.ok) {
            throw new Error(`Supabase delete failed: ${response.statusText}`);
        }

        return true;
    }
}

// Initialize Supabase client
const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tracking functions
const Tracking = {
    // Log an activity
    async logActivity(type, email, domain, details = {}) {
        try {
            await supabase.insert('email_activities', {
                activity_type: type,
                email_address: email,
                domain: domain,
                details: JSON.stringify(details),
                created_at: new Date().toISOString()
            });
            console.log('Activity logged:', type, email);
        } catch (error) {
            console.warn('Failed to log activity (table may not exist):', error.message);
        }
    },

    // Get recent activities
    async getRecentActivities(limit = 20) {
        try {
            return await supabase.query('email_activities', {
                select: '*',
                order: 'created_at.desc',
                limit: limit
            });
        } catch (error) {
            console.warn('Failed to fetch activities (table may not exist):', error.message);
            return [];
        }
    },

    // Sync emails to database for tracking
    async syncEmails(emails, domain, recoveryEmail = null) {
        try {
            for (const email of emails) {
                // Check if email already exists
                const existing = await supabase.query('email_accounts', {
                    select: 'id',
                    filter: `email.eq.${email.email}`
                });

                if (!existing || existing.length === 0) {
                    await supabase.insert('email_accounts', {
                        email: email.email,
                        domain: email.domain,
                        disk_used: email.diskused,
                        disk_quota: email.diskquota,
                        is_suspended: email.suspended_login === 1,
                        recovery_email: recoveryEmail, // Store recovery email if provided
                        synced_at: new Date().toISOString()
                    });
                } else if (recoveryEmail) {
                    // Update recovery email if it's a new one during sync
                    await supabase.update('email_accounts', existing[0].id, {
                        recovery_email: recoveryEmail
                    });
                }
            }
        } catch (error) {
            console.warn('Failed to sync emails:', error.message);
        }
    },

    // Notification Settings
    async getNotificationSettings(domain) {
        try {
            const results = await supabase.query('notification_settings', {
                filter: `domain.eq.${domain}`
            });
            return results && results.length > 0 ? results[0] : null;
        } catch (error) {
            console.warn('Failed to fetch notification settings:', error.message);
            return null;
        }
    },

    async saveNotificationSettings(settings) {
        try {
            const existing = await this.getNotificationSettings(settings.domain);
            if (existing) {
                return await supabase.update('notification_settings', existing.id, settings);
            } else {
                return await supabase.insert('notification_settings', settings);
            }
        } catch (error) {
            console.error('Failed to save notification settings:', error);
            throw error;
        }
    }
};

// Export for use in app.js
window.supabase = supabase;
window.Tracking = Tracking;
