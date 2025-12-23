const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if(!origin) return callback(null, true);
        // You can add your domain checks here
        return callback(null, true);
    },
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'socialsphere-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(flash());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'socialsphere-jwt-secret-2024';

// File-based storage system
class FileStorage {
    constructor() {
        this.dataPath = path.join(__dirname, 'data', 'storage.json');
        this.initStorage();
    }

    async initStorage() {
        try {
            await fs.access(this.dataPath);
        } catch {
            const initialData = {
                users: [],
                posts: [],
                messages: [],
                friends: [],
                groups: [],
                notifications: [],
                settings: {
                    theme: 'light',
                    emailNotifications: true,
                    pushNotifications: true,
                    adRate: 5.00
                }
            };
            await this.saveData(initialData);
        }
    }

    async loadData() {
        try {
            const data = await fs.readFile(this.dataPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading data:', error);
            return null;
        }
    }

    async saveData(data) {
        try {
            await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    // User methods
    async createUser(userData) {
        const data = await this.loadData();
        userData.id = Date.now().toString();
        userData.createdAt = new Date().toISOString();
        userData.updatedAt = new Date().toISOString();
        
        data.users.push(userData);
        await this.saveData(data);
        return userData;
    }

    async findUserByUsername(username) {
        const data = await this.loadData();
        return data.users.find(u => u.username === username);
    }

    async findUserById(id) {
        const data = await this.loadData();
        return data.users.find(u => u.id === id);
    }

    async updateUser(id, updates) {
        const data = await this.loadData();
        const userIndex = data.users.findIndex(u => u.id === id);
        if (userIndex !== -1) {
            data.users[userIndex] = { ...data.users[userIndex], ...updates, updatedAt: new Date().toISOString() };
            await this.saveData(data);
            return data.users[userIndex];
        }
        return null;
    }

    async deleteUser(id) {
        const data = await this.loadData();
        data.users = data.users.filter(u => u.id !== id);
        await this.saveData(data);
        return true;
    }

    async getAllUsers() {
        const data = await this.loadData();
        return data.users;
    }

    // Post methods
    async createPost(postData) {
        const data = await this.loadData();
        postData.id = Date.now().toString();
        postData.createdAt = new Date().toISOString();
        postData.likes = [];
        postData.comments = [];
        postData.shares = 0;
        
        data.posts.unshift(postData);
        await this.saveData(data);
        return postData;
    }

    async getAllPosts() {
        const data = await this.loadData();
        return data.posts;
    }

    async deletePost(id) {
        const data = await this.loadData();
        data.posts = data.posts.filter(p => p.id !== id);
        await this.saveData(data);
        return true;
    }

    // Message methods
    async createMessage(messageData) {
        const data = await this.loadData();
        messageData.id = Date.now().toString();
        messageData.createdAt = new Date().toISOString();
        messageData.read = false;
        
        data.messages.push(messageData);
        await this.saveData(data);
        return messageData;
    }

    async getUserMessages(userId) {
        const data = await this.loadData();
        return data.messages.filter(m => m.senderId === userId || m.receiverId === userId);
    }

    // Notification methods
    async createNotification(notificationData) {
        const data = await this.loadData();
        notificationData.id = Date.now().toString();
        notificationData.createdAt = new Date().toISOString();
        notificationData.read = false;
        
        data.notifications.push(notificationData);
        await this.saveData(data);
        return notificationData;
    }

    async getUserNotifications(userId) {
        const data = await this.loadData();
        return data.notifications.filter(n => n.userId === userId && !n.read);
    }

    // Friend methods
    async getFriends(userId) {
        const data = await this.loadData();
        return data.friends.find(f => f.userId === userId) || { friends: [], requests: [] };
    }

    async updateFriends(userId, friendData) {
        const data = await this.loadData();
        const index = data.friends.findIndex(f => f.userId === userId);
        
        if (index !== -1) {
            data.friends[index] = friendData;
        } else {
            data.friends.push(friendData);
        }
        
        await this.saveData(data);
        return friendData;
    }

    // Statistics
    async getStatistics() {
        const data = await this.loadData();
        return {
            totalUsers: data.users.length,
            totalPosts: data.posts.length,
            totalMessages: data.messages.length,
            totalGroups: data.groups.length,
            totalRevenue: data.users.reduce((sum, user) => sum + (user.balance || 0), 0)
        };
    }
}

const storage = new FileStorage();

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Admin middleware
const isAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// API Routes

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Check if user exists
        const existingUser = await storage.findUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await storage.createUser({
            username,
            password: hashedPassword,
            email: email || '',
            isAdmin: false,
            verified: false,
            balance: 0,
            profilePicture: `https://ui-avatars.com/api/?name=${username}&background=random`,
            bio: '',
            settings: {}
        });

        // Create token
        const token = jwt.sign(
            { id: user.id, username: user.username, isAdmin: user.isAdmin },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,
                verified: user.verified,
                balance: user.balance,
                profilePicture: user.profilePicture
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Find user
        const user = await storage.findUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { id: user.id, username: user.username, isAdmin: user.isAdmin },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,
                verified: user.verified,
                balance: user.balance,
                profilePicture: user.profilePicture
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Hardcoded admin credentials
        if (username === 'Kenyan Jaguar' && password === 'Derrick9786') {
            const token = jwt.sign(
                { id: 'admin', username: 'Kenyan Jaguar', isAdmin: true },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return res.json({
                success: true,
                token,
                user: {
                    id: 'admin',
                    username: 'Kenyan Jaguar',
                    isAdmin: true,
                    verified: true,
                    balance: 0
                }
            });
        }

        res.status(401).json({ error: 'Invalid admin credentials' });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User Routes
app.get('/api/users/me', authenticateToken, async (req, res) => {
    try {
        const user = await storage.findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove sensitive data
        const { password, ...userData } = user;
        res.json(userData);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/users/me', authenticateToken, async (req, res) => {
    try {
        const updates = req.body;
        const allowedUpdates = ['email', 'bio', 'profilePicture', 'settings'];
        
        // Filter only allowed updates
        const filteredUpdates = {};
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        });

        const updatedUser = await storage.updateUser(req.user.id, filteredUpdates);
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { password, ...userData } = updatedUser;
        res.json(userData);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Post Routes
app.get('/api/posts', authenticateToken, async (req, res) => {
    try {
        const posts = await storage.getAllPosts();
        
        // Populate user data for each post
        const populatedPosts = await Promise.all(posts.map(async (post) => {
            const user = await storage.findUserById(post.userId);
            return {
                ...post,
                user: user ? {
                    id: user.id,
                    username: user.username,
                    profilePicture: user.profilePicture,
                    verified: user.verified
                } : null
            };
        }));

        res.json(populatedPosts);
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/posts', authenticateToken, async (req, res) => {
    try {
        const { content, media } = req.body;
        
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const post = await storage.createPost({
            userId: req.user.id,
            content,
            media: media || null
        });

        // Create notification
        await storage.createNotification({
            type: 'post_created',
            message: `New post from ${req.user.username}`,
            userId: req.user.id
        });

        res.json(post);
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/posts/:id', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const posts = await storage.getAllPosts();
        const post = posts.find(p => p.id === postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if user owns the post or is admin
        if (post.userId !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await storage.deletePost(postId);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Like/Unlike Post
app.post('/api/posts/:id/like', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const posts = await storage.getAllPosts();
        const postIndex = posts.findIndex(p => p.id === postId);

        if (postIndex === -1) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const post = posts[postIndex];
        const likeIndex = post.likes.indexOf(req.user.id);

        if (likeIndex === -1) {
            // Like the post
            post.likes.push(req.user.id);
            
            // Create notification
            if (post.userId !== req.user.id) {
                await storage.createNotification({
                    type: 'post_liked',
                    message: `${req.user.username} liked your post`,
                    userId: post.userId
                });
            }
        } else {
            // Unlike the post
            post.likes.splice(likeIndex, 1);
        }

        // Save updated posts
        const data = await storage.loadData();
        data.posts[postIndex] = post;
        await storage.saveData(data);

        res.json({ likes: post.likes.length, liked: likeIndex === -1 });
    } catch (error) {
        console.error('Like post error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Message Routes
app.get('/api/messages', authenticateToken, async (req, res) => {
    try {
        const messages = await storage.getUserMessages(req.user.id);
        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/messages', authenticateToken, async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        
        if (!receiverId || !content) {
            return res.status(400).json({ error: 'Receiver ID and content required' });
        }

        const message = await storage.createMessage({
            senderId: req.user.id,
            receiverId,
            content
        });

        // Create notification
        await storage.createNotification({
            type: 'new_message',
            message: `New message from ${req.user.username}`,
            userId: receiverId
        });

        res.json(message);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Notification Routes
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const notifications = await storage.getUserNotifications(req.user.id);
        res.json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const data = await storage.loadData();
        const notification = data.notifications.find(n => n.id === req.params.id && n.userId === req.user.id);
        
        if (notification) {
            notification.read = true;
            await storage.saveData(data);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Friend Routes
app.get('/api/friends', authenticateToken, async (req, res) => {
    try {
        const friendsData = await storage.getFriends(req.user.id);
        res.json(friendsData);
    } catch (error) {
        console.error('Get friends error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ... (Previous code remains the same until line 365)

app.post('/api/friends/request', authenticateToken, async (req, res) => {
    try {
        const { friendId } = req.body;
        
        if (!friendId) {
            return res.status(400).json({ error: 'Friend ID required' });
        }

        // Get current friend data
        const userFriends = await storage.getFriends(req.user.id);
        const friendFriends = await storage.getFriends(friendId);

        // Add to requests if not already friends
        if (!userFriends.friends.includes(friendId) && !userFriends.requests.includes(friendId)) {
            userFriends.requests = userFriends.requests || [];
            userFriends.requests.push(friendId);
            userFriends.userId = req.user.id;
            
            await storage.updateFriends(req.user.id, userFriends);
        }

        // Create notification
        await storage.createNotification({
            type: 'friend_request',
            message: `${req.user.username} sent you a friend request`,
            userId: friendId
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Send friend request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/friends/accept', authenticateToken, async (req, res) => {
    try {
        const { friendId } = req.body;
        
        if (!friendId) {
            return res.status(400).json({ error: 'Friend ID required' });
        }

        // Get friend data
        const userFriends = await storage.getFriends(req.user.id);
        const friendFriends = await storage.getFriends(friendId);

        // Remove from requests and add to friends
        if (userFriends.requests && userFriends.requests.includes(friendId)) {
            userFriends.requests = userFriends.requests.filter(id => id !== friendId);
            userFriends.friends = userFriends.friends || [];
            userFriends.friends.push(friendId);
            
            friendFriends.friends = friendFriends.friends || [];
            friendFriends.friends.push(req.user.id);
            
            await storage.updateFriends(req.user.id, userFriends);
            await storage.updateFriends(friendId, friendFriends);

            // Create notification
            await storage.createNotification({
                type: 'friend_accepted',
                message: `${req.user.username} accepted your friend request`,
                userId: friendId
            });

            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'No friend request found' });
        }
    } catch (error) {
        console.error('Accept friend request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin Routes
app.get('/api/admin/statistics', authenticateToken, isAdmin, async (req, res) => {
    try {
        const stats = await storage.getStatistics();
        res.json(stats);
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await storage.getAllUsers();
        // Remove passwords from response
        const safeUsers = users.map(user => {
            const { password, ...safeUser } = user;
            return safeUser;
        });
        res.json(safeUsers);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/admin/users/:id/verify', authenticateToken, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const updatedUser = await storage.updateUser(userId, { verified: true });
        
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create notification
        await storage.createNotification({
            type: 'account_verified',
            message: 'Your account has been verified!',
            userId: userId
        });

        const { password, ...userData } = updatedUser;
        res.json(userData);
    } catch (error) {
        console.error('Verify user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        await storage.deleteUser(userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/admin/posts/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const postId = req.params.id;
        await storage.deletePost(postId);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Export data
app.get('/api/admin/export', authenticateToken, isAdmin, async (req, res) => {
    try {
        const data = await storage.loadData();
        const exportData = {
            ...data,
            exportDate: new Date().toISOString()
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=socialsphere-backup.json');
        res.send(JSON.stringify(exportData, null, 2));
    } catch (error) {
        console.error('Export data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Clear all data (admin only)
app.delete('/api/admin/clear-all', authenticateToken, isAdmin, async (req, res) => {
    try {
        const initialData = {
            users: [],
            posts: [],
            messages: [],
            friends: [],
            groups: [],
            notifications: [],
            settings: {
                theme: 'light',
                emailNotifications: true,
                pushNotifications: true,
                adRate: 5.00
            }
        };
        
        await storage.saveData(initialData);
        res.json({ success: true, message: 'All data cleared' });
    } catch (error) {
        console.error('Clear all data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'SocialSphere API'
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Serve other static files
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', req.path));
});

// 404 handler for all other routes
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Create data directory if it doesn't exist
const fsSync = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fsSync.existsSync(dataDir)) {
    fsSync.mkdirSync(dataDir, { recursive: true });
}

// Start server
const startServer = async () => {
    try {
        // Initialize storage
        await storage.initStorage();
        
        app.listen(PORT, () => {
            console.log(`SocialSphere server running on port ${PORT}`);
            console.log(`Open http://localhost:${PORT} in your browser`);
            console.log(`Admin panel: http://localhost:${PORT}/admin`);
            console.log(`API health check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

// Start the server
if (require.main === module) {
    startServer();
}

module.exports = app;