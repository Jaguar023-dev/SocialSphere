// Updated SocialSphere App using API
class SocialSphereApp {
    constructor() {
        this.api = api;
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        await this.loadDashboard();
        this.setupRealTimeUpdates();
    }

    async checkAuth() {
        this.currentUser = await this.api.getCurrentUser();
        
        if (!this.currentUser) {
            this.showLoginModal();
        } else {
            this.hideLoginModal();
            this.updateUserInfo();
        }
    }

    showLoginModal() {
        document.getElementById('loginModal').style.display = 'flex';
    }

    hideLoginModal() {
        document.getElementById('loginModal').style.display = 'none';
    }

    setupEventListeners() {
        // Login
        document.getElementById('loginBtn').addEventListener('click', () => this.login());
        document.getElementById('registerBtn').addEventListener('click', () => this.register());
        
        // Post Creation
        document.getElementById('postBtn').addEventListener('click', () => this.createPost());
        document.getElementById('postContent').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createPost();
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        
        // Messages
        document.getElementById('sendMessageBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        document.getElementById('closeMessages').addEventListener('click', () => {
            document.getElementById('messagingPanel').style.display = 'none';
        });
    }

    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const result = await this.api.login(username, password);
            if (result.success) {
                this.currentUser = result.user;
                this.hideLoginModal();
                this.updateUserInfo();
                await this.loadDashboard();
                this.showNotification('Successfully logged in!');
            }
        } catch (error) {
            alert(error.message || 'Login failed');
        }
    }

    async register() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const email = prompt('Enter email (optional):') || '';
        
        try {
            const result = await this.api.register(username, password, email);
            if (result.success) {
                alert('Registration successful! You are now logged in.');
                this.currentUser = result.user;
                this.hideLoginModal();
                this.updateUserInfo();
                await this.loadDashboard();
            }
        } catch (error) {
            alert(error.message || 'Registration failed');
        }
    }

    logout() {
        this.api.logout();
        this.currentUser = null;
        this.showLoginModal();
        this.clearDashboard();
    }

    updateUserInfo() {
        if (this.currentUser) {
            document.getElementById('currentUser').textContent = this.currentUser.username;
            
            // Update profile picture
            const profilePics = document.querySelectorAll('.profile-pic, .profile-pic-sm');
            profilePics.forEach(pic => {
                pic.src = this.currentUser.profilePicture;
                pic.alt = this.currentUser.username;
            });
            
            // Update verification badge
            const verifiedBadge = document.querySelector('.verified-badge');
            if (this.currentUser.verified) {
                verifiedBadge.style.display = 'flex';
            } else {
                verifiedBadge.style.display = 'none';
            }
            
            // Update earnings
            const earnings = document.querySelector('.earnings');
            if (earnings) {
                earnings.textContent = `$${this.currentUser.balance.toFixed(2)}`;
            }
        }
    }

    async createPost() {
        if (!this.currentUser) return;
        
        const content = document.getElementById('postContent').value;
        
        if (!content.trim()) {
            alert('Please write something to post');
            return;
        }
        
        try {
            await this.api.createPost(content);
            document.getElementById('postContent').value = '';
            await this.loadPosts();
            this.showNotification('Post created successfully!');
        } catch (error) {
            alert(error.message || 'Failed to create post');
        }
    }

    async loadPosts() {
        try {
            const posts = await this.api.getPosts();
            const feedContainer = document.getElementById('feedContainer');
            
            if (posts.length === 0) {
                feedContainer.innerHTML = `
                    <div class="welcome-post">
                        <h2>Welcome to SocialSphere!</h2>
                        <p>Start connecting with friends, sharing moments, and exploring content.</p>
                        <button class="btn-find-friends">Find Friends</button>
                    </div>
                `;
                return;
            }
            
            feedContainer.innerHTML = '';
            
            posts.forEach(post => {
                const postElement = document.createElement('div');
                postElement.className = 'post';
                postElement.dataset.id = post.id;
                postElement.innerHTML = `
                    <div class="post-header">
                        <img src="${post.user?.profilePicture || 'https://ui-avatars.com/api/?name=User&background=random'}" 
                             alt="${post.user?.username || 'User'}" class="profile-pic-sm">
                        <div>
                            <h4>${post.user?.username || 'Unknown User'} 
                                ${post.user?.verified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i></span>' : ''}
                            </h4>
                            <small>${new Date(post.createdAt).toLocaleString()}</small>
                        </div>
                    </div>
                    <div class="post-content">
                        <p>${post.content}</p>
                        ${post.media ? `<img src="${post.media}" alt="Post media" class="post-media">` : ''}
                    </div>
                    <div class="post-stats">
                        <small>${post.likes?.length || 0} likes • ${post.comments?.length || 0} comments • ${post.shares || 0} shares</small>
                    </div>
                    <div class="post-actions">
                        <button class="post-action" onclick="socialSphere.likePost('${post.id}')">
                            <i class="fas fa-thumbs-up"></i> Like
                        </button>
                        <button class="post-action">
                            <i class="fas fa-comment"></i> Comment
                        </button>
                        <button class="post-action">
                            <i class="fas fa-share"></i> Share
                        </button>
                        ${post.userId === this.currentUser?.id ? `
                            <button class="post-action" onclick="socialSphere.deletePost('${post.id}')" style="color: #dc3545;">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        ` : ''}
                    </div>
                `;
                
                feedContainer.appendChild(postElement);
            });
        } catch (error) {
            console.error('Failed to load posts:', error);
        }
    }

    async likePost(postId) {
        if (!this.currentUser) return;
        
        try {
            const result = await this.api.likePost(postId);
            const postElement = document.querySelector(`.post[data-id="${postId}"]`);
            if (postElement) {
                const likeButton = postElement.querySelector('.post-action');
                const statsElement = postElement.querySelector('.post-stats small');
                
                if (result.liked) {
                    likeButton.innerHTML = '<i class="fas fa-thumbs-up"></i> Unlike';
                    likeButton.style.color = '#1877f2';
                } else {
                    likeButton.innerHTML = '<i class="fas fa-thumbs-up"></i> Like';
                    likeButton.style.color = '';
                }
                
                statsElement.textContent = `${result.likes} likes • ${postElement.querySelector('.post-stats small')?.textContent.split('•')[1] || '0 comments'} • ${postElement.querySelector('.post-stats small')?.textContent.split('•')[2] || '0 shares'}`;
            }
        } catch (error) {
            console.error('Failed to like post:', error);
        }
    }

    async deletePost(postId) {
        if (!confirm('Are you sure you want to delete this post?')) return;
        
        try {
            await this.api.deletePost(postId);
            document.querySelector(`.post[data-id="${postId}"]`)?.remove();
            this.showNotification('Post deleted successfully!');
        } catch (error) {
            alert(error.message || 'Failed to delete post');
        }
    }

    async loadDashboard() {
        if (!this.currentUser) return;
        
        try {
            // Load posts
            await this.loadPosts();
            
            // Load notifications
            await this.loadNotifications();
            
            // Load friends
            await this.loadFriends();
            
            // Load messages
            await this.loadMessages();
            
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        }
    }

    async loadNotifications() {
        if (!this.currentUser) return;
        
        try {
            const notifications = await this.api.getNotifications();
            const notificationsList = document.getElementById('notificationsList');
            document.getElementById('notificationCount').textContent = notifications.length;
            
            notificationsList.innerHTML = '';
            
            notifications.slice(0, 5).forEach(notification => {
                const notifElement = document.createElement('div');
                notifElement.className = 'notification-item';
                notifElement.innerHTML = `
                    <i class="fas fa-bell"></i>
                    <div>
                        <p>${notification.message}</p>
                        <small>${new Date(notification.createdAt).toLocaleTimeString()}</small>
                    </div>
                    <button onclick="socialSphere.markNotificationAsRead('${notification.id}')" 
                            class="btn-mark-read">✓</button>
                `;
                notificationsList.appendChild(notifElement);
            });
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            await this.api.markNotificationAsRead(notificationId);
            this.loadNotifications();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    async loadFriends() {
        if (!this.currentUser) return;
        
        try {
            const friendsData = await this.api.getFriends();
            document.getElementById('friendCount').textContent = friendsData.friends?.length || 0;
            document.getElementById('requestCount').textContent = friendsData.requests?.length || 0;
            
            // Load friend requests
            this.loadFriendRequests(friendsData.requests || []);
            
            // Load online friends
            this.loadOnlineFriends(friendsData.friends || []);
            
        } catch (error) {
            console.error('Failed to load friends:', error);
        }
    }

    async loadFriendRequests(requests) {
        const requestsList = document.getElementById('requestsList');
        requestsList.innerHTML = '';
        
        for (const requestId of requests.slice(0, 3)) {
            try {
                // Note: We need user details - in a real app, you'd have an endpoint for this
                // For now, we'll just show the ID
                const requestElement = document.createElement('div');
                requestElement.className = 'request-item';
                requestElement.innerHTML = `
                    <img src="https://ui-avatars.com/api/?name=User&background=random" 
                         alt="User" class="profile-pic-sm">
                    <div>
                        <strong>User ${requestId.substring(0, 8)}</strong>
                        <div class="request-actions">
                            <button class="btn-action btn-verify" onclick="socialSphere.acceptFriendRequest('${requestId}')">
                                Accept
                            </button>
                            <button class="btn-action btn-delete">
                                Delete
                            </button>
                        </div>
                    </div>
                `;
                requestsList.appendChild(requestElement);
            } catch (error) {
                console.error('Failed to load friend request:', error);
            }
        }
    }

    loadOnlineFriends(friends) {
        const onlineList = document.getElementById('onlineList');
        onlineList.innerHTML = '';
        
        friends.slice(0, 5).forEach(friendId => {
            const onlineElement = document.createElement('div');
            onlineElement.className = 'online-item';
            onlineElement.innerHTML = `
                <img src="https://ui-avatars.com/api/?name=Friend&background=random" 
                     alt="Friend" class="profile-pic-sm">
                <div>
                    <strong>Friend ${friendId.substring(0, 8)}</strong>
                    <small style="color: green;">● Online</small>
                </div>
            `;
            onlineList.appendChild(onlineElement);
        });
    }

    async loadMessages() {
        if (!this.currentUser) return;
        
        try {
            const messages = await this.api.getMessages();
            const unreadMessages = messages.filter(m => !m.read && m.receiverId === this.currentUser.id);
            document.getElementById('messageCount').textContent = unreadMessages.length;
            
            // Update messages list in panel
            this.updateMessagesPanel(messages);
            
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }

    updateMessagesPanel(messages) {
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '';
        
        messages.slice(-10).forEach(message => {
            const isSent = message.senderId === this.currentUser.id;
            const messageElement = document.createElement('div');
            messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
            messageElement.innerHTML = `
                <p>${message.content}</p>
                <small>${new Date(message.createdAt).toLocaleTimeString()}</small>
            `;
            messagesList.appendChild(messageElement);
        });
        
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    async sendMessage() {
        if (!this.currentUser) return;
        
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value;
        
        if (!content.trim()) return;
        
        // For demo, send to first friend or create a demo receiver
        try {
            const friendsData = await this.api.getFriends();
            const friendId = friendsData.friends?.[0] || 'demo-receiver';
            
            await this.api.sendMessage(friendId, content);
            messageInput.value = '';
            await this.loadMessages();
            
            // Show sent message in panel
            this.showMessageInPanel(content, true);
            
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message');
        }
    }

    showMessageInPanel(content, isSender) {
        const messagesList = document.getElementById('messagesList');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isSender ? 'sent' : 'received'}`;
        messageElement.innerHTML = `
            <p>${content}</p>
            <small>${new Date().toLocaleTimeString()}</small>
        `;
        messagesList.appendChild(messageElement);
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    async acceptFriendRequest(friendId) {
        try {
            await this.api.acceptFriendRequest(friendId);
            this.showNotification('Friend request accepted!');
            await this.loadFriends();
        } catch (error) {
            alert(error.message || 'Failed to accept friend request');
        }
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification-toast ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    clearDashboard() {
        // Reset UI elements
        document.getElementById('currentUser').textContent = 'Guest User';
        document.getElementById('friendCount').textContent = '0';
        document.getElementById('messageCount').textContent = '0';
        document.getElementById('notificationCount').textContent = '0';
        document.getElementById('requestCount').textContent = '0';
        
        // Clear lists
        document.getElementById('requestsList').innerHTML = '';
        document.getElementById('onlineList').innerHTML = '';
        document.getElementById('notificationsList').innerHTML = '';
        document.getElementById('feedContainer').innerHTML = `
            <div class="welcome-post">
                <h2>Welcome to SocialSphere!</h2>
                <p>Start connecting with friends, sharing moments, and exploring content.</p>
                <button class="btn-find-friends">Find Friends</button>
            </div>
        `;
        
        // Reset profile pictures
        document.querySelectorAll('.profile-pic, .profile-pic-sm').forEach(pic => {
            pic.src = 'https://ui-avatars.com/api/?name=User&background=random';
            pic.alt = 'User';
        });
    }

    setupRealTimeUpdates() {
        // Poll for new notifications every 30 seconds
        setInterval(async () => {
            if (this.currentUser) {
                await this.loadNotifications();
   