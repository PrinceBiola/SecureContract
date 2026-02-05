import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadToS3, getSignedUrl } from '../services/s3';
import multer from 'multer';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// Get version history for a contract
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

        const versions = await prisma.contractVersion.findMany({
            where: { contractId },
            orderBy: { version: 'desc' },
            select: {
                id: true,
                version: true,
                changeNote: true,
                createdById: true,
                createdAt: true,
            }
        });

        // Add current version to the list
        const allVersions = [
            {
                id: contract.id,
                version: contract.version,
                changeNote: 'Current version',
                createdById: contract.ownerId,
                createdAt: contract.updatedAt,
                isCurrent: true,
            },
            ...versions.map((v: any) => ({ ...v, isCurrent: false })),
        ];

        res.json(allVersions);
    } catch (error) {
        console.error('Get versions error:', error);
        res.status(500).json({ error: 'Failed to fetch versions' });
    }
});

// Upload new version
router.post(
    '/:contractId',
    authenticate,
    upload.single('file'),
    async (req: AuthRequest, res) => {
        try {
            const { contractId } = req.params;
            const { changeNote } = req.body;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            // Check owner or editor permission
            const contract = await prisma.contract.findFirst({
                where: {
                    id: contractId,
                    OR: [
                        { ownerId: req.user!.id },
                        {
                            permissions: {
                                some: {
                                    userId: req.user!.id,
                                    role: { in: ['EDITOR', 'ADMIN'] }
                                }
                            }
                        }
                    ]
                }
            });

            if (!contract) {
                return res.status(403).json({ error: 'Permission denied. Must be owner or editor.' });
            }

            // Archive current version
            await prisma.contractVersion.create({
                data: {
                    contractId: contract.id,
                    version: contract.version,
                    s3Key: contract.s3Key,
                    changeNote: changeNote || `Version ${contract.version}`,
                    createdById: req.user!.id,
                }
            });

            // Upload new file to S3
            const newS3Key = `contracts/${contractId}/v${contract.version + 1}-${Date.now()}.pdf`;
            await uploadToS3(newS3Key, file.buffer, file.mimetype);

            // Update contract with new version
            const updatedContract = await prisma.contract.update({
                where: { id: contractId },
                data: {
                    s3Key: newS3Key,
                    version: contract.version + 1,
                    fileSize: file.size,
                }
            });

            res.json({
                message: 'New version uploaded',
                version: updatedContract.version,
            });
        } catch (error: any) {
            console.error('Upload version error:', error);
            res.status(500).json({ error: 'Failed to upload new version' });
        }
    }
);

// Get specific version's PDF URL
router.get('/:contractId/:version', authenticate, async (req: AuthRequest, res) => {
    try {
        const { contractId, version } = req.params;
        const versionNum = parseInt(version);

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

        // Current version
        if (versionNum === contract.version) {
            const pdfUrl = await getSignedUrl(contract.s3Key);
            return res.json({ pdfUrl, version: contract.version, isCurrent: true });
        }

        // Historical version
        const historicalVersion = await prisma.contractVersion.findUnique({
            where: {
                contractId_version: { contractId, version: versionNum }
            }
        });

        if (!historicalVersion) {
            return res.status(404).json({ error: 'Version not found' });
        }

        const pdfUrl = await getSignedUrl(historicalVersion.s3Key);
        res.json({
            pdfUrl,
            version: historicalVersion.version,
            changeNote: historicalVersion.changeNote,
            createdAt: historicalVersion.createdAt,
            isCurrent: false
        });
    } catch (error) {
        console.error('Get version error:', error);
        res.status(500).json({ error: 'Failed to fetch version' });
    }
});

// Restore a previous version
router.post('/:contractId/:version/restore', authenticate, async (req: AuthRequest, res) => {
    try {
        const { contractId, version } = req.params;
        const versionNum = parseInt(version);

        // Check owner permission
        const contract = await prisma.contract.findFirst({
            where: {
                id: contractId,
                ownerId: req.user!.id
            }
        });

        if (!contract) {
            return res.status(403).json({ error: 'Only owner can restore versions' });
        }

        const historicalVersion = await prisma.contractVersion.findUnique({
            where: {
                contractId_version: { contractId, version: versionNum }
            }
        });

        if (!historicalVersion) {
            return res.status(404).json({ error: 'Version not found' });
        }

        // Archive current version first
        await prisma.contractVersion.create({
            data: {
                contractId: contract.id,
                version: contract.version,
                s3Key: contract.s3Key,
                changeNote: `Before restoring to v${versionNum}`,
                createdById: req.user!.id,
            }
        });

        // Restore by updating contract to point to old version's S3 key
        const restoredContract = await prisma.contract.update({
            where: { id: contractId },
            data: {
                s3Key: historicalVersion.s3Key,
                version: contract.version + 1,
            }
        });

        res.json({
            message: `Restored to version ${versionNum}`,
            newVersion: restoredContract.version,
        });
    } catch (error) {
        console.error('Restore version error:', error);
        res.status(500).json({ error: 'Failed to restore version' });
    }
});

export default router;
