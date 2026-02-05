import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Create a comment on a contract (or reply to existing comment)
router.post('/:contractId', authenticate, async (req: AuthRequest, res) => {
    try {
        const { contractId } = req.params;
        const commentSchema = z.object({
            content: z.string().min(1).max(5000),
            highlightId: z.string().optional(), // ID of the highlight this comment is attached to
            parentId: z.string().optional(),    // ID of parent comment for replies
            position: z.object({
                page: z.number(),
                x: z.number(),
                y: z.number(),
            }).optional(),
        });

        const data = commentSchema.parse(req.body);

        // Check user has access to contract
        const contract = await prisma.contract.findFirst({
            where: {
                id: contractId,
                OR: [
                    { ownerId: req.user!.id },
                    { permissions: { some: { userId: req.user!.id } } }
                ]
            }
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found or access denied' });
        }

        // Check permission level (at least COMMENTER)
        const permission = await prisma.permission.findFirst({
            where: { contractId, userId: req.user!.id }
        });

        const userRole = contract.ownerId === req.user!.id ? 'ADMIN' : permission?.role;
        if (userRole === 'VIEWER') {
            return res.status(403).json({ error: 'Viewers cannot add comments' });
        }

        const comment = await prisma.comment.create({
            data: {
                content: data.content,
                contractId,
                userId: req.user!.id,
                highlightId: data.highlightId,
                parentId: data.parentId,
                position: data.position ? JSON.stringify(data.position) : null,
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        res.status(201).json(comment);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Create comment error:', error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
});

// Get all comments for a contract (including threads)
router.get('/:contractId', authenticate, async (req: AuthRequest, res) => {
    try {
        const { contractId } = req.params;

        // Check access
        const contract = await prisma.contract.findFirst({
            where: {
                id: contractId,
                OR: [
                    { ownerId: req.user!.id },
                    { permissions: { some: { userId: req.user!.id } } }
                ]
            }
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found or access denied' });
        }

        // Get all comments with replies nested
        const comments = await prisma.comment.findMany({
            where: {
                contractId,
                parentId: null // Only top-level comments
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                },
                replies: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(comments);
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// Update a comment
router.patch('/:commentId', authenticate, async (req: AuthRequest, res) => {
    try {
        const { commentId } = req.params;
        const { content } = z.object({ content: z.string().min(1).max(5000) }).parse(req.body);

        const comment = await prisma.comment.findUnique({
            where: { id: commentId }
        });

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (comment.userId !== req.user!.id) {
            return res.status(403).json({ error: 'You can only edit your own comments' });
        }

        const updated = await prisma.comment.update({
            where: { id: commentId },
            data: { content },
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        });

        res.json(updated);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: 'Failed to update comment' });
    }
});

// Delete a comment
router.delete('/:commentId', authenticate, async (req: AuthRequest, res) => {
    try {
        const { commentId } = req.params;

        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: { contract: true }
        });

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Can delete if: owner of comment OR owner of contract
        if (comment.userId !== req.user!.id && comment.contract.ownerId !== req.user!.id) {
            return res.status(403).json({ error: 'Cannot delete this comment' });
        }

        await prisma.comment.delete({
            where: { id: commentId }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

// Resolve/unresolve a comment thread
router.patch('/:commentId/resolve', authenticate, async (req: AuthRequest, res) => {
    try {
        const { commentId } = req.params;
        const { resolved } = z.object({ resolved: z.boolean() }).parse(req.body);

        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: { contract: true }
        });

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Only contract owner or comment owner can resolve
        if (comment.userId !== req.user!.id && comment.contract.ownerId !== req.user!.id) {
            return res.status(403).json({ error: 'Cannot resolve this comment' });
        }

        const updated = await prisma.comment.update({
            where: { id: commentId },
            data: { resolved },
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        });

        res.json(updated);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: 'Failed to resolve comment' });
    }
});

export default router;
