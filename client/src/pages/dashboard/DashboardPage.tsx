import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FaFileContract, FaUsers, FaClock, FaSignOutAlt, FaSearch, FaPlus, FaEllipsisV, FaTrash, FaExternalLinkAlt, FaPen } from "react-icons/fa";
import { HiDocumentText, HiUpload } from "react-icons/hi";
import { formatDistanceToNow } from 'date-fns';
import NotificationBell from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Contract {
    id: string;
    title: string;
    updatedAt: string;
    createdAt: string;
    status?: string;
    owner: {
        name: string;
        email: string;
    };
    permissions: any[];
}

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const modal = useModal();
    const toast = useToast();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const dragCounter = useRef(0);

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        try {
            const response = await api.get('/contracts');
            setContracts(response.data);
        } catch (error) {
            console.error('Failed to fetch contracts', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const title = await modal.prompt(
            'Upload Contract',
            'Enter a title for this contract:',
            { defaultValue: file.name.replace('.pdf', ''), placeholder: 'Contract title' }
        );
        if (!title) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);

        try {
            await api.post('/contracts', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Contract uploaded successfully!');
            fetchContracts();
        } catch (error) {
            toast.error('Failed to upload contract');
        }
    };

    // Drag & Drop handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                await uploadFile(file);
            } else {
                toast.error('Please upload a PDF file');
            }
        }
    };

    const uploadFile = async (file: File) => {
        const title = await modal.prompt(
            'Upload Contract',
            'Enter a title for this contract:',
            { defaultValue: file.name.replace('.pdf', ''), placeholder: 'Contract title' }
        );
        if (!title) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);

        try {
            await api.post('/contracts', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Contract uploaded successfully!');
            fetchContracts();
        } catch (error) {
            toast.error('Failed to upload contract');
        }
    };

    const handleDeleteContract = async (e: React.MouseEvent, contractId: string, contractTitle: string) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveMenu(null);

        const confirmed = await modal.confirm(
            'Delete Contract',
            `Are you sure you want to delete "${contractTitle}"? This action cannot be undone.`,
            { confirmText: 'Delete', cancelText: 'Cancel' }
        );

        if (!confirmed) return;

        try {
            await api.delete(`/contracts/${contractId}`);
            toast.success('Contract deleted successfully');
            fetchContracts();
        } catch (error) {
            toast.error('Failed to delete contract');
        }
    };

    const handleRenameContract = async (e: React.MouseEvent, contractId: string, currentTitle: string) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveMenu(null);

        const newTitle = await modal.prompt(
            'Rename Contract',
            'Enter a new title for this contract:',
            { defaultValue: currentTitle, placeholder: 'Contract title' }
        );

        if (!newTitle || newTitle === currentTitle) return;

        try {
            await api.patch(`/contracts/${contractId}`, { title: newTitle });
            toast.success('Contract renamed successfully');
            fetchContracts();
        } catch (error) {
            toast.error('Failed to rename contract');
        }
    };

    const toggleMenu = (e: React.MouseEvent, contractId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveMenu(activeMenu === contractId ? null : contractId);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredContracts = contracts.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = [
        { label: 'Total Contracts', value: contracts.length, icon: FaFileContract, color: 'bg-blue-500' },
        { label: 'Shared With Me', value: contracts.filter(c => c.owner?.email !== user?.email).length, icon: FaUsers, color: 'bg-green-500' },
        { label: 'Recent (7 days)', value: contracts.filter(c => new Date(c.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length, icon: FaClock, color: 'bg-purple-500' },
    ];

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {/* Drag & Drop Overlay */}
            {isDragging && (
                <div className="fixed inset-0 bg-blue-600/20 backdrop-blur-sm z-[100] flex items-center justify-center pointer-events-none">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-12 text-center border-4 border-dashed border-blue-500">
                        <HiUpload className="mx-auto text-blue-500 mb-4" size={64} />
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Drop your PDF here</h3>
                        <p className="text-gray-500 dark:text-gray-400">Release to upload your contract</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                            <HiDocumentText className="text-white" size={20} />
                        </div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">SecureContract</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <NotificationBell />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{user?.name}</span>
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <FaSignOutAlt size={16} />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Page Title */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage, review, and collaborate on your contracts.</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    {stats.map((stat, i) => (
                        <Card key={i} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur border-0 shadow-sm">
                            <CardContent className="p-5 flex items-center gap-4">
                                <div className={`${stat.color} p-3 rounded-xl text-white`}>
                                    <stat.icon size={22} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Search & Upload */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search contracts..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-gray-800/80 dark:text-white backdrop-blur placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".pdf"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileUpload}
                        />
                        <Button className="bg-blue-600 hover:bg-blue-700 gap-2 px-5">
                            <HiUpload size={18} />
                            Upload Contract
                        </Button>
                    </div>
                </div>

                {/* Contracts Grid */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredContracts.length === 0 ? (
                    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur border-0 shadow-sm">
                        <CardContent className="py-16 text-center">
                            <HiDocumentText className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={56} />
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No contracts yet</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">Upload your first contract to get started</p>
                            {contracts.length === 0 && (
                                <div className="relative inline-block">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileUpload}
                                    />
                                    <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                                        <FaPlus size={12} />
                                        Upload Your First Contract
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredContracts.map((contract) => (
                            <Link key={contract.id} to={`/contract/${contract.id}`}>
                                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer h-full group">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                                                <HiDocumentText size={22} />
                                            </div>
                                            <div className="relative" ref={activeMenu === contract.id ? menuRef : null}>
                                                <button
                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                    onClick={(e) => toggleMenu(e, contract.id)}
                                                >
                                                    <FaEllipsisV size={14} />
                                                </button>
                                                {activeMenu === contract.id && (
                                                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[140px]">
                                                        <button
                                                            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/contract/${contract.id}`); }}
                                                        >
                                                            <FaExternalLinkAlt size={12} />
                                                            Open
                                                        </button>
                                                        <button
                                                            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                            onClick={(e) => handleRenameContract(e, contract.id, contract.title)}
                                                        >
                                                            <FaPen size={12} />
                                                            Rename
                                                        </button>
                                                        <button
                                                            className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                                                            onClick={(e) => handleDeleteContract(e, contract.id, contract.title)}
                                                        >
                                                            <FaTrash size={12} />
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white mt-3 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {contract.title}
                                        </CardTitle>
                                        <CardDescription className="text-gray-500 dark:text-gray-400 text-sm">
                                            by {contract.owner?.name || 'Unknown'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                            <FaClock size={12} />
                                            {formatDistanceToNow(new Date(contract.updatedAt), { addSuffix: true })}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                            <FaUsers size={12} />
                                            {contract.permissions?.length + 1 || 1}
                                        </div>
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
