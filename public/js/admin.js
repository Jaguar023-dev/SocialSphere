// Updated SocialSphere Admin Panel using API
class SocialSphereAdmin {
    constructor() {
        this.api = api;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuth();
    }

    async checkAuth() {
        const user = await this.api.getCurrentUser();
        
        if (!user || !user.isAdmin) {
            this.showAdminLogin();
        } else {
            this.showAdminDashboard();
            await this.loadDashboard();
        }
    }

    setupEventListeners() {
        // Admin Login
        document.getElementById('adminLoginBtn').addEventListener('click', () => this.adminLogin());
        
        // Logout
        document.getElementById('logoutAdmin').addEventListener('click', () => this.adminLogout());
        
        // Export Data
        document.getElementById('exportData').addEventListener('click', () => this.exportData());
        
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // User Management
        document.getElementById('addUserBtn').addEventListener('click', () => this.addUser());
        document.getElementById('searchUsers').addEventListener('input', (e) => this.searchUsers(e.target.value));
        
        // Content Moderation
        document.getElementById('refreshPosts').addEventListener('click', () => this.loadPostsForModeration());
        document.getElementById('clearAllPosts').addEventListener('click', () => this.clearAllPosts());
        
        // Monetization
        document.getElementById('updateRateBtn').addEventListener('click', () => this.updateAdRate());
        
        // System Settings
        document.getElementById('applyThemeBtn').addEventListener('click', () => this.applyTheme());
        document.getElementById('clearAllData').addEventListener('click', () => this.clearAllData());
        document.getElementById('resetToDefault').addEventListener('click', () => this.resetToDefault());
        document.getElementById('nukeApp').addEventListener('click', () => this.nukeApp());
    }

    showAdminLogin() {
        document.getElementById('adminLogin').style.display = 'flex';
        document.getElementById('adminDashboard').style.display = 'none';
    }

    showAdminDashboard() {
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
    }

    async adminLogin() {
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;
        
        try {
            const result = await this.api.adminLogin(username, password);
            if (result.success) {
                this.showAdminDashboard();
                await this.loadDashboard();
            }
        } catch (error) {
            alert('Invalid admin credentials');
        }
    }

    adminLogout() {
        this.api.logout();
        this.showAdminLogin();
    }

    async loadDashboard() {
        await this.loadAdminStats();
        await this.loadUsersTable();
        await this.loadPostsForModeration();
        await this.loadPayouts();
        await this.loadVerificationRequests();
    }

    switchTab(tabName) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });
        
        // Show selected tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
            if (pane.id === `${tabName}-tab`) {
                pane.classList.add('active');
            }
        });
    }

    async loadAdminStats() {
        try {
            const stats = await this.api.getStatistics();
            
            document.getElementById('totalUsers').textContent = stats.totalUsers;
            document.getElementById('totalPosts').textContent = stats.totalPosts;
            document.getElementById('totalMessages').textContent = stats.totalMessages;
            document.getElementById('totalRevenue').textContent = `$${stats.totalRevenue.toFixed(2)}`;
        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    }

    async loadUsersTable() {
        try {
            const users = await this.api.getUsers();
            const usersTable = document.getElementById('usersTable');
            usersTable.innerHTML = '';
            
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.id.substring(0, 8)}...</td>
                    <td>
                        ${user.username}
                        ${user.verified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i></span>' : ''}
                    </td>
                    <td>${user.email || 'N/A'}</td>
                    <td>
                        <span class="status ${user.verified ? 'verified' : 'pending'}">
                            ${user.verified ? 'Verified' : 'Pending'}
                        </span>
                    </td>
                    <td>
                        <span class="status active">Active</span>
                    </td>
                    <td>$${(user.balance || 0).toFixed(2)}</td>
                    <td>
                        <button class="btn-action btn-edit" onclick="socialSphereAdmin.editUser('${user.id}', '${user.username}', '${user.email || ''}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-verify" onclick="socialSphereAdmin.verifyUser('${user.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="socialSphereAdmin.deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                usersTable.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    searchUsers(query) {
        const rows = document.querySelectorAll('#usersTable tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
        });
    }

    async addUser() {
        const username = prompt('Enter username for new user:');
        if (!username) return;
        
        const password = prompt('Enter password:');
        if (!password) return;
        
        const email = prompt('Enter email (optional):');
        
        try {
            await this.api.register(username, password, email);
            alert('User added successfully!');
            await this.loadUsersTable();
            await this.loadAdminStats();
        } catch (error) {
            alert(error.message || 'Failed to add user');
        }
    }

    editUser(userId, currentUsername, currentEmail) {
        const newUsername = prompt('Edit username:', currentUsername);
        if (!newUsername) return;
        
        const newEmail = prompt('Edit email:', currentEmail);
        
        // Note: In a real app, you'd have an API endpoint to update other users
        // For now, we'll just show a message
        alert('User update feature requires additional API endpoint implementation');
    }

    async verifyUser(userId) {
        if (confirm('Verify this user?')) {
            try {
                await this.api.verifyUser(userId);
                alert('User verified successfully!');
                await this.loadUsersTable();
                await this.loadVerificationRequests();
            } catch (error) {
                alert(error.message || 'Failed to verify user');
            }
        }
    }

    async deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                await this.api.deleteUser(userId);
                alert('User deleted successfully!');
                await this.loadUsersTable();
                await this.loadAdminStats();
            } catch (error) {
                alert(error.message || 'Failed to delete user');
            }
        }
    }

    async loadPostsForModeration() {
        try {
            const posts = await this.api.getPosts();
            const moderationPosts = document.getElementById('moderationPosts');
            moderationPosts.innerHTML = '';
            
            posts.slice(0, 10).forEach(post => {
                const postElement = document.createElement('div');
                postElement.className = 'post-moderation';
                postElement.innerHTML = `
                    <div class="post-header">
                        <strong>${post.user?.username || 'Unknown User'}</strong>
                        <small>${new Date(post.createdAt).toLocaleString()}</small>
                    </div>
                    <p>${post.content.substring(0, 200)}${post.content.length > 200 ? '...' : ''}</p>
                    <div class="post-stats">
                        <small>Likes: ${post.likes?.length || 0} | Comments: ${post.comments?.length || 0} | Shares: ${post.shares || 0}</small>
                    </div>
                    <div class="post-actions">
                        <button class="btn-action btn-delete" onclick="socialSphereAdmin.deletePost('${post.id}')">
                            <i class="fas fa-trash"></i> Delete Post
                        </button>
                    </div>
                `;
                moderationPosts.appendChild(postElement);
            });
        } catch (error) {
            console.error('Failed to load posts for moderation:', error);
        }
    }

    async deletePost(postId) {
        if (confirm('Delete this post?')) {
            try {
                await this.api.deletePost(postId);
                alert('Post deleted!');
                await this.loadPostsForModeration();
                await this.loadAdminStats();
            } catch (error) {
                alert(error.message || 'Failed to delete post');
            }
        }
    }

    async clearAllPosts() {
        if (confirm('This will delete ALL posts. Are you sure?')) {
            // Note: In a real app, you'd have an API endpoint for this
            alert('This feature requires additional API endpoint implementation');
        }
    }

    async updateAdRate() {
        const newRate = parseFloat(document.getElementById('adRate').value);
        
        if (isNaN(newRate) || newRate < 0) {
            alert('Please enter a valid rate');
            return;
        }
        
        // Note: In a real app, you'd save this to the database
        localStorage.setItem('socialsphere_ad_rate', newRate.toString());
        alert(`Ad rate updated to $${newRate.toFixed(2)} per 1000 views`);
    }

    async loadPayouts() {
        try {
            const users = await this.api.getUsers();
            const payoutsList = document.getElementById('payoutsList');
            payoutsList.innerHTML = '';
            
            // Show users with balance > $10
            const eligibleUsers = users.filter(user => (user.balance || 0) >= 10);
            
            if (eligibleUsers.length === 0) {
                payoutsList.innerHTML = '<p>No pending payouts</p>';
                return;
            }
            
            eligibleUsers.forEach(user => {
                const payoutElement = document.createElement('div');
                payoutElement.className = 'payout-item';
                payoutElement.innerHTML = `
                    <strong>${user.username}</strong>
                    <p>Balance: $${user.balance.toFixed(2)}</p>
                    <button class="btn-action btn-verify" onclick="socialSphereAdmin.processPayout('${user.id}', '${user.username}')">
                        Process Payout
                    </button>
                `;
                payoutsList.appendChild(payoutElement);
            });
        } catch (error) {
            console.error('Failed to load payouts:', error);
        }
    }

    async processPayout(userId, username) {
        if (confirm(`Process $10 payout for ${username}?`)) {
            // Note: In a real app, this would connect to a payment processor
            // For now, we'll just show a message
            alert(`Payout of $10 processed for ${username} (simulated)`);
            
            // You would typically update the user's balance here
            await this.loadPayouts();
        }
    }

    async loadVerificationRequests() {
        try {
            const users = await this.api.getUsers();
            const verificationRequests = document.getElementById('verificationRequests');
            
            // Show users who aren't verified yet
            const pendingUsers = users.filter(user => !user.verified);
            
            if (pendingUsers.length === 0) {
                verificationRequests.innerHTML = '<p>No pending verification requests</p>';
                return;
            }
            
            verificationRequests.innerHTML = '';
            pendingUsers.forEach(user => {
                const requestElement = document.createElement('div');
                requestElement.className = 'verification-item';
                requestElement.innerHTML = `
                    <div class="verification-info">
                        <h4>${user.username}</h4>
                        <p>Joined: ${new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div class="verification-actions">
                        <button class="btn-action btn-verify" onclick="socialSphereAdmin.approveVerification('${user.id}')">
                            Approve
                        </button>
                        <button class="btn-action btn-delete">
                            Reject
                        </button>
                    </div>
                `;
                verificationRequests.appendChild(requestElement);
            });
        } catch (error) {
            console.error('Failed to load verification requests:', error);
        }
    }

    async approveVerification(userId) {
        try {
            await this.api.verifyUser(userId);
            alert('User verified!');
            await this.loadVerificationRequests();
            await this.loadUsersTable();
        } catch (error) {
            alert(error.message || 'Failed to verify user');
        }
    }

    applyTheme() {
        const theme = document.getElementById('themeSelect').value;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('socialsphere_theme', theme);
        alert(`Theme changed to ${theme}`);
    }

    async clearAllData() {
        if (confirm('This will reset all app data to defaults. Are you sure?')) {
            // Note: In a real app, you'd have an API endpoint for this
            alert('This feature requires additional API endpoint implementation');
        }
    }

    resetToDefault() {
        if (confirm('Reset all settings to default values?')) {
            localStorage.removeItem('socialsphere_ad_rate');
            localStorage.removeItem('socialsphere_theme');
            document.getElementById('adRate').value = '5.00';
            document.getElementById('themeSelect').value = 'light';
            alert('Settings reset to defaults!');
        }
    }

    nukeApp() {
        if (confirm('⚠️ DANGER! This will delete ALL local data and cannot be undone. Type "NUKE" to confirm:')) {
            const confirmation = prompt('Type "NUKE" to confirm:');
            if (confirmation === 'NUKE') {
                localStorage.clear();
                this.api.clearAuth();
                alert('Application data nuked! Redirecting...');
                setTimeout(() => location.href = '/', 1000);
            }
        }
    }

    async exportData() {
        try {
            await this.api.exportData();
        } catch (error) {
            alert(error.message || 'Failed to export data');
        }
    }
}

// Initialize admin panel
const socialSphereAdmin = new SocialSphereAdmin();