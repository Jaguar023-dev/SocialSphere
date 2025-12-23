// API Service for SocialSphere
class SocialSphereAPI {
    constructor() {
        this.baseURL = window.location.origin; // Same origin as the server
        this.token = localStorage.getItem('socialsphere_token');
        this.user = JSON.parse(localStorage.getItem('socialsphere_user') || 'null');
    }

    setAuth(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('socialsphere_token', token);
        localStorage.setItem('socialsphere_user', JSON.stringify(user));
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('socialsphere_token');
        localStorage.removeItem('socialsphere_user');
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${this.baseURL}/api${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }

        return data;
    }

    // Auth methods
    async register(username, password, email = '') {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, email })
        });
        
        if (data.success) {
            this.setAuth(data.token, data.user);
        }
        
        return data;
    }

    async login(username, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (data.success) {
            this.setAuth(data.token, data.user);
        }
        
        return data;
    }

    async adminLogin(username, password) {
        const data = await this.request('/auth/admin-login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (data.success) {
            this.setAuth(data.token, data.user);
        }
        
        return data;
    }

    logout() {
        this.clearAuth();
    }

    // User methods
    async getCurrentUser() {
        if (!this.token) return null;
        
        try {
            const user = await this.request('/users/me');
            this.user = user;
            localStorage.setItem('socialsphere_user', JSON.stringify(user));
            return user;
        } catch (error) {
            this.clearAuth();
            return null;
        }
    }

    async updateUser(updates) {
        return this.request('/users/me', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    // Post methods
    async getPosts() {
        return this.request('/posts');
    }

    async createPost(content, media = null) {
        return this.request('/posts', {
            method: 'POST',
            body: JSON.stringify({ content, media })
        });
    }

    async deletePost(postId) {
        return this.request(`/posts/${postId}`, {
            method: 'DELETE'
        });
    }

    async likePost(postId) {
        return this.request(`/posts/${postId}/like`, {
            method: 'POST'
        });
    }

    // Message methods
    async getMessages() {
        return this.request('/messages');
    }

    async sendMessage(receiverId, content) {
        return this.request('/messages', {
            method: 'POST',
            body: JSON.stringify({ receiverId, content })
        });
    }

    // Notification methods
    async getNotifications() {
        return this.request('/notifications');
    }

    async markNotificationAsRead(notificationId) {
        return this.request(`/notifications/${notificationId}/read`, {
            method: 'PUT'
        });
    }

    // Friend methods
    async getFriends() {
        return this.request('/friends');
    }

    async sendFriendRequest(friendId) {
        return this.request('/friends/request', {
            method: 'POST',
            body: JSON.stringify({ friendId })
        });
    }

    async acceptFriendRequest(friendId) {
        return this.request('/friends/accept', {
            method: 'POST',
            body: JSON.stringify({ friendId })
        });
    }

    // Admin methods
    async getStatistics() {
        return this.request('/admin/statistics');
    }

    async getUsers() {
        return this.request('/admin/users');
    }

    async verifyUser(userId) {
        return this.request(`/admin/users/${userId}/verify`, {
            method: 'PUT'
        });
    }

    async deleteUser(userId) {
        return this.request(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
    }

    async exportData() {
        const response = await fetch(`${this.baseURL}/api/admin/export`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Export failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `socialsphere-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
}

// Create global API instance
const api = new SocialSphereAPI();