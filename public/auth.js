// ============================================
// Authentication Module
// ============================================

const Auth = {
    currentUser: null,
    sessionToken: null,

    // Initialize auth state from localStorage
    init() {
        const savedUser = localStorage.getItem('mailAdmin_user');
        const savedToken = localStorage.getItem('mailAdmin_token');

        if (savedUser && savedToken) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.sessionToken = savedToken;
                return true;
            } catch (e) {
                this.logout();
                return false;
            }
        }
        return false;
    },

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null && this.sessionToken !== null;
    },

    // Check if current user is admin
    isAdmin() {
        return this.currentUser?.role === 'admin';
    },

    // Check if current user is gerente
    isGerente() {
        return this.currentUser?.role === 'gerente';
    },

    // Get current user
    getUser() {
        return this.currentUser;
    },

    // Simple hash function (for demo - in production use bcrypt on server)
    simpleHash(str) {
        return btoa(str);
    },

    // Verify password
    verifyPassword(inputPassword, storedHash) {
        return this.simpleHash(inputPassword) === storedHash;
    },

    // Login
    async login(email, password) {
        try {
            // Query user from Supabase
            const users = await supabase.query('platform_users', {
                select: '*'
            });

            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            if (!user.is_active) {
                throw new Error('Tu cuenta está desactivada. Contacta al administrador.');
            }

            // Verify password
            if (!this.verifyPassword(password, user.password_hash)) {
                throw new Error('Contraseña incorrecta');
            }

            // Generate session token
            const token = this.generateToken();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours session

            // Save session to database
            await supabase.insert('user_sessions', {
                user_id: user.id,
                token: token,
                expires_at: expiresAt.toISOString()
            });

            // Update last login
            await this.updateLastLogin(user.id);

            // Store in memory and localStorage
            this.currentUser = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                temp_password: user.temp_password,
                allowed_domains: user.allowed_domains || []
            };
            this.sessionToken = token;

            localStorage.setItem('mailAdmin_user', JSON.stringify(this.currentUser));
            localStorage.setItem('mailAdmin_token', token);

            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    // Update last login timestamp
    async updateLastLogin(userId) {
        try {
            const response = await fetch(`${supabase.url}/rest/v1/platform_users?id=eq.${userId}`, {
                method: 'PATCH',
                headers: supabase.headers,
                body: JSON.stringify({ last_login: new Date().toISOString() })
            });
        } catch (e) {
            console.warn('Could not update last login:', e);
        }
    },

    // Generate random token
    generateToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    // Logout
    async logout() {
        // Remove session from database
        if (this.sessionToken) {
            try {
                await fetch(`${supabase.url}/rest/v1/user_sessions?token=eq.${this.sessionToken}`, {
                    method: 'DELETE',
                    headers: supabase.headers
                });
            } catch (e) {
                console.warn('Could not delete session:', e);
            }
        }

        // Clear local state
        this.currentUser = null;
        this.sessionToken = null;
        localStorage.removeItem('mailAdmin_user');
        localStorage.removeItem('mailAdmin_token');

        // Redirect to login
        window.location.href = 'login.html';
    },

    // Verify session is still valid
    async verifySession() {
        if (!this.sessionToken) return false;

        try {
            const sessions = await supabase.query('user_sessions', {
                select: 'id,expires_at'
            });

            const session = sessions.find(s => s.token === this.sessionToken);

            if (!session) {
                this.logout();
                return false;
            }

            if (new Date(session.expires_at) < new Date()) {
                this.logout();
                return false;
            }

            return true;
        } catch (e) {
            console.warn('Session verification failed:', e);
            return true; // Continue if can't verify
        }
    },

    // Check access and redirect if not logged in
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    // Check if user has admin access
    requireAdmin() {
        if (!this.isLoggedIn() || !this.isAdmin()) {
            return false;
        }
        return true;
    }
};

// ============================================
// User Management (Admin Only)
// ============================================
const UserManager = {
    // Get all users
    async getAllUsers() {
        try {
            const users = await supabase.query('platform_users', {
                select: 'id,email,name,role,is_active,temp_password,last_login,created_at,allowed_domains',
                order: 'created_at.desc'
            });
            return users;
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    },

    // Create new user
    async createUser(userData) {
        if (!Auth.isAdmin()) {
            throw new Error('Solo los administradores pueden crear usuarios');
        }

        try {
            // Check if email already exists
            const existing = await supabase.query('platform_users', {
                select: 'id'
            });

            if (existing.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
                throw new Error('Ya existe un usuario con ese correo electrónico');
            }

            const newUser = {
                email: userData.email.toLowerCase(),
                password_hash: Auth.simpleHash(userData.password),
                name: userData.name,
                role: userData.role || 'gerente',
                is_active: true,
                temp_password: true,
                allowed_domains: userData.allowed_domains || [],
                created_by: Auth.currentUser.id
            };

            const result = await supabase.insert('platform_users', newUser);
            return result[0];
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },

    // Update user
    async updateUser(userId, updates) {
        if (!Auth.isAdmin()) {
            throw new Error('Solo los administradores pueden modificar usuarios');
        }

        try {
            // If password is being changed, hash it
            if (updates.password) {
                updates.password_hash = Auth.simpleHash(updates.password);
                updates.temp_password = true;
                delete updates.password;
            }

            const result = await supabase.update('platform_users', userId, updates);
            return result[0];
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    },

    // Delete user (soft delete - deactivate)
    async deleteUser(userId) {
        if (!Auth.isAdmin()) {
            throw new Error('Solo los administradores pueden eliminar usuarios');
        }

        // Prevent deleting yourself
        if (userId === Auth.currentUser.id) {
            throw new Error('No puedes eliminar tu propia cuenta');
        }

        try {
            const result = await supabase.update('platform_users', userId, { is_active: false });
            return result;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    // Reactivate user
    async reactivateUser(userId) {
        if (!Auth.isAdmin()) {
            throw new Error('Solo los administradores pueden reactivar usuarios');
        }

        try {
            const result = await supabase.update('platform_users', userId, { is_active: true });
            return result;
        } catch (error) {
            console.error('Error reactivating user:', error);
            throw error;
        }
    },

    // Change password
    async changePassword(userId, newPassword) {
        try {
            const result = await supabase.update('platform_users', userId, {
                password_hash: Auth.simpleHash(newPassword),
                temp_password: false
            });
            return result;
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }
};

// Make available globally
window.Auth = Auth;
window.UserManager = UserManager;

// ============================================
// Login Page Logic
// ============================================
if (document.getElementById('loginForm')) {
    // If already logged in, redirect to main page
    if (Auth.init()) {
        window.location.href = 'index.html';
    }

    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // Toggle password visibility
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });

    // Handle login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showError('Por favor completa todos los campos');
            return;
        }

        // Show loading state
        loginBtn.classList.add('loading');
        loginBtn.textContent = 'Iniciando sesión...';
        loginError.classList.remove('show');

        try {
            await Auth.login(email, password);

            // Redirect to main page
            window.location.href = 'index.html';
        } catch (error) {
            showError(error.message || 'Error al iniciar sesión');
            loginBtn.classList.remove('loading');
            loginBtn.textContent = 'Iniciar Sesión';
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        loginError.classList.add('show');
    }
}
