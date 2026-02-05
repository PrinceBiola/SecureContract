import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, Role } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all permissions for a contract
router.get('/:contractId', authenticate, async (req: AuthRequest, res) => {
    try {
        const { contractId } = req.params;

        // Only owner can view permissions
        const contract = await prisma.contract.findFirst({
            where: {
                id: contractId,
                ownerId: req.user!.id
            }
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found or not owner' });
        }

        const permissions = await prisma.permission.findMany({
            where: { contractId },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        res.json(permissions);
    } catch (error) {
        console.error('Get permissions error:', error);
        res.status(500).json({ error: 'Failed to fetch permissions' });
    }
});

// Invite user to contract (create permission)
router.post('/:contractId', authenticate, async (req: AuthRequest, res) => {
    try {
        const { contractId } = req.params;
        const inviteSchema = z.object({
            email: z.string().email(),
            role: z.enum(['VIEWER', 'COMMENTER', 'EDITOR', 'ADMIN'])
        });

        const { email, role } = inviteSchema.parse(req.body);

        // Only owner can invite
        const contract = await prisma.contract.findFirst({
            where: {
                id: contractId,
                ownerId: req.user!.id
            }
        });

        if (!contract) {
            return res.status(403).json({ error: 'Only contract owner can invite users' });
        }

        // Find user by email
        const invitedUser = await prisma.user.findUnique({
            where: { email }
        });

        if (!invitedUser) {
            return res.status(404).json({ error: 'User not found. They must register first.' });
        }

        if (invitedUser.id === req.user!.id) {
            return res.status(400).json({ error: 'Cannot invite yourself' });
        }

        // Check if permission already exists
        const existing = await prisma.permission.findUnique({
            where: {
                contractId_userId: {
                    contractId,
                    userId: invitedUser.id
                }
            }
        });

        if (existing) {
            // Update existing permission
            const updated = await prisma.permission.update({
                where: { id: existing.id },
                data: { role: role as Role },
                include: {
                    user: { select: { id: true, name: true, email: true } }
                }
            });
            return res.json(updated);
        }

        // Create new permission
        const permission = await prisma.permission.create({
            data: {
                contractId,
                userId: invitedUser.id,
                role: role as Role
            },
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        });

        res.status(201).json(permission);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Invite error:', error);
        res.status(500).json({ error: 'Failed to invite user' });
    }
});

// Update permission role
router.patch('/:permissionId', authenticate, async (req: AuthRequest, res) => {
    try {
        const { permissionId } = req.params;
        const { role } = z.object({
            role: z.enum(['VIEWER', 'COMMENTER', 'EDITOR', 'ADMIN'])
        }).parse(req.body);

        const permission = await prisma.permission.findUnique({
            where: { id: permissionId },
            include: { contract: true }
        });

        if (!permission) {
            return res.status(404).json({ error: 'Permission not found' });
        }

        if (permission.contract.ownerId !== req.user!.id) {
            return res.status(403).json({ error: 'Only owner can modify permissions' });
        }

        const updated = await prisma.permission.update({
            where: { id: permissionId },
            data: { role: role as Role },
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        });

        res.json(updated);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: 'Failed to update permission' });
    }
});

// Remove user access
router.delete('/:permissionId', authenticate, async (req: AuthRequest, res) => {
    try {
        const { permissionId } = req.params;

        const permission = await prisma.permission.findUnique({
            where: { id: permissionId },
            include: { contract: true }
        });

        if (!permission) {
            return res.status(404).json({ error: 'Permission not found' });
        }

        // Owner can remove anyone, user can remove themselves
        if (permission.contract.ownerId !== req.user!.id && permission.userId !== req.user!.id) {
            return res.status(403).json({ error: 'Cannot remove this permission' });
        }

        await prisma.permission.delete({
            where: { id: permissionId }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove permission' });
    }
});

export default router;
