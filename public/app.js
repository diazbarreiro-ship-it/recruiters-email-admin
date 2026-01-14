// ============================================
// Email Admin Panel - Main Application
// ============================================

// Verify authentication before loading app
if (!Auth.init()) {
    window.location.href = 'login.html';
    throw new Error('Not authenticated');
}

// State
const state = {
    currentDomain: '',
    domains: [],
    emails: [],
    filteredEmails: [],
    isLoading: false,
    currentSection: 'dashboard',
    emailToDelete: null,
    users: [],
    userToEdit: null,
    userToDelete: null,
    filters: {
        status: 'all',
        search: ''
    }
};

// DOM Elements
const elements = {
    // Sidebar
    sidebarNavItems: document.querySelectorAll('.nav-item'),
    connectionStatus: document.getElementById('connectionStatus'),
    navUsers: document.getElementById('navUsers'),

    // Header
    pageTitle: document.getElementById('pageTitle'),
    domainSelect: document.getElementById('domainSelect'),
    searchInput: document.getElementById('searchInput'),
    addEmailBtn: document.getElementById('addEmailBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    sidebar: document.querySelector('.sidebar'),

    // User Menu
    userMenu: document.getElementById('userMenu'),
    userMenuBtn: document.getElementById('userMenuBtn'),
    userAvatar: document.getElementById('userAvatar'),
    userName: document.getElementById('userName'),
    userRoleBadge: document.getElementById('userRoleBadge'),
    userDropdown: document.getElementById('userDropdown'),
    dropdownUserName: document.getElementById('dropdownUserName'),
    dropdownUserEmail: document.getElementById('dropdownUserEmail'),
    logoutBtn: document.getElementById('logoutBtn'),

    // Stats
    totalEmails: document.getElementById('totalEmails'),
    activeEmails: document.getElementById('activeEmails'),
    suspendedEmails: document.getElementById('suspendedEmails'),
    totalStorage: document.getElementById('totalStorage'),

    // Table
    emailsTableBody: document.getElementById('emailsTableBody'),

    // Filters
    filterStatus: document.getElementById('filterStatus'),
    filterSearch: document.getElementById('filterSearch'),
    filterResults: document.getElementById('filterResults'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),

    // Sections
    statsSection: document.getElementById('statsSection'),
    emailsSection: document.getElementById('emailsSection'),
    trackingSection: document.getElementById('trackingSection'),
    trackingList: document.getElementById('trackingList'),
    usersSection: document.getElementById('usersSection'),
    usersTableBody: document.getElementById('usersTableBody'),
    addUserBtn: document.getElementById('addUserBtn'),

    // Modals
    addEmailModal: document.getElementById('addEmailModal'),
    addEmailForm: document.getElementById('addEmailForm'),
    emailUsername: document.getElementById('emailUsername'),
    emailPassword: document.getElementById('emailPassword'),
    emailQuota: document.getElementById('emailQuota'),
    emailDomainDisplay: document.getElementById('emailDomainDisplay'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelAddEmail: document.getElementById('cancelAddEmail'),
    togglePassword: document.getElementById('togglePassword'),
    generatePassword: document.getElementById('generatePassword'),
    passwordStrength: document.getElementById('passwordStrength'),

    // Change Password Modal
    changePasswordModal: document.getElementById('changePasswordModal'),
    changePasswordForm: document.getElementById('changePasswordForm'),
    passwordEmail: document.getElementById('passwordEmail'),
    passwordDomain: document.getElementById('passwordDomain'),
    passwordEmailDisplay: document.getElementById('passwordEmailDisplay'),
    newPassword: document.getElementById('newPassword'),
    closePasswordModalBtn: document.getElementById('closePasswordModalBtn'),
    cancelChangePassword: document.getElementById('cancelChangePassword'),
    toggleNewPassword: document.getElementById('toggleNewPassword'),
    generateNewPassword: document.getElementById('generateNewPassword'),
    newPasswordStrength: document.getElementById('newPasswordStrength'),

    // Confirm Delete Modal
    confirmDeleteModal: document.getElementById('confirmDeleteModal'),
    emailToDelete: document.getElementById('emailToDelete'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    cancelDelete: document.getElementById('cancelDelete'),
    confirmDelete: document.getElementById('confirmDelete'),

    // User Modal
    userModal: document.getElementById('userModal'),
    userModalTitle: document.getElementById('userModalTitle'),
    userForm: document.getElementById('userForm'),
    editUserId: document.getElementById('editUserId'),
    userNameInput: document.getElementById('userName'),
    userEmailInput: document.getElementById('userEmail'),
    userRoleSelect: document.getElementById('userRole'),
    userPasswordInput: document.getElementById('userPassword'),
    userPasswordGroup: document.getElementById('userPasswordGroup'),
    passwordHint: document.getElementById('passwordHint'),
    closeUserModalBtn: document.getElementById('closeUserModalBtn'),
    cancelUserModal: document.getElementById('cancelUserModal'),
    submitUserBtn: document.getElementById('submitUserBtn'),
    toggleUserPassword: document.getElementById('toggleUserPassword'),
    generateUserPassword: document.getElementById('generateUserPassword'),
    userPasswordStrength: document.getElementById('userPasswordStrength'),
    allowedDomainsGroup: document.getElementById('allowedDomainsGroup'),
    domainsChecklist: document.getElementById('domainsChecklist'),

    // Confirm User Delete Modal
    confirmUserDeleteModal: document.getElementById('confirmUserDeleteModal'),
    userToDelete: document.getElementById('userToDelete'),
    closeUserDeleteModalBtn: document.getElementById('closeUserDeleteModalBtn'),
    cancelUserDelete: document.getElementById('cancelUserDelete'),
    confirmUserDelete: document.getElementById('confirmUserDelete'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
};

// ============================================
// API Functions
// ============================================
const API = {
    baseUrl: '/api',

    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const data = await response.json();
            return data.status === 'ok';
        } catch {
            return false;
        }
    },

    async getDomains() {
        const response = await fetch(`${this.baseUrl}/domains`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data.domains;
    },

    async getEmails(domain = '') {
        const url = domain
            ? `${this.baseUrl}/emails?domain=${encodeURIComponent(domain)}`
            : `${this.baseUrl}/emails`;
        const response = await fetch(url);
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data.emails;
    },

    async createEmail(email, password, quota, domain) {
        const response = await fetch(`${this.baseUrl}/emails`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, quota, domain })
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data;
    },

    async deleteEmail(email, domain) {
        const response = await fetch(
            `${this.baseUrl}/emails/${encodeURIComponent(email)}?domain=${encodeURIComponent(domain)}`,
            { method: 'DELETE' }
        );
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data;
    },

    async changePassword(email, password, domain) {
        const response = await fetch(`${this.baseUrl}/emails/${encodeURIComponent(email)}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, domain })
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data;
    },

    async toggleSuspend(email, domain, suspend) {
        const response = await fetch(`${this.baseUrl}/emails/${encodeURIComponent(email)}/suspend`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ suspend, domain })
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data;
    },

    async getForwarders(domain = '') {
        const url = domain
            ? `${this.baseUrl}/forwarders?domain=${encodeURIComponent(domain)}`
            : `${this.baseUrl}/forwarders`;
        const response = await fetch(url);
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data.forwarders;
    }
};

// ============================================
// UI Functions
// ============================================
const UI = {
    showToast(type, title, message, duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;

        elements.toastContainer.appendChild(toast);

        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        });

        // Auto remove
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('toast-out');
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    },

    updateConnectionStatus(connected, text = '') {
        const statusDot = elements.connectionStatus.querySelector('.status-dot');
        const statusText = elements.connectionStatus.querySelector('.status-text');

        statusDot.className = 'status-dot';
        if (connected === true) {
            statusDot.classList.add('connected');
            statusText.textContent = text || 'Conectado';
        } else if (connected === false) {
            statusDot.classList.add('error');
            statusText.textContent = text || 'Error de conexión';
        } else {
            statusText.textContent = text || 'Conectando...';
        }
    },

    updateStats() {
        const total = state.emails.length;
        const active = state.emails.filter(e => !e.suspended_login).length;
        const suspended = state.emails.filter(e => e.suspended_login).length;

        // Calculate total storage used
        let totalBytes = 0;
        state.emails.forEach(e => {
            if (e.diskused) {
                totalBytes += parseInt(e.diskused) || 0;
            }
        });

        const storageText = formatBytes(totalBytes);

        // Animate numbers
        animateNumber(elements.totalEmails, total);
        animateNumber(elements.activeEmails, active);
        animateNumber(elements.suspendedEmails, suspended);
        elements.totalStorage.textContent = storageText;
    },

    renderEmails(emails = state.emails) {
        if (emails.length === 0) {
            elements.emailsTableBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-state">
                            <div class="empty-state-icon">📭</div>
                            <p>No hay cuentas de correo${state.currentDomain ? ` para ${state.currentDomain}` : ''}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        elements.emailsTableBody.innerHTML = emails.map(email => {
            const initials = email.user ? email.user.substring(0, 2).toUpperCase() : '??';
            const isSuspended = email.suspended_login === 1 || email.suspended_login === true;
            const quotaPercent = email.diskusedpercent ? parseFloat(email.diskusedpercent) : 0;
            const quotaClass = quotaPercent > 80 ? 'high' : quotaPercent > 50 ? 'medium' : 'low';

            return `
                <tr data-email="${email.user}" data-domain="${email.domain}">
                    <td>
                        <div class="email-cell">
                            <div class="email-avatar">${initials}</div>
                            <div class="email-info">
                                <span class="email-address">${email.email}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${isSuspended ? 'suspended' : 'active'}">
                            ${isSuspended ? '⏸️ Suspendido' : '✅ Activo'}
                        </span>
                    </td>
                    <td>
                        <div class="quota-progress">
                            <div class="quota-bar">
                                <div class="quota-bar-fill ${quotaClass}" style="width: ${Math.min(quotaPercent, 100)}%"></div>
                            </div>
                            <span class="quota-text">${email.humandiskused || '0 MB'} usado</span>
                        </div>
                    </td>
                    <td>
                        <span class="quota-text">${email.humandiskquota || 'Ilimitado'}</span>
                    </td>
                    <td>
                        <div class="actions-cell">
                            <button class="action-btn" onclick="Actions.changePassword('${email.user}', '${email.domain}')" title="Cambiar contraseña">
                                🔑
                            </button>
                            <button class="action-btn" onclick="Actions.toggleSuspend('${email.user}', '${email.domain}', ${!isSuspended})" title="${isSuspended ? 'Activar' : 'Suspender'}">
                                ${isSuspended ? '▶️' : '⏸️'}
                            </button>
                            <button class="action-btn danger" onclick="Actions.confirmDelete('${email.user}', '${email.domain}')" title="Eliminar">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderLoading() {
        elements.emailsTableBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="5">
                    <div class="loading-spinner"></div>
                    <span>Cargando correos...</span>
                </td>
            </tr>
        `;
    },

    openModal(modalElement) {
        modalElement.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeModal(modalElement) {
        modalElement.classList.remove('active');
        document.body.style.overflow = '';
    },

    switchSection(section) {
        state.currentSection = section;

        // Check permission for users section
        if (section === 'users' && !Auth.isAdmin()) {
            UI.showToast('error', 'Acceso Denegado', 'Solo los administradores pueden gestionar usuarios');
            section = 'dashboard';
        }

        // Update nav
        elements.sidebarNavItems.forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });

        // Update title
        const titles = {
            dashboard: 'Dashboard',
            emails: 'Correos',
            forwarders: 'Reenvíos',
            tracking: 'Tracking',
            users: 'Gestión de Usuarios',
            settings: 'Configuración'
        };
        elements.pageTitle.textContent = titles[section] || 'Dashboard';

        // Show/hide sections
        elements.statsSection.classList.toggle('hidden', section !== 'dashboard' && section !== 'emails');
        elements.emailsSection.classList.toggle('hidden', section !== 'dashboard' && section !== 'emails');
        elements.trackingSection.classList.toggle('hidden', section !== 'tracking');
        elements.usersSection.classList.toggle('hidden', section !== 'users');

        // Load tracking if needed
        if (section === 'tracking') {
            loadTracking();
        }

        // Load users if needed
        if (section === 'users') {
            loadUsers();
        }
    },

    async renderTracking() {
        const activities = await Tracking.getRecentActivities(20);

        if (!activities || activities.length === 0) {
            elements.trackingList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <p>No hay actividades registradas aún</p>
                </div>
            `;
            return;
        }

        const icons = {
            created: { icon: '+', class: 'created' },
            deleted: { icon: '−', class: 'deleted' },
            modified: { icon: '✎', class: 'modified' },
            password_changed: { icon: '🔑', class: 'modified' },
            suspended: { icon: '⏸', class: 'deleted' },
            activated: { icon: '▶', class: 'created' }
        };

        elements.trackingList.innerHTML = activities.map(activity => {
            const iconConfig = icons[activity.activity_type] || icons.modified;
            const date = new Date(activity.created_at);
            const timeAgo = getTimeAgo(date);

            return `
                <div class="tracking-item">
                    <div class="tracking-icon ${iconConfig.class}">${iconConfig.icon}</div>
                    <div class="tracking-content">
                        <div class="tracking-title">${getActivityTitle(activity.activity_type)}</div>
                        <div class="tracking-description">${activity.email_address}</div>
                        <div class="tracking-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
};

// ============================================
// Actions
// ============================================
const Actions = {
    async changePassword(email, domain) {
        elements.passwordEmail.value = email;
        elements.passwordDomain.value = domain;
        elements.passwordEmailDisplay.textContent = `${email}@${domain}`;
        elements.newPassword.value = '';
        elements.newPasswordStrength.innerHTML = '';
        UI.openModal(elements.changePasswordModal);
    },

    async toggleSuspend(email, domain, suspend) {
        try {
            await API.toggleSuspend(email, domain, suspend);
            UI.showToast('success',
                suspend ? 'Cuenta Suspendida' : 'Cuenta Activada',
                `${email}@${domain}`
            );

            // Log tracking
            await Tracking.logActivity(
                suspend ? 'suspended' : 'activated',
                `${email}@${domain}`,
                domain
            );

            // Reload emails
            await loadEmails();
        } catch (error) {
            UI.showToast('error', 'Error', error.message);
        }
    },

    confirmDelete(email, domain) {
        state.emailToDelete = { email, domain };
        elements.emailToDelete.textContent = `${email}@${domain}`;
        UI.openModal(elements.confirmDeleteModal);
    },

    async deleteEmail() {
        if (!state.emailToDelete) return;

        const { email, domain } = state.emailToDelete;

        try {
            await API.deleteEmail(email, domain);
            UI.showToast('success', 'Cuenta Eliminada', `${email}@${domain}`);

            // Log tracking
            await Tracking.logActivity('deleted', `${email}@${domain}`, domain);

            UI.closeModal(elements.confirmDeleteModal);
            state.emailToDelete = null;

            // Reload emails
            await loadEmails();
        } catch (error) {
            UI.showToast('error', 'Error', error.message);
        }
    }
};

// Make Actions global for inline onclick handlers
window.Actions = Actions;

// ============================================
// Utility Functions
// ============================================
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function animateNumber(element, target) {
    const current = parseInt(element.textContent) || 0;
    const increment = Math.ceil((target - current) / 20);
    const duration = 500;
    const stepTime = duration / 20;

    let value = current;
    const timer = setInterval(() => {
        value += increment;
        if ((increment > 0 && value >= target) || (increment < 0 && value <= target)) {
            value = target;
            clearInterval(timer);
        }
        element.textContent = value;
    }, stepTime);
}

function generateSecurePassword(length = 16) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const all = lowercase + uppercase + numbers + symbols;
    let password = '';

    // Ensure at least one of each type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
        password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

function checkPasswordStrength(password) {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 1) return 'weak';
    if (strength <= 2) return 'fair';
    if (strength <= 3) return 'good';
    return 'strong';
}

function updatePasswordStrength(password, strengthElement) {
    const strength = checkPasswordStrength(password);
    strengthElement.innerHTML = `<div class="password-strength-bar strength-${strength}"></div>`;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    const intervals = {
        año: 31536000,
        mes: 2592000,
        semana: 604800,
        día: 86400,
        hora: 3600,
        minuto: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `hace ${interval} ${unit}${interval === 1 ? '' : (unit === 'mes' ? 'es' : 's')}`;
        }
    }

    return 'hace un momento';
}

function getActivityTitle(type) {
    const titles = {
        created: 'Cuenta creada',
        deleted: 'Cuenta eliminada',
        modified: 'Cuenta modificada',
        password_changed: 'Contraseña cambiada',
        suspended: 'Cuenta suspendida',
        activated: 'Cuenta activada'
    };
    return titles[type] || 'Actividad registrada';
}

// ============================================
// Data Loading Functions
// ============================================
async function loadDomains() {
    try {
        let domains = await API.getDomains();

        // Filter domains based on user permissions
        const user = Auth.getUser();
        if (user && user.role === 'gerente' && user.allowed_domains && user.allowed_domains.length > 0) {
            // Gerente: only show allowed domains
            domains = domains.filter(domain => user.allowed_domains.includes(domain));

            if (domains.length === 0) {
                UI.showToast('warning', 'Sin Acceso', 'No tienes acceso a ningún dominio. Contacta al administrador.');
            }
        }

        state.domains = domains;

        elements.domainSelect.innerHTML = domains.map((domain, index) => `
            <option value="${domain}" ${index === 0 ? 'selected' : ''}>${domain}</option>
        `).join('');

        if (domains.length > 0) {
            state.currentDomain = domains[0];
            elements.emailDomainDisplay.textContent = `@${domains[0]}`;
        }
    } catch (error) {
        console.error('Error loading domains:', error);
        UI.showToast('error', 'Error', 'No se pudieron cargar los dominios');
    }
}

async function loadEmails() {
    UI.renderLoading();

    try {
        let emails = await API.getEmails(state.currentDomain);

        // Filter emails by current domain (in case API doesn't filter)
        if (state.currentDomain) {
            emails = emails.filter(e => e.domain === state.currentDomain);
        }

        // For gerentes: additional filter by allowed domains
        const user = Auth.getUser();
        if (user && user.role === 'gerente' && user.allowed_domains && user.allowed_domains.length > 0) {
            emails = emails.filter(e => user.allowed_domains.includes(e.domain));
        }

        state.emails = emails;

        // Apply filters
        applyFilters();

        UI.updateStats();

        // Sync to Supabase for tracking
        if (window.Tracking) {
            await Tracking.syncEmails(emails, state.currentDomain);
        }
    } catch (error) {
        console.error('Error loading emails:', error);
        UI.showToast('error', 'Error', 'No se pudieron cargar los correos');
        elements.emailsTableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <p>Error al cargar correos: ${error.message}</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Apply filters to emails
function applyFilters() {
    let filtered = [...state.emails];

    // Filter by status
    if (state.filters.status === 'active') {
        filtered = filtered.filter(e => !e.suspended_login);
    } else if (state.filters.status === 'suspended') {
        filtered = filtered.filter(e => e.suspended_login);
    }

    // Filter by search
    if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        filtered = filtered.filter(e =>
            e.email?.toLowerCase().includes(search) ||
            e.user?.toLowerCase().includes(search)
        );
    }

    state.filteredEmails = filtered;

    // Update filter results text
    if (elements.filterResults) {
        if (state.filters.status !== 'all' || state.filters.search) {
            elements.filterResults.textContent = `${filtered.length} de ${state.emails.length} correos`;
        } else {
            elements.filterResults.textContent = `${state.emails.length} correos`;
        }
    }

    UI.renderEmails(filtered);
}

async function loadTracking() {
    await UI.renderTracking();
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Navigation
    elements.sidebarNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            UI.switchSection(item.dataset.section);
            elements.sidebar.classList.remove('open');
        });
    });

    // Mobile menu
    elements.mobileMenuBtn.addEventListener('click', () => {
        elements.sidebar.classList.toggle('open');
    });

    // Domain selector
    elements.domainSelect.addEventListener('change', (e) => {
        state.currentDomain = e.target.value;
        elements.emailDomainDisplay.textContent = `@${e.target.value}`;
        loadEmails();
    });

    // Search (header search - using filter system)
    elements.searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        applyFilters();
    });

    // Refresh
    elements.refreshBtn.addEventListener('click', () => {
        loadEmails();
    });

    // Filter listeners
    if (elements.filterStatus) {
        elements.filterStatus.addEventListener('change', (e) => {
            state.filters.status = e.target.value;
            applyFilters();
        });
    }

    if (elements.filterSearch) {
        elements.filterSearch.addEventListener('input', (e) => {
            state.filters.search = e.target.value;
            // Also sync with header search
            elements.searchInput.value = e.target.value;
            applyFilters();
        });
    }

    if (elements.clearFiltersBtn) {
        elements.clearFiltersBtn.addEventListener('click', () => {
            state.filters.status = 'all';
            state.filters.search = '';
            elements.filterStatus.value = 'all';
            elements.filterSearch.value = '';
            elements.searchInput.value = '';
            applyFilters();
        });
    }

    // Add Email Modal
    elements.addEmailBtn.addEventListener('click', () => {
        elements.addEmailForm.reset();
        elements.passwordStrength.innerHTML = '';
        UI.openModal(elements.addEmailModal);
    });

    elements.closeModalBtn.addEventListener('click', () => {
        UI.closeModal(elements.addEmailModal);
    });

    elements.cancelAddEmail.addEventListener('click', () => {
        UI.closeModal(elements.addEmailModal);
    });

    // Password visibility toggle
    elements.togglePassword.addEventListener('click', () => {
        const type = elements.emailPassword.type === 'password' ? 'text' : 'password';
        elements.emailPassword.type = type;
        elements.togglePassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });

    // Generate password
    elements.generatePassword.addEventListener('click', () => {
        const password = generateSecurePassword();
        elements.emailPassword.value = password;
        elements.emailPassword.type = 'text';
        elements.togglePassword.textContent = '👁️‍🗨️';
        updatePasswordStrength(password, elements.passwordStrength);
    });

    // Password strength indicator
    elements.emailPassword.addEventListener('input', (e) => {
        updatePasswordStrength(e.target.value, elements.passwordStrength);
    });

    // Add Email Form Submit
    elements.addEmailForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = elements.emailUsername.value.trim();
        const password = elements.emailPassword.value;
        const quota = parseInt(elements.emailQuota.value) || 1024;

        if (!email || !password) {
            UI.showToast('error', 'Error', 'Por favor completa todos los campos');
            return;
        }

        try {
            await API.createEmail(email, password, quota, state.currentDomain);
            UI.showToast('success', 'Cuenta Creada', `${email}@${state.currentDomain}`);

            // Log tracking
            await Tracking.logActivity('created', `${email}@${state.currentDomain}`, state.currentDomain, {
                quota: quota
            });

            UI.closeModal(elements.addEmailModal);
            loadEmails();
        } catch (error) {
            UI.showToast('error', 'Error', error.message);
        }
    });

    // Change Password Modal
    elements.closePasswordModalBtn.addEventListener('click', () => {
        UI.closeModal(elements.changePasswordModal);
    });

    elements.cancelChangePassword.addEventListener('click', () => {
        UI.closeModal(elements.changePasswordModal);
    });

    elements.toggleNewPassword.addEventListener('click', () => {
        const type = elements.newPassword.type === 'password' ? 'text' : 'password';
        elements.newPassword.type = type;
        elements.toggleNewPassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });

    elements.generateNewPassword.addEventListener('click', () => {
        const password = generateSecurePassword();
        elements.newPassword.value = password;
        elements.newPassword.type = 'text';
        elements.toggleNewPassword.textContent = '👁️‍🗨️';
        updatePasswordStrength(password, elements.newPasswordStrength);
    });

    elements.newPassword.addEventListener('input', (e) => {
        updatePasswordStrength(e.target.value, elements.newPasswordStrength);
    });

    elements.changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = elements.passwordEmail.value;
        const domain = elements.passwordDomain.value;
        const password = elements.newPassword.value;

        if (!password) {
            UI.showToast('error', 'Error', 'Por favor ingresa una contraseña');
            return;
        }

        try {
            await API.changePassword(email, password, domain);
            UI.showToast('success', 'Contraseña Cambiada', `${email}@${domain}`);

            // Log tracking
            await Tracking.logActivity('password_changed', `${email}@${domain}`, domain);

            UI.closeModal(elements.changePasswordModal);
        } catch (error) {
            UI.showToast('error', 'Error', error.message);
        }
    });

    // Delete Confirmation Modal
    elements.closeDeleteModalBtn.addEventListener('click', () => {
        UI.closeModal(elements.confirmDeleteModal);
        state.emailToDelete = null;
    });

    elements.cancelDelete.addEventListener('click', () => {
        UI.closeModal(elements.confirmDeleteModal);
        state.emailToDelete = null;
    });

    elements.confirmDelete.addEventListener('click', () => {
        Actions.deleteEmail();
    });

    // Close modals on overlay click
    [elements.addEmailModal, elements.changePasswordModal, elements.confirmDeleteModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                UI.closeModal(modal);
                state.emailToDelete = null;
            }
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            UI.closeModal(elements.addEmailModal);
            UI.closeModal(elements.changePasswordModal);
            UI.closeModal(elements.confirmDeleteModal);
            UI.closeModal(elements.userModal);
            UI.closeModal(elements.confirmUserDeleteModal);
            state.emailToDelete = null;
            state.userToEdit = null;
            state.userToDelete = null;
            elements.userMenu.classList.remove('open');
        }
    });

    // ============================================
    // User Menu Events
    // ============================================
    elements.userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.userMenu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!elements.userMenu.contains(e.target)) {
            elements.userMenu.classList.remove('open');
        }
    });

    elements.logoutBtn.addEventListener('click', () => {
        Auth.logout();
    });

    // ============================================
    // User Management Events (Admin Only)
    // ============================================
    if (Auth.isAdmin()) {
        // Add User Button
        elements.addUserBtn.addEventListener('click', () => {
            openUserModal();
        });

        // User Modal
        elements.closeUserModalBtn.addEventListener('click', () => {
            UI.closeModal(elements.userModal);
            state.userToEdit = null;
        });

        elements.cancelUserModal.addEventListener('click', () => {
            UI.closeModal(elements.userModal);
            state.userToEdit = null;
        });

        // Toggle password visibility
        elements.toggleUserPassword.addEventListener('click', () => {
            const type = elements.userPasswordInput.type === 'password' ? 'text' : 'password';
            elements.userPasswordInput.type = type;
            elements.toggleUserPassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        });

        // Generate password
        elements.generateUserPassword.addEventListener('click', () => {
            const password = generateSecurePassword();
            elements.userPasswordInput.value = password;
            elements.userPasswordInput.type = 'text';
            elements.toggleUserPassword.textContent = '👁️‍🗨️';
            updatePasswordStrength(password, elements.userPasswordStrength);
        });

        // Password strength
        elements.userPasswordInput.addEventListener('input', (e) => {
            updatePasswordStrength(e.target.value, elements.userPasswordStrength);
        });

        // User Form Submit
        elements.userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveUser();
        });

        // Confirm User Delete Modal
        elements.closeUserDeleteModalBtn.addEventListener('click', () => {
            UI.closeModal(elements.confirmUserDeleteModal);
            state.userToDelete = null;
        });

        elements.cancelUserDelete.addEventListener('click', () => {
            UI.closeModal(elements.confirmUserDeleteModal);
            state.userToDelete = null;
        });

        elements.confirmUserDelete.addEventListener('click', async () => {
            await deleteUser();
        });

        // User Modal click outside
        elements.userModal.addEventListener('click', (e) => {
            if (e.target === elements.userModal) {
                UI.closeModal(elements.userModal);
                state.userToEdit = null;
            }
        });

        elements.confirmUserDeleteModal.addEventListener('click', (e) => {
            if (e.target === elements.confirmUserDeleteModal) {
                UI.closeModal(elements.confirmUserDeleteModal);
                state.userToDelete = null;
            }
        });
    }
}

// ============================================
// User Management Functions
// ============================================
function openUserModal(user = null) {
    state.userToEdit = user;

    // Reset form
    elements.userForm.reset();
    elements.userPasswordStrength.innerHTML = '';

    if (user) {
        // Edit mode
        elements.userModalTitle.textContent = 'Editar Usuario';
        elements.editUserId.value = user.id;
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        elements.userRoleSelect.value = user.role;
        elements.userPasswordInput.required = false;
        elements.passwordHint.textContent = 'Dejar en blanco para mantener la contraseña actual';
        elements.submitUserBtn.innerHTML = '<span class="btn-icon">💾</span> Guardar Cambios';
    } else {
        // Create mode
        elements.userModalTitle.textContent = 'Nuevo Usuario';
        elements.editUserId.value = '';
        elements.userPasswordInput.required = true;
        elements.passwordHint.textContent = 'El usuario recibirá esta contraseña temporal';
        elements.submitUserBtn.innerHTML = '<span class="btn-icon">+</span> Crear Usuario';
    }

    // Render domains checklist
    renderDomainsChecklist(user?.allowed_domains || []);

    // Update domains group visibility based on role
    updateDomainsGroupVisibility();

    // Listen for role changes
    elements.userRoleSelect.addEventListener('change', updateDomainsGroupVisibility);

    UI.openModal(elements.userModal);
}

// Render the domains checklist in user modal
function renderDomainsChecklist(selectedDomains = []) {
    if (!elements.domainsChecklist) return;

    if (state.domains.length === 0) {
        elements.domainsChecklist.innerHTML = '<p class="loading-text">No hay dominios disponibles</p>';
        return;
    }

    elements.domainsChecklist.innerHTML = state.domains.map(domain => `
        <div class="domain-checkbox-item">
            <input type="checkbox" 
                   id="domain_${domain.replace(/\./g, '_')}" 
                   name="allowed_domains" 
                   value="${domain}"
                   ${selectedDomains.includes(domain) ? 'checked' : ''}>
            <label for="domain_${domain.replace(/\./g, '_')}">${domain}</label>
        </div>
    `).join('');
}

// Update domains group visibility based on selected role
function updateDomainsGroupVisibility() {
    if (!elements.allowedDomainsGroup) return;

    const role = elements.userRoleSelect.value;
    if (role === 'admin') {
        elements.allowedDomainsGroup.classList.add('admin-role');
    } else {
        elements.allowedDomainsGroup.classList.remove('admin-role');
    }
}

// Get selected domains from checklist
function getSelectedDomains() {
    if (!elements.domainsChecklist) return [];

    const checkboxes = elements.domainsChecklist.querySelectorAll('input[name="allowed_domains"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

async function saveUser() {
    const userId = elements.editUserId.value;
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const role = elements.userRoleSelect.value;
    const password = elements.userPasswordInput.value;
    const allowed_domains = role === 'admin' ? [] : getSelectedDomains();

    if (!name || !email) {
        UI.showToast('error', 'Error', 'Por favor completa todos los campos requeridos');
        return;
    }

    try {
        if (userId) {
            // Update existing user
            const updates = { name, email, role, allowed_domains };
            if (password) {
                updates.password = password;
            }
            await UserManager.updateUser(userId, updates);
            UI.showToast('success', 'Usuario Actualizado', `${name} ha sido actualizado correctamente`);
        } else {
            // Create new user
            if (!password || password.length < 8) {
                UI.showToast('error', 'Error', 'La contraseña debe tener al menos 8 caracteres');
                return;
            }
            await UserManager.createUser({ name, email, password, role, allowed_domains });
            UI.showToast('success', 'Usuario Creado', `${name} ha sido creado correctamente`);
        }

        UI.closeModal(elements.userModal);
        state.userToEdit = null;
        await loadUsers();
    } catch (error) {
        UI.showToast('error', 'Error', error.message);
    }
}

function confirmUserDelete(user) {
    state.userToDelete = user;
    elements.userToDelete.textContent = `${user.name} (${user.email})`;
    UI.openModal(elements.confirmUserDeleteModal);
}

async function deleteUser() {
    if (!state.userToDelete) return;

    try {
        await UserManager.deleteUser(state.userToDelete.id);
        UI.showToast('success', 'Usuario Desactivado', `${state.userToDelete.name} ha sido desactivado`);
        UI.closeModal(elements.confirmUserDeleteModal);
        state.userToDelete = null;
        await loadUsers();
    } catch (error) {
        UI.showToast('error', 'Error', error.message);
    }
}

async function reactivateUser(userId, userName) {
    try {
        await UserManager.reactivateUser(userId);
        UI.showToast('success', 'Usuario Reactivado', `${userName} ha sido reactivado`);
        await loadUsers();
    } catch (error) {
        UI.showToast('error', 'Error', error.message);
    }
}

async function loadUsers() {
    if (!Auth.isAdmin()) return;

    elements.usersTableBody.innerHTML = `
        <tr class="loading-row">
            <td colspan="5">
                <div class="loading-spinner"></div>
                <span>Cargando usuarios...</span>
            </td>
        </tr>
    `;

    try {
        const users = await UserManager.getAllUsers();
        state.users = users;
        renderUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
        elements.usersTableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <p>Error al cargar usuarios: ${error.message}</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

function renderUsers(users) {
    if (!users || users.length === 0) {
        elements.usersTableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <p>No hay usuarios registrados</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    elements.usersTableBody.innerHTML = users.map(user => {
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
        const isCurrentUser = user.id === Auth.currentUser.id;
        const lastLogin = user.last_login
            ? getTimeAgo(new Date(user.last_login))
            : '<span class="never-logged">Nunca</span>';

        return `
            <tr data-user-id="${user.id}" class="${!user.is_active ? 'user-status-inactive' : ''}">
                <td>
                    <div class="user-cell">
                        <div class="user-cell-avatar">${initials}</div>
                        <div class="user-cell-info">
                            <span class="user-cell-name">${user.name}${isCurrentUser ? ' (Tú)' : ''}</span>
                            <span class="user-cell-email">${user.email}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="role-badge ${user.role}">
                        ${user.role === 'admin' ? '👑 Administrador' : '📧 Gerente'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${user.is_active ? 'active' : 'suspended'}">
                        ${user.is_active ? '✅ Activo' : '⏸️ Inactivo'}
                    </span>
                </td>
                <td>
                    <span class="last-login-text">${lastLogin}</span>
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="action-btn" onclick="openUserModal(${JSON.stringify(user).replace(/"/g, '&quot;')})" title="Editar">
                            ✏️
                        </button>
                        ${user.is_active && !isCurrentUser ? `
                            <button class="action-btn danger" onclick="confirmUserDelete(${JSON.stringify(user).replace(/"/g, '&quot;')})" title="Desactivar">
                                🗑️
                            </button>
                        ` : ''}
                        ${!user.is_active ? `
                            <button class="action-btn" onclick="reactivateUser('${user.id}', '${user.name}')" title="Reactivar" style="color: var(--color-success);">
                                ▶️
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Make user functions global for inline onclick handlers
window.openUserModal = openUserModal;
window.confirmUserDelete = confirmUserDelete;
window.reactivateUser = reactivateUser;

// ============================================
// Setup User Interface
// ============================================
function setupUserInterface() {
    const user = Auth.getUser();
    if (!user) return;

    // Update user menu
    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
    elements.userAvatar.textContent = initials;
    elements.userName.textContent = user.name;
    elements.userRoleBadge.textContent = user.role === 'admin' ? 'Admin' : 'Gerente';
    elements.userRoleBadge.className = `user-role-badge ${user.role}`;
    elements.dropdownUserName.textContent = user.name;
    elements.dropdownUserEmail.textContent = user.email;

    // Show/hide admin elements
    if (Auth.isAdmin()) {
        document.body.classList.add('is-admin');
    } else {
        document.body.classList.remove('is-admin');
    }
}

// ============================================
// Initialization
// ============================================
async function init() {
    console.log('🚀 Initializing Email Admin Panel...');
    console.log('👤 Logged in as:', Auth.getUser()?.name, '| Role:', Auth.getUser()?.role);

    // Setup user interface
    setupUserInterface();

    setupEventListeners();

    // Check server connection
    UI.updateConnectionStatus(null, 'Conectando...');
    const isConnected = await API.checkHealth();

    if (isConnected) {
        UI.updateConnectionStatus(true, 'Conectado');

        // Load initial data
        await loadDomains();
        await loadEmails();

        UI.showToast('success', 'Bienvenido', `Hola ${Auth.getUser()?.name || 'Usuario'}`);
    } else {
        UI.updateConnectionStatus(false, 'Sin conexión');
        UI.showToast('error', 'Error de Conexión', 'No se pudo conectar al servidor. Verifica la configuración del backend.');
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', init);



