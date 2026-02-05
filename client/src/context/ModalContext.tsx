import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { FaInfoCircle, FaQuestionCircle, FaTimes } from 'react-icons/fa';
import { Button } from '@/components/ui/button';

type ModalType = 'alert' | 'confirm' | 'prompt';

interface ModalState {
    isOpen: boolean;
    type: ModalType;
    title: string;
    message: string;
    inputLabel?: string;
    inputValue?: string;
    inputPlaceholder?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: (value?: string) => void;
    onCancel?: () => void;
}

interface ModalContextType {
    alert: (title: string, message: string) => Promise<void>;
    confirm: (title: string, message: string, options?: { confirmText?: string; cancelText?: string }) => Promise<boolean>;
    prompt: (title: string, message: string, options?: { defaultValue?: string; placeholder?: string; label?: string }) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

const ICONS = {
    alert: FaInfoCircle,
    confirm: FaQuestionCircle,
    prompt: FaQuestionCircle,
};

const ICON_COLORS = {
    alert: 'text-blue-500 bg-blue-100',
    confirm: 'text-yellow-500 bg-yellow-100',
    prompt: 'text-purple-500 bg-purple-100',
};

export function ModalProvider({ children }: { children: ReactNode }) {
    const [modal, setModal] = useState<ModalState>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: '',
    });

    const [inputValue, setInputValue] = useState('');

    const closeModal = useCallback(() => {
        setModal(prev => ({ ...prev, isOpen: false }));
        setInputValue('');
    }, []);

    const alert = useCallback((title: string, message: string): Promise<void> => {
        return new Promise(resolve => {
            setModal({
                isOpen: true,
                type: 'alert',
                title,
                message,
                confirmText: 'OK',
                onConfirm: () => {
                    closeModal();
                    resolve();
                },
            });
        });
    }, [closeModal]);

    const confirm = useCallback((
        title: string,
        message: string,
        options?: { confirmText?: string; cancelText?: string }
    ): Promise<boolean> => {
        return new Promise(resolve => {
            setModal({
                isOpen: true,
                type: 'confirm',
                title,
                message,
                confirmText: options?.confirmText || 'Confirm',
                cancelText: options?.cancelText || 'Cancel',
                onConfirm: () => {
                    closeModal();
                    resolve(true);
                },
                onCancel: () => {
                    closeModal();
                    resolve(false);
                },
            });
        });
    }, [closeModal]);

    const prompt = useCallback((
        title: string,
        message: string,
        options?: { defaultValue?: string; placeholder?: string; label?: string }
    ): Promise<string | null> => {
        setInputValue(options?.defaultValue || '');
        return new Promise(resolve => {
            setModal({
                isOpen: true,
                type: 'prompt',
                title,
                message,
                inputLabel: options?.label,
                inputPlaceholder: options?.placeholder,
                inputValue: options?.defaultValue,
                confirmText: 'Submit',
                cancelText: 'Cancel',
                onConfirm: (value) => {
                    closeModal();
                    resolve(value || null);
                },
                onCancel: () => {
                    closeModal();
                    resolve(null);
                },
            });
        });
    }, [closeModal]);

    const Icon = ICONS[modal.type];
    const iconColorClass = ICON_COLORS[modal.type];

    return (
        <ModalContext.Provider value={{ alert, confirm, prompt }}>
            {children}

            {/* Modal Overlay */}
            {modal.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => modal.type !== 'alert' && modal.onCancel?.()}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 animate-fade-in">
                        {/* Close button for non-alert modals */}
                        {modal.type !== 'alert' && (
                            <button
                                onClick={modal.onCancel}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FaTimes size={16} />
                            </button>
                        )}

                        <div className="p-6">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-full ${iconColorClass} flex items-center justify-center mx-auto mb-4`}>
                                <Icon size={24} />
                            </div>

                            {/* Title */}
                            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
                                {modal.title}
                            </h2>

                            {/* Message */}
                            <p className="text-gray-600 text-center mb-6">
                                {modal.message}
                            </p>

                            {/* Input for prompt type */}
                            {modal.type === 'prompt' && (
                                <div className="mb-6">
                                    {modal.inputLabel && (
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {modal.inputLabel}
                                        </label>
                                    )}
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={modal.inputPlaceholder}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                modal.onConfirm?.(inputValue);
                                            } else if (e.key === 'Escape') {
                                                modal.onCancel?.();
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {/* Buttons */}
                            <div className={`flex gap-3 ${modal.type === 'alert' ? 'justify-center' : 'justify-end'}`}>
                                {modal.cancelText && (
                                    <Button
                                        variant="outline"
                                        onClick={modal.onCancel}
                                        className="px-6"
                                    >
                                        {modal.cancelText}
                                    </Button>
                                )}
                                <Button
                                    onClick={() => modal.onConfirm?.(inputValue)}
                                    className="px-6 bg-blue-600 hover:bg-blue-700"
                                >
                                    {modal.confirmText}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
}

export function useModal() {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
}
