import { FaSpinner, FaFileContract } from 'react-icons/fa';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    fullScreen?: boolean;
}

const SIZE_CLASSES = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
};

export function LoadingSpinner({ size = 'md', text, fullScreen = false }: LoadingSpinnerProps) {
    const sizeClass = SIZE_CLASSES[size];

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="text-center">
                    <div className="relative inline-block">
                        <FaFileContract className="text-blue-600 animate-pulse" size={48} />
                        <FaSpinner className="absolute -bottom-1 -right-1 text-blue-500 animate-spin" size={20} />
                    </div>
                    {text && <p className="text-gray-600 mt-4 font-medium">{text}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center gap-2">
            <FaSpinner className={`animate-spin text-blue-600 ${sizeClass}`} />
            {text && <span className="text-gray-600 text-sm">{text}</span>}
        </div>
    );
}

// Skeleton loading components
export function SkeletonCard() {
    return (
        <div className="bg-white rounded-xl p-4 animate-pulse">
            <div className="h-10 w-10 bg-gray-200 rounded-lg mb-4" />
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
    );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="bg-white rounded-xl overflow-hidden">
            <div className="border-b bg-gray-50 px-4 py-3">
                <div className="flex gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-4 bg-gray-200 rounded flex-1 animate-pulse" />
                    ))}
                </div>
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="border-b last:border-0 px-4 py-4">
                    <div className="flex gap-4">
                        {[1, 2, 3, 4].map(j => (
                            <div key={j} className="h-4 bg-gray-100 rounded flex-1 animate-pulse" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{ width: `${100 - i * 15}%` }}
                />
            ))}
        </div>
    );
}
