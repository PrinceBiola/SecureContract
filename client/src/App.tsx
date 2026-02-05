import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ModalProvider } from '@/context/ModalContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import PdfViewer from '@/pages/editor/PdfViewer';

// Protected Route Wrapper
const ProtectedRoute = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) return <LoadingSpinner fullScreen text="Loading..." />;
    if (!user) return <Navigate to="/login" replace />;

    return <Outlet />;
};

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/contract/:id" element={<PdfViewer />} />
            </Route>
        </Routes>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <BrowserRouter>
                    <AuthProvider>
                        <ToastProvider>
                            <ModalProvider>
                                <AppRoutes />
                            </ModalProvider>
                        </ToastProvider>
                    </AuthProvider>
                </BrowserRouter>
            </ThemeProvider>
        </ErrorBoundary>
    );
}

export default App;


