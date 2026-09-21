'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { usersApi, UserFormValues } from '@/lib/api/users';
import { AdminUser } from '@/types/user';
import { Table, TableColumn } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TextField, SelectField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import styles from '../admin-shared.module.scss';
import { assetUrl } from '@/lib/assets';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Quản trị viên' },
  { value: 'chuyen_vien', label: 'Chuyên viên' },
  { value: 'giao_dich_vien', label: 'Giao dịch viên' },
  { value: 'nhan_vien', label: 'Nhân viên' },
];
const STATUS_OPTIONS = [
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'locked', label: 'Đã khóa' },
];

const userSchema = z.object({
  username: z.string().min(3, 'Tối thiểu 3 ký tự').max(50),
  password: z.string().min(8, 'Tối thiểu 8 ký tự').max(100).optional().or(z.literal('')),
  full_name: z.string().min(1, 'Vui lòng nhập họ tên').max(100),
  email: z.string().email('Email không hợp lệ').max(100),
  phone: z.string().min(9, 'Số điện thoại không hợp lệ').max(20),
  role: z.enum(['admin', 'chuyen_vien', 'giao_dich_vien', 'nhan_vien']),
  status: z.enum(['active', 'locked']),
});

type UserSchemaValues = z.infer<typeof userSchema>;

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [modalState, setModalState] = useState<{
    mode: 'create' | 'edit';
    item?: AdminUser;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersApi.list(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserSchemaValues>({
    resolver: zodResolver(userSchema),
  });

  function openCreate() {
    setAvatarFile(null);
    setAvatarPreview(null);
    reset({
      username: '',
      password: '',
      full_name: '',
      email: '',
      phone: '',
      role: 'nhan_vien',
      status: 'active',
    });
    setModalState({ mode: 'create' });
  }

  function openEdit(item: AdminUser) {
    setAvatarFile(null);
    setAvatarPreview(assetUrl(item.avatar_url));
    reset({
      username: item.username,
      password: '',
      full_name: item.full_name,
      email: item.email,
      phone: item.phone,
      role: item.role,
      status: item.status,
    });
    setModalState({ mode: 'edit', item });
  }

  const saveMutation = useMutation({
    mutationFn: (values: UserFormValues) =>
      modalState?.mode === 'edit' && modalState.item
        ? usersApi.update(modalState.item.id, values)
        : usersApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast('Đã lưu tài khoản thành công');
      setModalState(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast('Đã xóa tài khoản');
      setDeleteTarget(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  function onSubmit(values: UserSchemaValues) {
    const payload: UserFormValues = { ...values, avatar: avatarFile ?? undefined };
    if (!payload.password) delete payload.password;
    saveMutation.mutate(payload);
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    setAvatarFile(event.target.files?.[0] ?? null);
  }

  const columns: TableColumn<AdminUser>[] = [
    {
      key: 'full_name',
      header: 'Họ tên',
      render: (u) => u.full_name,
      sortAccessor: (u) => u.full_name,
    },
    { key: 'username', header: 'Tên đăng nhập', render: (u) => u.username },
    {
      key: 'role',
      header: 'Vai trò',
      render: (u) => ROLE_OPTIONS.find((r) => r.value === u.role)?.label,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (u) => (
        <Badge tone={u.status === 'active' ? 'success' : 'danger'}>
          {STATUS_OPTIONS.find((s) => s.value === u.status)?.label}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (u) => (
        <div className={styles.iconActions}>
          <button
            type="button"
            onClick={() => openEdit(u)}
            aria-label="Sửa"
            className={styles.iconButton}
          >
            <Pencil className={styles.icon} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(u)}
            aria-label="Xóa"
            className={styles.iconButton}
          >
            <Trash2 className={styles.icon} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý Tài khoản</h1>
        <Button onClick={openCreate}>
          <Plus className={styles.icon} /> Thêm tài khoản
        </Button>
      </div>

      <Table columns={columns} data={users ?? []} rowKey={(u) => u.id} isLoading={isLoading} />

      <Modal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        title={modalState?.mode === 'edit' ? 'Sửa tài khoản' : 'Thêm tài khoản'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <TextField
            label="Tên đăng nhập"
            disabled={modalState?.mode === 'edit'}
            error={errors.username?.message}
            {...register('username')}
          />
          <TextField
            type="password"
            label={
              modalState?.mode === 'edit' ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'
            }
            error={errors.password?.message}
            {...register('password')}
          />
          <TextField label="Họ tên" error={errors.full_name?.message} {...register('full_name')} />
          <div className={styles.grid2}>
            <TextField
              type="email"
              label="Email"
              error={errors.email?.message}
              {...register('email')}
            />
            <TextField label="Số điện thoại" error={errors.phone?.message} {...register('phone')} />
          </div>
          <div className={styles.fileField}>
            <label htmlFor="user-avatar">Ảnh đại diện</label>
            <input
              id="user-avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
            />
            {avatarPreview && (
              <div className={styles.avatarPreviewBox}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarPreview}
                  alt={avatarFile ? 'Ảnh avatar mới chọn' : 'Ảnh avatar hiện tại'}
                  className={styles.avatarPreview}
                />
                <p className={styles.imagePreviewCaption}>
                  {avatarFile ? 'Ảnh mới sẽ được sử dụng khi lưu' : 'Ảnh avatar hiện tại'}
                </p>
              </div>
            )}
            <p className={styles.muted}>JPG, PNG, WEBP hoặc GIF, tối đa 5MB.</p>
          </div>
          <div className={styles.grid2}>
            <SelectField
              label="Vai trò"
              options={ROLE_OPTIONS}
              error={errors.role?.message}
              {...register('role')}
            />
            <SelectField
              label="Trạng thái"
              options={STATUS_OPTIONS}
              error={errors.status?.message}
              {...register('status')}
            />
          </div>
          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={() => setModalState(null)}>
              Hủy
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa"
      >
        <p className={styles.confirm}>
          Bạn có chắc muốn xóa tài khoản <strong>{deleteTarget?.full_name}</strong>?
        </p>
        <div className={styles.confirmActions}>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Hủy
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            Xóa
          </Button>
        </div>
      </Modal>
    </div>
  );
}
