import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AdminLoginForm {
  email: string;
  password: string;
}

// Add this for TypeScript JSX support if not already present in the project
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

const AdminLogin: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, loading } = useAuth();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AdminLoginForm>();

  const onSubmit: SubmitHandler<AdminLoginForm> = async (data: AdminLoginForm) => {
    try {
      const result = await login(data.email, data.password);
      if (result.success) {
        toast({
          title: 'Login Successful',
          description: 'Welcome to the admin dashboard.',
        });
        setLocation('/admin');
      } else {
        toast({
          title: 'Login Failed',
          description: result.error || 'Invalid credentials',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-green-400 to-teal-400">
      <div className="w-full max-w-md p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          <div className="bg-blue-100 p-3 rounded-full shadow mb-4">
            <i className="fas fa-user-shield text-2xl text-blue-500"></i>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">Admin Login</h1>
          <p className="text-gray-600 mb-6 text-center">Sign in to manage bookings and facility settings</p>
          <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                {...register('email', { required: true })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                placeholder="admin@example.com"
                disabled={isSubmitting}
              />
              {errors.email && <span className="text-xs text-red-500">Email is required</span>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <Input
                type="password"
                {...register('password', { required: true })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                placeholder="••••••••"
                disabled={isSubmitting}
              />
              {errors.password && <span className="text-xs text-red-500">Password is required</span>}
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 via-green-400 to-teal-400 text-white font-bold py-2 rounded-lg shadow hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
