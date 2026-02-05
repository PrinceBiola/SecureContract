import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth.js';
import { uploadToS3, getSignedDownloadUrl, deleteFromS3 } from '../services/s3.js';
import multer from 'multer';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// List contracts
router.get('/', authenticate, async (req: AuthRequest, res) => {
    const contracts = await prisma.contract.findMany({
        where: {
            OR: [
                { ownerId: req.user.id },
                { permissions: { some: { userId: req.user.id } } }
            ]
        },
        include: {
            owner: { select: { name: true, email: true } },
            permissions: true
        },
        orderBy: { updatedAt: 'desc' }
    });

    res.json(contracts);
});

// Create contract (Upload PDF)
router.post('/', authenticate, upload.single('file'), async (req: AuthRequest, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const s3Key = `contracts/${Date.now()}-${req.file.originalname}`;

    try {
        await uploadToS3(s3Key, req.file.buffer, req.file.mimetype);

        const contract = await prisma.contract.create({
            data: {
                title,
                s3Key,
                ownerId: req.user.id,
                fileSize: req.file.size,
                pageCount: 1, // To calculate page count we'd need pdf-lib or similar, skipping for now
            }
        });

        res.json(contract);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Get single contract details
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
    const contract = await prisma.contract.findUnique({
        where: { id: req.params.id },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            permissions: {
                include: {
                    user: { select: { id: true, name: true, email: true } }
                }
            }
        }
    });

    if (!contract) return res.status(404).json({ error: 'Not found' });

    // Check access
    const hasAccess = contract.ownerId === req.user.id ||
        contract.permissions.some(p => p.userId === req.user.id);

    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    // Generate presigned URL
    const pdfUrl = await getSignedDownloadUrl(contract.s3Key);

    res.json({ ...contract, pdfUrl });
});

// Update contract (rename)
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
    const { title } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ error: 'Title is required' });
    }

    const contract = await prisma.contract.findUnique({
        where: { id: req.params.id }
    });

    if (!contract) return res.status(404).json({ error: 'Not found' });
    if (contract.ownerId !== req.user.id) return res.status(403).json({ error: 'Only owner can rename' });

    const updated = await prisma.contract.update({
        where: { id: req.params.id },
        data: { title: title.trim() }
    });

    res.json(updated);
});

// Delete contract
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
    const contract = await prisma.contract.findUnique({
        where: { id: req.params.id }
    });

    if (!contract) return res.status(404).json({ error: 'Not found' });
    if (contract.ownerId !== req.user.id) return res.status(403).json({ error: 'Only owner can delete' });

    await deleteFromS3(contract.s3Key);
    await prisma.contract.delete({ where: { id: req.params.id } });

    res.json({ message: 'Deleted successfully' });
});

export default router;
