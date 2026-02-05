import { Server, Socket } from 'socket.io';
import { getYjsDoc } from '../services/yjs.js';
import * as Y from 'yjs';
import { authenticate } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function setupYjsSocket(io: Server) {
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication required'));

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
            const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
            if (!user) return next(new Error('User not found'));

            // Attach user to socket
            (socket as any).user = user;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', async (socket) => {
        const user = (socket as any).user;
        console.log(`User connected: ${user.name} (${user.id})`);

        socket.on('join-contract', async (contractId: string) => {
            // Permission check could go here

            socket.join(`contract:${contractId}`);

            // Load Yjs doc
            const doc = await getYjsDoc(contractId);

            // Send initial state
            const state = Y.encodeStateAsUpdate(doc);
            socket.emit('sync', Buffer.from(state).toString('base64'));

            // Listen for updates from this client
            socket.on('update', (updateBase64: string) => {
                const update = Buffer.from(updateBase64, 'base64');
                Y.applyUpdate(doc, new Uint8Array(update));

                // Broadcast to others in room
                socket.to(`contract:${contractId}`).emit('update', updateBase64);
            });

            // Cursor presence
            socket.on('cursor', (position: any) => {
                socket.to(`contract:${contractId}`).emit('cursor', {
                    userId: user.id,
                    userName: user.name,
                    color: user.color,
                    position,
                });
            });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', user.id);
        });
    });
}
