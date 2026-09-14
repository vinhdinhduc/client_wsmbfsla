'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Suspense } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TextField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import styles from './page.module.scss';

const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  remember: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function AdminLoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    try {
      await login(values.username, values.password, values.remember);
      const redirect = searchParams.get('redirect') || '/admin/dashboard';
      router.replace(redirect);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Đăng nhập thất bại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logoFrame}>
            <Image src="/logo_ngan_cropped.png" alt="MobiFone" width={112} height={112} priority />
          </div>
          <h1 className={styles.title}>Đăng nhập quản trị</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <TextField
            label="Tên đăng nhập"
            error={errors.username?.message}
            {...register('username')}
          />
          <div className={styles.passwordField}>
            <label className={styles.fieldLabel} htmlFor="login-password">
              Mật khẩu
            </label>
            <div className={styles.passwordControl}>
              <input
                id="login-password"
                type={isPasswordVisible ? 'text' : 'password'}
                className={`${styles.passwordInput} ${errors.password ? styles.invalid : ''}`}
                autoComplete="current-password"
                {...register('password')}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                aria-label={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                onPointerDown={(event) => {
                  event.preventDefault();
                  setIsPasswordVisible(true);
                }}
                onPointerUp={() => setIsPasswordVisible(false)}
                onPointerLeave={() => setIsPasswordVisible(false)}
                onPointerCancel={() => setIsPasswordVisible(false)}
                onBlur={() => setIsPasswordVisible(false)}
              >
                {isPasswordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
            {errors.password?.message && <p className={styles.error}>{errors.password.message}</p>}
          </div>
          <label className={styles.remember}>
            <input type="checkbox" {...register('remember')} />
            <span className={styles.checkboxIcon} aria-hidden="true">
              <Check />
            </span>
            <span>Ghi nhớ đăng nhập</span>
          </label>
          <div className={styles.formMeta}>
            <button
              type="button"
              className={styles.forgotPassword}
              onClick={() =>
                showToast('Vui lòng liên hệ quản trị viên để đặt lại mật khẩu.', 'error')
              }
            >
              Quên mật khẩu?
            </button>
          </div>
          <Button type="submit" className={styles.submit} isLoading={isSubmitting}>
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
