'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TextField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function AdminLoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    try {
      await login(values.username, values.password);
      const redirect = searchParams.get('redirect') || '/admin/dashboard';
      router.replace(redirect);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Đăng nhập thất bại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-100 bg-white p-8 shadow-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Image src="/logo-mobifone.svg" alt="MobiFone Sơn La" width={48} height={48} />
          <h1 className="font-heading text-xl font-bold text-neutral-900">Đăng nhập quản trị</h1>
          <p className="text-sm text-neutral-500">MobiFone Chi nhánh Sơn La</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <TextField label="Tên đăng nhập" error={errors.username?.message} {...register('username')} />
          <TextField type="password" label="Mật khẩu" error={errors.password?.message} {...register('password')} />
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Đăng nhập
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
