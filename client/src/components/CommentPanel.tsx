import { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { Button } from '@/components/ui/button';
import { FaReply, FaCheck, FaTimes, FaTrash, FaComment } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

interface CommentUser {
    id: string;
    name: string;
    email: string;
}

interface Reply {
    id: string;
    content: string;
    user: CommentUser;
    createdAt: string;
}

interface Comment {
    id: string;
    content: string;
    user: CommentUser;
    highlightId: string | null;
    resolved: boolean;
    createdAt: string;
    replies: Reply[];
}

interface CommentPanelProps {
    contractId: string;
    isOwner: boolean;
    onClose: () => void;
}

export default function CommentPanel({ contractId, isOwner, onClose }: CommentPanelProps) {
    const { user } = useAuth();
    const modal = useModal();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        fetchComments();
    }, [contractId]);

    const fetchComments = async () => {
        try {
            const response = await api.get(`/comments/${contractId}`);
            setComments(response.data);
        } catch (error) {
            console.error('Failed to fetch comments', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            await api.post(`/comments/${contractId}`, { content: newComment });
            setNewComment('');
            fetchComments();
        } catch (error) {
            console.error('Failed to post comment');
        }
    };

    const handleSubmitReply = async (parentId: string) => {
        if (!replyContent.trim()) return;

        try {
            await api.post(`/comments/${contractId}`, {
                content: replyContent,
                parentId
            });
            setReplyContent('');
            setReplyingTo(null);
            fetchComments();
        } catch (error) {
            console.error('Failed to post reply');
        }
    };

    const handleResolve = async (commentId: string, resolved: boolean) => {
        try {
            await api.patch(`/comments/${commentId}/resolve`, { resolved: !resolved });
            fetchComments();
        } catch (error) {
            console.error('Failed to resolve comment');
        }
    };

    const handleDelete = async (commentId: string) => {
        const confirmed = await modal.confirm(
            'Delete Comment',
            'Are you sure you want to delete this comment? This action cannot be undone.',
            { confirmText: 'Delete', cancelText: 'Cancel' }
        );
        if (!confirmed) return;

        try {
            await api.delete(`/comments/${commentId}`);
            fetchComments();
        } catch (error) {
            console.error('Failed to delete comment');
        }
    };

    const filteredComments = comments.filter(c => {
        if (filter === 'open') return !c.resolved;
        if (filter === 'resolved') return c.resolved;
        return true;
    });

    const openCount = comments.filter(c => !c.resolved).length;
    const resolvedCount = comments.filter(c => c.resolved).length;

    return (
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FaComment className="text-blue-600 dark:text-blue-400" size={14} />
                        Comments
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                        <FaTimes size={14} />
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                    <button
                        onClick={() => setFilter('all')}
                        className={`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-colors ${filter === 'all' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        All ({comments.length})
                    </button>
                    <button
                        onClick={() => setFilter('open')}
                        className={`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-colors ${filter === 'open' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        Open ({openCount})
                    </button>
                    <button
                        onClick={() => setFilter('resolved')}
                        className={`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-colors ${filter === 'resolved' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        Resolved ({resolvedCount})
                    </button>
                </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse bg-gray-100 h-24 rounded-lg" />
                        ))}
                    </div>
                ) : filteredComments.length === 0 ? (
                    <div className="text-center py-8">
                        <FaComment className="text-gray-300 mx-auto mb-2" size={24} />
                        <p className="text-sm text-gray-500">
                            {filter === 'all' ? 'No comments yet' : `No ${filter} comments`}
                        </p>
                    </div>
                ) : (
                    filteredComments.map(comment => (
                        <div
                            key={comment.id}
                            className={`bg-gray-50 rounded-lg p-3 ${comment.resolved ? 'opacity-60' : ''}`}
                        >
                            {/* Comment Header */}
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                                        {comment.user.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{comment.user.name}</p>
                                        <p className="text-xs text-gray-400">
                                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                    {(isOwner || comment.user.id === user?.id) && (
                                        <button
                                            onClick={() => handleResolve(comment.id, comment.resolved)}
                                            className={`p-1.5 rounded transition-colors ${comment.resolved
                                                ? 'text-green-600 bg-green-50 hover:bg-green-100'
                                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                                }`}
                                            title={comment.resolved ? 'Reopen' : 'Resolve'}
                                        >
                                            <FaCheck size={12} />
                                        </button>
                                    )}
                                    {(isOwner || comment.user.id === user?.id) && (
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Delete"
                                        >
                                            <FaTrash size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Comment Content */}
                            <p className={`text-sm text-gray-700 dark:text-gray-300 mb-2 ${comment.resolved ? 'line-through' : ''}`}>
                                {comment.content}
                            </p>

                            {/* Replies */}
                            {comment.replies.length > 0 && (
                                <div className="ml-4 pl-3 border-l-2 border-gray-200 dark:border-gray-600 space-y-2 mt-3">
                                    {comment.replies.map(reply => (
                                        <div key={reply.id} className="bg-white dark:bg-gray-700 rounded p-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-medium text-gray-900 dark:text-white">{reply.user.name}</span>
                                                <span className="text-xs text-gray-400">
                                                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-300">{reply.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Reply Form */}
                            {replyingTo === comment.id ? (
                                <div className="mt-2">
                                    <textarea
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder="Write a reply..."
                                        className="w-full text-xs p-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        rows={2}
                                        autoFocus
                                    />
                                    <div className="flex gap-2 mt-1">
                                        <Button
                                            size="sm"
                                            onClick={() => handleSubmitReply(comment.id)}
                                            className="text-xs h-7 px-3 bg-blue-600 hover:bg-blue-700"
                                        >
                                            Reply
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => { setReplyingTo(null); setReplyContent(''); }}
                                            className="text-xs h-7 px-3"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setReplyingTo(comment.id)}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-2"
                                >
                                    <FaReply size={10} />
                                    Reply
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* New Comment Form */}
            <form onSubmit={handleSubmitComment} className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <textarea
                    ref={inputRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full text-sm p-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 dark:placeholder:text-gray-400"
                    rows={2}
                />
                <Button
                    type="submit"
                    className="mt-2 w-full bg-blue-600 hover:bg-blue-700"
                    disabled={!newComment.trim()}
                >
                    Post Comment
                </Button>
            </form>
        </div>
    );
}
