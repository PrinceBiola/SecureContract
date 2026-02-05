import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };

        // Check if user exists (and cache this in production!)
        const user = await prisma.user.findUnique({
            where: { id: decoded.sub },
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

export const requirePermission = (permission: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        // Basic permission check placeholder - fully implement with RLS logic later
        if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
        next();
    };
};
