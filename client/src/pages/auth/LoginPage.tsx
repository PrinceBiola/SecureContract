import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { FaShieldAlt, FaFileContract, FaFileSignature, FaUsers, FaCheckCircle, FaPen } from "react-icons/fa";
import { AiOutlineMail, AiOutlineLock } from "react-icons/ai";
import { HiDocumentText } from "react-icons/hi";

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await authService.login(data.email, data.password);
      login(response.token, response.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 relative overflow-hidden">
      {/* Animated floating document icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top left cluster */}
        <div className="absolute top-[10%] left-[8%] text-blue-200/40 animate-float-slow">
          <FaFileContract size={48} />
        </div>
        <div className="absolute top-[25%] left-[15%] text-indigo-200/30 animate-float-medium" style={{ animationDelay: '1s' }}>
          <HiDocumentText size={36} />
        </div>

        {/* Top right cluster */}
        <div className="absolute top-[8%] right-[12%] text-blue-300/30 animate-float-medium" style={{ animationDelay: '0.5s' }}>
          <FaFileSignature size={42} />
        </div>
        <div className="absolute top-[20%] right-[5%] text-indigo-200/40 animate-float-slow" style={{ animationDelay: '2s' }}>
          <FaCheckCircle size={28} />
        </div>

        {/* Middle left */}
        <div className="absolute top-[45%] left-[5%] text-blue-200/30 animate-float-fast" style={{ animationDelay: '1.5s' }}>
          <FaUsers size={40} />
        </div>

        {/* Middle right */}
        <div className="absolute top-[50%] right-[8%] text-indigo-300/30 animate-float-slow" style={{ animationDelay: '0.8s' }}>
          <FaPen size={32} />
        </div>

        {/* Bottom left cluster */}
        <div className="absolute bottom-[15%] left-[10%] text-blue-300/40 animate-float-medium" style={{ animationDelay: '1.2s' }}>
          <HiDocumentText size={44} />
        </div>
        <div className="absolute bottom-[25%] left-[18%] text-indigo-200/30 animate-float-fast" style={{ animationDelay: '2.5s' }}>
          <FaCheckCircle size={24} />
        </div>

        {/* Bottom right cluster */}
        <div className="absolute bottom-[12%] right-[15%] text-blue-200/40 animate-float-slow" style={{ animationDelay: '1.8s' }}>
          <FaFileContract size={38} />
        </div>
        <div className="absolute bottom-[28%] right-[6%] text-indigo-300/30 animate-float-medium" style={{ animationDelay: '0.3s' }}>
          <FaFileSignature size={30} />
        </div>
      </div>

      {/* Subtle gradient orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/30 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-2xl rounded-2xl p-8 border border-white/50 dark:border-gray-700 z-10 transition-all hover:shadow-3xl">

        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg mb-4 text-white transform rotate-3 transition-transform hover:rotate-0">
            <FaShieldAlt size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Welcome Back</h1>
          <p className="text-gray-500 dark:text-gray-400 text-center">Enter your credentials to access your secure dashboard</p>
        </div>


        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center border border-red-200 dark:border-red-800 animate-slide-in">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email Address</Label>
              <div className="relative">
                <AiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10 bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs ml-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password</Label>
                <Link to="#" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">Forgot password?</Link>
              </div>
              <div className="relative">
                <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="text-red-500 text-xs ml-1">{errors.password.message}</p>}
            </div>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-900/30 transition-all duration-300 transform hover:-translate-y-0.5" disabled={isLoading}>
            {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Sign In'}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold hover:underline transition-all">
              Create Account
            </Link>
          </p>
        </div>
      </div>

      <div className="absolute bottom-4 text-center w-full text-xs text-gray-400 font-medium">
        &copy; 2026 SecureContract Inc. All rights reserved.
      </div>
    </div >
  );
}
