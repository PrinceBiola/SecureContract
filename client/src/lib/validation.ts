import { z } from 'zod';

// Auth validation schemas
export const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

// Contract validation schemas
export const contractTitleSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
});

// Comment validation schemas
export const commentSchema = z.object({
    content: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment is too long'),
    highlightId: z.string().optional(),
    parentId: z.string().optional(),
});

// Share/invite validation
export const inviteSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    role: z.enum(['VIEWER', 'COMMENTER', 'EDITOR', 'ADMIN']),
});

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ContractTitleFormData = z.infer<typeof contractTitleSchema>;
export type CommentFormData = z.infer<typeof commentSchema>;
export type InviteFormData = z.infer<typeof inviteSchema>;

// Validation helper
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: Record<string, string> } {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors: Record<string, string> = {};
    result.error.errors.forEach(err => {
        const path = err.path.join('.');
        if (path && !errors[path]) {
            errors[path] = err.message;
        }
    });

    return { success: false, errors };
}
