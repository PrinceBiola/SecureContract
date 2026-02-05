import axios from 'axios';

// API error handler helper
export interface ApiError {
    message: string;
    code?: string;
    field?: string;
    status: number;
}

export function parseApiError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
        const response = error.response;

        if (response) {
            // Server responded with an error
            const data = response.data;
            return {
                message: data?.error || data?.message || getDefaultErrorMessage(response.status),
                code: data?.code,
                field: data?.field,
                status: response.status,
            };
        }

        if (error.code === 'ECONNABORTED') {
            return {
                message: 'Request timed out. Please try again.',
                code: 'TIMEOUT',
                status: 408,
            };
        }

        if (error.code === 'ERR_NETWORK') {
            return {
                message: 'Unable to connect to server. Please check your connection.',
                code: 'NETWORK_ERROR',
                status: 0,
            };
        }
    }

    // Fallback for unknown errors
    return {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        status: 500,
    };
}

function getDefaultErrorMessage(status: number): string {
    switch (status) {
        case 400:
            return 'Invalid request. Please check your input.';
        case 401:
            return 'Please log in to continue.';
        case 403:
            return 'You do not have permission to perform this action.';
        case 404:
            return 'The requested resource was not found.';
        case 409:
            return 'This resource already exists.';
        case 422:
            return 'The submitted data is invalid.';
        case 429:
            return 'Too many requests. Please wait a moment and try again.';
        case 500:
            return 'Server error. Please try again later.';
        case 502:
        case 503:
        case 504:
            return 'Service is temporarily unavailable. Please try again later.';
        default:
            return 'An unexpected error occurred.';
    }
}

// Retry helper with exponential backoff
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: { maxRetries?: number; baseDelay?: number } = {}
): Promise<T> {
    const { maxRetries = 3, baseDelay = 1000 } = options;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry for client errors (4xx)
            if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
                throw error;
            }

            // Exponential backoff
            if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}
