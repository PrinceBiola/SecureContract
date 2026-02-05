import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(2),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = registerSchema.parse(req.body);

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ error: 'User already exists' });

        const passwordHash = await bcrypt.hash(password, 10);
        const color = '#' + Math.floor(Math.random() * 16777215).toString(16); // Random cursor color

        const user = await prisma.user.create({
            data: { email, passwordHash, name, color }
        });

        const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

        res.json({ token, user: { id: user.id, email, name, color } });
    } catch (error) {
        res.status(400).json({ error: 'Invalid input' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !await bcrypt.compare(password, user.passwordHash)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

        res.json({ token, user: { id: user.id, email: user.email, name: user.name, color: user.color } });
    } catch (error) {
        res.status(400).json({ error: 'Invalid input' });
    }
});

router.get('/me', authenticate, (req: AuthRequest, res) => {
    const { passwordHash, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
});

export default router;
