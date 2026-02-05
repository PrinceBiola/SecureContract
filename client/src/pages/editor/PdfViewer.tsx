import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import * as pdfjs from 'pdfjs-dist';
import { io, Socket } from 'socket.io-client';
import * as Y from 'yjs';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import CommentPanel from '@/components/CommentPanel';
import ShareDialog from '@/components/ShareDialog';
import { FaArrowLeft, FaUsers, FaComment, FaPlus, FaMinus, FaShare } from 'react-icons/fa';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Configure PDF.js worker using Vite's import.meta.url approach
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Helper to decode base64 to Uint8Array (browser-compatible)
function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

interface Annotation {
    id: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    color: string;
    content?: string;
}

interface ContractData {
    id: string;
    title: string;
    pdfUrl: string;
    owner: { id: string; name: string; email: string };
    permissions: any[];
}

export default function PdfViewer() {
    const { id: contractId } = useParams();
    const { user, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [contract, setContract] = useState<ContractData | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [scale, setScale] = useState(1.2);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [cursors, setCursors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [showComments, setShowComments] = useState(false);
    const [showShareDialog, setShowShareDialog] = useState(false);

    const [socket, setSocket] = useState<Socket | null>(null);
    const [yDoc] = useState(() => new Y.Doc());

    const isOwner = contract?.owner?.id === user?.id;

    // Fetch contract data
    useEffect(() => {
        if (!contractId) return;

        const fetchContract = async () => {
            try {
                const response = await api.get(`/contracts/${contractId}`);
                setContract(response.data);
            } catch (error) {
                console.error('Failed to fetch contract', error);
                navigate('/dashboard');
            }
        };

        fetchContract();
    }, [contractId, navigate]);

    // Load PDF Document
    useEffect(() => {
        if (!contract?.pdfUrl) return;

        const loadPdf = async () => {
            try {
                const loadingTask = pdfjs.getDocument(contract.pdfUrl);
                const doc = await loadingTask.promise;
                setPdfDoc(doc);
                setTotalPages(doc.numPages);
            } catch (error) {
                console.error('Failed to load PDF', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPdf();
    }, [contract?.pdfUrl]);

    // Initialize Socket and Yjs
    useEffect(() => {
        if (!contractId || !user) return;

        const token = localStorage.getItem('token');
        const newSocket = io('http://localhost:3001', {
            path: '/socket.io',
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log('Connected to websocket');
            newSocket.emit('join-contract', contractId);
        });

        newSocket.on('sync', (stateBase64: string) => {
            const state = base64ToUint8Array(stateBase64);
            Y.applyUpdate(yDoc, state);

            const yAnnotations = yDoc.getArray<Annotation>('annotations');
            setAnnotations(yAnnotations.toArray());

            yAnnotations.observe(() => {
                setAnnotations(yAnnotations.toArray());
            });
        });

        newSocket.on('update', (updateBase64: string) => {
            const update = base64ToUint8Array(updateBase64);
            Y.applyUpdate(yDoc, update);
        });

        newSocket.on('cursor', (data: any) => {
            setCursors(prev => {
                const others = prev.filter(c => c.userId !== data.userId);
                return [...others, data];
            });
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
            yDoc.destroy();
        };
    }, [contractId, user, yDoc]);

    // Handle Mouse Move (Presence)
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!socket || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Throttle this in production
        socket.emit('cursor', { x, y, page: currentPage });
    };

    // Render PDF Page
    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;

        const renderPage = async () => {
            const page = await pdfDoc.getPage(currentPage);
            const viewport = page.getViewport({ scale });

            const canvas = canvasRef.current!;
            const context = canvas.getContext('2d')!;

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;
        };

        renderPage();
    }, [pdfDoc, currentPage, scale]);

    const fetchPermissions = async () => {
        if (!contractId) return;
        try {
            const response = await api.get(`/contracts/${contractId}`);
            setContract(response.data);
        } catch (error) {
            console.error('Failed to refresh permissions');
        }
    };

    // Loading states - must be after all hooks
    if (authLoading || isLoading) {
        return <LoadingSpinner fullScreen text="Loading contract..." />;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Toolbar */}
                <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/dashboard')}
                            className="gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        >
                            <FaArrowLeft size={12} />
                            Back
                        </Button>
                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
                        <div>
                            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">{contract?.title}</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">by {contract?.owner?.name || 'Unknown'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                                className="h-8 w-8 p-0 text-gray-600 dark:text-gray-200"
                            >
                                <FaMinus size={10} />
                            </Button>
                            <span className="text-sm font-medium w-12 text-center text-gray-900 dark:text-white">{Math.round(scale * 100)}%</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setScale(s => Math.min(2.5, s + 0.1))}
                                className="h-8 w-8 p-0 text-gray-600 dark:text-gray-200"
                            >
                                <FaPlus size={10} />
                            </Button>
                        </div>

                        {/* Page Navigation */}
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                Prev
                            </Button>
                            <span className="font-medium text-gray-900 dark:text-white">{currentPage} / {totalPages}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                Next
                            </Button>
                        </div>

                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

                        {/* Share Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowShareDialog(true)}
                            className="gap-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <FaShare size={12} />
                            Share
                        </Button>

                        {/* Comments Toggle */}
                        <Button
                            variant={showComments ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowComments(!showComments)}
                            className={`gap-2 ${!showComments ? "dark:bg-gray-700 dark:border-gray-600 dark:text-white" : ""}`}
                        >
                            <FaComment size={12} />
                            Comments
                        </Button>

                        {/* Active Users */}
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <FaUsers size={14} />
                            <span className="text-sm font-medium">{cursors.length + 1}</span>
                        </div>
                    </div>
                </div>

                {/* PDF Canvas */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-auto p-8 relative"
                    onMouseMove={handleMouseMove}
                >
                    <div className="relative mx-auto shadow-2xl rounded-lg overflow-hidden" style={{ width: 'fit-content' }}>
                        <canvas ref={canvasRef} className="bg-white" />

                        {/* Annotations Layer */}
                        {annotations.filter(a => a.page === currentPage).map((ann, i) => (
                            <div
                                key={i}
                                className="absolute bg-yellow-300/40 border-2 border-yellow-500 cursor-pointer hover:bg-yellow-400/50 transition-colors"
                                style={{
                                    left: ann.x * scale,
                                    top: ann.y * scale,
                                    width: ann.width * scale,
                                    height: ann.height * scale,
                                }}
                            />
                        ))}

                        {/* Cursors Layer */}
                        {cursors.filter(c => c.position?.page === currentPage).map(cursor => (
                            <div
                                key={cursor.userId}
                                className="absolute pointer-events-none z-50 flex items-center gap-1"
                                style={{
                                    left: cursor.position.x,
                                    top: cursor.position.y,
                                    transform: `translateX(-50%) translateY(-50%)`,
                                }}
                            >
                                <div
                                    className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                                    style={{ backgroundColor: cursor.color }}
                                />
                                <span
                                    className="text-xs text-white px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap"
                                    style={{ backgroundColor: cursor.color }}
                                >
                                    {cursor.userName}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Comment Panel */}
            {showComments && (
                <CommentPanel
                    contractId={contractId!}
                    isOwner={isOwner}
                    onClose={() => setShowComments(false)}
                />
            )}

            {/* Share Dialog */}
            {showShareDialog && (
                <ShareDialog
                    contractId={contractId!}
                    contractTitle={contract?.title || ''}
                    isOwner={isOwner}
                    permissions={contract?.permissions || []}
                    onClose={() => setShowShareDialog(false)}
                    onUpdate={fetchPermissions}
                />
            )}
        </div>
    );
}
