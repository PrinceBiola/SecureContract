import { useState } from 'react';
import api from '@/services/api';
import { useModal } from '@/context/ModalContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FaTimes, FaUserPlus, FaTrash, FaCrown } from 'react-icons/fa';

interface Permission {
    id: string;
    role: 'VIEWER' | 'COMMENTER' | 'EDITOR' | 'ADMIN';
    user: {
        id: string;
        name: string;
        email: string;
    };
}

interface ShareDialogProps {
    contractId: string;
    contractTitle: string;
    isOwner: boolean;
    permissions: Permission[];
    onClose: () => void;
    onUpdate: () => void;
}

const ROLE_OPTIONS = [
    { value: 'VIEWER', label: 'Can View', description: 'Read-only access' },
    { value: 'COMMENTER', label: 'Can Comment', description: 'Add comments and replies' },
    { value: 'EDITOR', label: 'Can Edit', description: 'Full editing access' },
    { value: 'ADMIN', label: 'Admin', description: 'Manage permissions' },
];

export default function ShareDialog({
    contractId,
    contractTitle,
    isOwner,
    permissions,
    onClose,
    onUpdate
}: ShareDialogProps) {
    const modal = useModal();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<string>('VIEWER');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsLoading(true);
        setError('');

        try {
            await api.post(`/permissions/${contractId}`, { email, role });
            setEmail('');
            setRole('VIEWER');
            onUpdate();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to invite user');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleChange = async (permissionId: string, newRole: string) => {
        try {
            await api.patch(`/permissions/${permissionId}`, { role: newRole });
            onUpdate();
        } catch (err) {
            console.error('Failed to update role');
        }
    };

    const handleRemove = async (permissionId: string) => {
        const confirmed = await modal.confirm(
            'Remove Access',
            'Are you sure you want to remove this user\'s access to this contract?',
            { confirmText: 'Remove', cancelText: 'Cancel' }
        );
        if (!confirmed) return;

        try {
            await api.delete(`/permissions/${permissionId}`);
            onUpdate();
        } catch (err) {
            console.error('Failed to remove access');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Share Contract</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[250px]">{contractTitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Invite Form */}
                {isOwner && (
                    <form onSubmit={handleInvite} className="p-5 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                            Invite People
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="Enter email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex-1 h-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400"
                            />
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="h-10 px-3 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                            >
                                {ROLE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                        <Button
                            type="submit"
                            className="mt-3 w-full bg-blue-600 hover:bg-blue-700 gap-2"
                            disabled={isLoading || !email.trim()}
                        >
                            <FaUserPlus size={14} />
                            {isLoading ? 'Inviting...' : 'Invite'}
                        </Button>
                    </form>
                )}

                {/* Current Members */}
                <div className="p-5 overflow-y-auto max-h-[300px]">
                    <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3 block">
                        People with Access ({permissions.length + 1})
                    </Label>

                    {/* Owner (always shown) */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                <FaCrown size={14} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">You (Owner)</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Full access</p>
                            </div>
                        </div>
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                            Owner
                        </span>
                    </div>

                    {/* Shared Users */}
                    {permissions.map((perm) => (
                        <div key={perm.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-sm">
                                    {perm.user.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{perm.user.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{perm.user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isOwner ? (
                                    <>
                                        <select
                                            value={perm.role}
                                            onChange={(e) => handleRoleChange(perm.id, e.target.value)}
                                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        >
                                            {ROLE_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleRemove(perm.id)}
                                            className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <FaTrash size={12} />
                                        </button>
                                    </>
                                ) : (
                                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                        {ROLE_OPTIONS.find(r => r.value === perm.role)?.label}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {permissions.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                            No one else has access yet. Invite your team above!
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <Button variant="outline" onClick={onClose} className="w-full">
                        Done
                    </Button>
                </div>
            </div>
        </div>
    );
}
