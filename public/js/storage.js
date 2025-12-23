// Local Storage Management for SocialSphere
class SocialSphereStorage {
    constructor() {
        this.initStorage();
    }

    initStorage() {
        // Initialize default data if not exists
        if (!localStorage.getItem('socialsphere_users')) {
            const defaultUsers = [
                {
                    id: '1',
                    username: 'admin',
                    password: 'admin123',
                    email: 'admin@socialsphere.com',
                    isAdmin: true,
                    verified: true,
                    balance: 1000.00,
                    profilePicture: 'https://ui-avatars.com/api/?name=Admin&background=dc3545',
                    bio: 'System Administrator',
                    settings: {},
                    createdAt: new Date().toISOString(),
                    friends: [],
                    friendRequests: []
                },
                {
                    id: '2',
                    username: 'user123',
                    password: 'password123',
                    email: 'user@example.com',
                    isAdmin: false,
                    verified: false,
                    balance: 50.00,
                    profilePicture: 'https://ui-avatars.com/api/?name=User&background=007bff',
                    bio: 'Regular user',
                    settings: {},
                    createdAt: new Date().toISOString(),
                    friends: [],
                    friendRequests: []
                },
                {
                    id: '3',
                    username: 'john_doe',
                    password: 'password123',
                    email: 'john@example.com',
                    isAdmin: false,
                    verified: true,
                    balance: 25.00,
                    profilePicture: 'https://ui-avatars.com/api/?name=John+Doe&background=28a745',
                    bio: 'Verified user',
                    settings: {},
                    createdAt: new Date().toISOString(),
                    friends: ['2'],
                    friendRequests: []
                }
            ];
            localStorage.setItem('socialsphere_users', JSON.stringify(defaultUsers));
        }
        
        if (!localStorage.getItem('socialsphere_posts')) {
            const defaultPosts = [
                {
                    id: '1',
                    userId: '2',
                    content: 'Welcome to SocialSphere! This is a sample post.',
                    media: null,
                    likes: ['1', '3'],
                    comments: [],
                    shares: 0,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    userId: '3',
                    content: 'Excited to be part of this new social platform!',
                    media: null,
                    likes: ['2'],
                    comments: [],
                    shares: 2,
                    createdAt: new Date(Date.now() - 3600000).toISOString()
                }
            ];
            localStorage.setItem('socialsphere_posts', JSON.stringify(defaultPosts));
        }
        
        if (!localStorage.getItem('socialsphere_messages')) {
            localStorage.setItem('socialsphere_messages', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('socialsphere_notifications')) {
            const defaultNotifications = [
                {
                    id: '1',
                    type: 'welcome',
                    message: 'Welcome to SocialSphere!',
                    userId: '2',
                    read: false,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    type: 'friend_request',
                    message: 'john_doe sent you a friend request',
                    userId: '2',
                    read: false,
                    createdAt: new Date(Date.now() - 1800000).toISOString()
                }
            ];
            localStorage.setItem('socialsphere_notifications', JSON.stringify(defaultNotifications));
        }
        
        if (!localStorage.getItem('socialsphere_settings')) {
            localStorage.setItem('socialsphere_settings', JSON.stringify({
                theme: 'light',
                emailNotifications: true,
                pushNotifications: true,
                adRate: 5.00
            }));
        }
        
        if (!localStorage.getItem('socialsphere_current_user')) {
            localStorage.setItem('socialsphere_current_user', JSON.stringify(null));
        }
    }

    // User Management
    getCurrentUser() {
        return JSON.parse(localStorage.getItem('socialsphere_current_user'));
    }

    setCurrentUser(user) {
        localStorage.setItem('socialsphere_current_user', JSON.stringify(user));
    }

    clearCurrentUser() {
        localStorage.setItem('socialsphere_current_user', JSON.stringify(null));
    }

    getUsers() {
        return JSON.parse(localStorage.getItem('socialsphere_users')) || [];
    }

    getUserById(userId) {
        const users = this.getUsers();
        return users.find(user => user.id === userId);
    }

    getUserByUsername(username) {
        const users = this.getUsers();
        return users.find(user => user.username === username);
    }

    createUser(username, password, email = '') {
        const users = this.getUsers();
        
        // Check if user exists
        if (users.find(user => user.username === username)) {
            return { success: false, message: 'Username already exists' };
        }
        
        const newUser = {
            id: Date.now().toString(),
            username,
            password, // In production, hash this!
            email,
            isAdmin: false,
            verified: false,
            balance: 0.00,
            profilePicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=007bff`,
            bio: '',
            settings: {},
            createdAt: new Date().toISOString(),
            friends: [],
            friendRequests: []
        };
        
        users.push(newUser);
        localStorage.setItem('socialsphere_users', JSON.stringify(users));
        
        // Set as current user
        this.setCurrentUser(newUser);
        
        return { success: true, user: newUser };
    }

    loginUser(username, password) {
        const users = this.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            this.setCurrentUser(user);
            return { success: true, user };
        }
        
        return { success: false, message: 'Invalid credentials' };
    }

    logoutUser() {
        this.clearCurrentUser();
    }

    updateUser(userId, updates) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updates };
            localStorage.setItem('socialsphere_users', JSON.stringify(users));
            
            // Update current user if it's the same user
            const currentUser = this.getCurrentUser();
            if (currentUser && currentUser.id === userId) {
                this.setCurrentUser(users[userIndex]);
            }
            
            return { success: true, user: users[userIndex] };
        }
        
        return { success: false, message: 'User not found' };
    }

    deleteUser(userId) {
        const users = this.getUsers();
        const filteredUsers = users.filter(u => u.id !== userId);
        localStorage.setItem('socialsphere_users', JSON.stringify(filteredUsers));
        
        // Remove user's posts
        this.deleteUserPosts(userId);
        
        // Remove user from current user if it's the same
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            this.clearCurrentUser();
        }
        
        return { success: true };
    }

    // Posts Management
    getPosts() {
        return JSON.parse(localStorage.getItem('socialsphere_posts')) || [];
    }

    createPost(userId, content, media = null) {
        const posts = this.getPosts();
        const newPost = {
            id: Date.now().toString(),
            userId,
            content,
            media,
            likes: [],
            comments: [],
            shares: 0,
            createdAt: new Date().toISOString()
        };
        
        posts.unshift(newPost);
        localStorage.setItem('socialsphere_posts', JSON.stringify(posts));
        
        // Create notification
        this.createNotification('post_created', 'Your post has been published', userId);
        
        return { success: true, post: newPost };
    }

    deletePost(postId) {
        const posts = this.getPosts();
        const filteredPosts = posts.filter(p => p.id !== postId);
        localStorage.setItem('socialsphere_posts', JSON.stringify(filteredPosts));
        return { success: true };
    }

    deleteUserPosts(userId) {
        const posts = this.getPosts();
        const filteredPosts = posts.filter(p => p.userId !== userId);
        localStorage.setItem('socialsphere_posts', JSON.stringify(filteredPosts));
        return { success: true };
    }

    likePost(postId, userId) {
        const posts = this.getPosts();
        const postIndex = posts.findIndex(p => p.id === postId);
        
        if (postIndex === -1) {
            return { success: false, message: 'Post not found' };
        }
        
        const post = posts[postIndex];
        const likeIndex = post.likes.indexOf(userId);
        
        if (likeIndex === -1) {
            // Like the post
            post.likes.push(userId);
            
            // Create notification if not liking own post
            if (post.userId !== userId) {
                this.createNotification('post_liked', 
                    `${this.getCurrentUser()?.username || 'Someone'} liked your post`, 
                    post.userId);
            }
        } else {
            // Unlike the post
            post.likes.splice(likeIndex, 1);
        }
        
        posts[postIndex] = post;
        localStorage.setItem('socialsphere_posts', JSON.stringify(posts));
        
        return { 
            success: true, 
            likes: post.likes.length,
            liked: likeIndex === -1
        };
    }

    // Messages
    getMessages() {
        return JSON.parse(localStorage.getItem('socialsphere_messages')) || [];
    }

    getUserMessages(userId) {
        const messages = this.getMessages();
        return messages.filter(m => m.senderId === userId || m.receiverId === userId);
    }

    sendMessage(senderId, receiverId, content) {
        const messages = this.getMessages();
        const newMessage = {
            id: Date.now().toString(),
            senderId,
            receiverId,
            content,
            read: false,
            createdAt: new Date().toISOString()
        };
        
        messages.push(newMessage);
        localStorage.setItem('socialsphere_messages', JSON.stringify(messages));
        
        // Create notification
        this.createNotification('new_message', 
            `New message from ${this.getUserById(senderId)?.username || 'Someone'}`, 
            receiverId);
        
        return { success: true, message: newMessage };
    }

    // Notifications
    getNotifications() {
        return JSON.parse(localStorage.getItem('socialsphere_notifications')) || [];
    }

    getUserNotifications(userId) {
        const notifications = this.getNotifications();
        return notifications.filter(n => n.userId === userId && !n.read);
    }

    createNotification(type, message, userId) {
        const notifications = this.getNotifications();
        const newNotification = {
            id: Date.now().toString(),
            type,
            message,
            userId,
            read: false,
            createdAt: new Date().toISOString()
        };
        
        notifications.push(newNotification);
        localStorage.setItem('socialsphere_notifications', JSON.stringify(notifications));
        
        return { success: true, notification: newNotification };
    }

    markNotificationAsRead(notificationId) {
        const notifications = this.getNotifications();
        const notificationIndex = notifications.findIndex(n => n.id === notificationId);
        
        if (notificationIndex !== -1) {
            notifications[notificationIndex].read = true;
            localStorage.setItem('socialsphere_notifications', JSON.stringify(notifications));
            return { success: true };
        }
        
        return { success: false, message: 'Notification not found' };
    }

    // Friends
    sendFriendRequest(fromUserId, toUserId) {
        const users = this.getUsers();
        const toUserIndex = users.findIndex(u => u.id === toUserId);
        
        if (toUserIndex === -1) {
            return { success: false, message: 'User not found' };
        }
        
        // Add to friend requests
        if (!users[toUserIndex].friendRequests.includes(fromUserId)) {
            users[toUserIndex].friendRequests.push(fromUserId);
            localStorage.setItem('socialsphere_users', JSON.stringify(users));
            
            // Create notification
            this.createNotification('friend_request', 
                `${this.getUserById(fromUserId)?.username || 'Someone'} sent you a friend request`, 
                toUserId);
            
            return { success: true };
        }
        
        return { success: false, message: 'Friend request already sent' };
    }

    acceptFriendRequest(userId, requesterId) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        const requesterIndex = users.findIndex(u => u.id === requesterId);
        
        if (userIndex === -1 || requesterIndex === -1) {
            return { success: false, message: 'User not found' };
        }
        
        // Remove from friend requests
        users[userIndex].friendRequests = users[userIndex].friendRequests.filter(id => id !== requesterId);
        
        // Add to friends (both ways)
        if (!users[userIndex].friends.includes(requesterId)) {
            users[userIndex].friends.push(requesterId);
        }
        if (!users[requesterIndex].friends.includes(userId)) {
            users[requesterIndex].friends.push(userId);
        }
        
        localStorage.setItem('socialsphere_users', JSON.stringify(users));
        
        // Create notification
        this.createNotification('friend_accepted', 
            `${users[userIndex].username} accepted your friend request`, 
            requesterId);
        
        return { success: true };
    }

    // Settings
    getSettings() {
        return JSON.parse(localStorage.getItem('socialsphere_settings')) || {};
    }

    updateSettings(updates) {
        const settings = this.getSettings();
        const newSettings = { ...settings, ...updates };
        localStorage.setItem('socialsphere_settings', JSON.stringify(newSettings));
        return { success: true, settings: newSettings };
    }

    // Admin Methods
    verifyUser(userId) {
        return this.updateUser(userId, { verified: true });
    }

    updateUserBalance(userId, amount) {
        const user = this.getUserById(userId);
        if (user) {
            const newBalance = parseFloat((user.balance + amount).toFixed(2));
            return this.updateUser(userId, { balance: newBalance });
        }
        return { success: false, message: 'User not found' };
    }

    // Statistics
    getStatistics() {
        const users = this.getUsers();
        const posts = this.getPosts();
        const messages = this.getMessages();
        
        const totalRevenue = users.reduce((sum, user) => sum + (user.balance || 0), 0);
        const verifiedUsers = users.filter(u => u.verified).length;
        const activeUsers = users.length; // Simplified
        
        return {
            totalUsers: users.length,
            totalPosts: posts.length,
            totalMessages: messages.length,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            verifiedUsers,
            activeUsers
        };
    }

    // Clear all data
    clearAllData() {
        this.initStorage(); // Resets to defaults
        return { success: true };
    }

    // Export data
    exportData() {
        const data = {
            users: this.getUsers(),
            posts: this.getPosts(),
            messages: this.getMessages(),
            notifications: this.getNotifications(),
            settings: this.getSettings(),
            exportDate: new Date().toISOString()
        };
        
        return JSON.stringify(data, null, 2);
    }
}

// Create global storage instance
const socialSphereDB = new SocialSphereStorage();