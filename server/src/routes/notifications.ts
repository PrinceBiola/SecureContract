import { Router } from 'express';
import { PrismaClient, NotificationType } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all notifications for current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
    try {
        const { unreadOnly } = req.query;

        const where: any = { userId: req.user!.id };
        if (unreadOnly === 'true') {
            where.read = false;
        }

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50, // Limit to last 50 notifications
        });

        res.json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Get unread count
router.get('/count', authenticate, async (req: AuthRequest, res) => {
    try {
        const count = await prisma.notification.count({
            where: {
                userId: req.user!.id,
                read: false,
            },
        });

        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch count' });
    }
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        const notification = await prisma.notification.findFirst({
            where: { id, userId: req.user!.id },
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { read: true },
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Mark all as read
router.patch('/read-all', authenticate, async (req: AuthRequest, res) => {
    try {
        await prisma.notification.updateMany({
            where: {
                userId: req.user!.id,
                read: false,
            },
            data: { read: true },
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

// Delete a notification
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        const notification = await prisma.notification.findFirst({
            where: { id, userId: req.user!.id },
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await prisma.notification.delete({ where: { id } });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

// Clear all notifications
router.delete('/', authenticate, async (req: AuthRequest, res) => {
    try {
        await prisma.notification.deleteMany({
            where: { userId: req.user!.id },
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear notifications' });
    }
});

export default router;

// Helper function to create notifications (used by other routes)
export async function createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    contractId?: string,
    commentId?: string
) {
    return prisma.notification.create({
        data: {
            userId,
            type,
            title,
            message,
            contractId,
            commentId,
        },
    });
}
