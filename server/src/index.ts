import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import contractRoutes from './routes/contracts.js';
import commentRoutes from './routes/comments.js';
import permissionRoutes from './routes/permissions.js';
import versionRoutes from './routes/versions.js';
import exportRoutes from './routes/export.js';
import notificationRoutes from './routes/notifications.js';
import { setupYjsSocket } from './socket/index.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS config
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Socket.io setup
const io = new Server(httpServer, {
    cors: corsOptions,
    path: '/socket.io',
});

setupYjsSocket(io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.io running on path /socket.io`);
});
