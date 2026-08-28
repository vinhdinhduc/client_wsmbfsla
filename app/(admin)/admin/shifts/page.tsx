'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { shiftsApi, ShiftFormValues } from '@/lib/api/shifts';
import { usersApi } from '@/lib/api/users';
import { WorkShift } from '@/types/user';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextField, SelectField, TextareaField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';

const WEEKDAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

function getWeekDates(anchor: Date): Date[] {
  const day = anchor.getDay() === 0 ? 7 : anchor.getDay();
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - (day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const shiftSchema = z.object({
  user_id: z.coerce.number().int().positive('Vui lòng chọn giao dịch viên'),
  shift_date: z.string().min(1, 'Vui lòng chọn ngày'),
  start_time: z.string().min(1, 'Vui lòng chọn giờ bắt đầu'),
  end_time: z.string().min(1, 'Vui lòng chọn giờ kết thúc'),
  note: z.string().max(255).optional().or(z.literal('')),
});
type ShiftSchemaValues = z.infer<typeof shiftSchema>;

export default function AdminShiftsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [modalState, setModalState] = useState<{ date?: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkShift | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekAnchor), [weekAnchor]);

  const { data: shifts } = useQuery({ queryKey: ['admin-shifts'], queryFn: () => shiftsApi.list() });
  const { data: users } = useQuery({ queryKey: ['admin-users-for-shift'], queryFn: () => usersApi.list() });
  const staffOptions = (users ?? [])
    .filter((u) => u.role === 'giao_dich_vien')
    .map((u) => ({ value: String(u.id), label: u.full_name }));

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ShiftSchemaValues>({
    resolver: zodResolver(shiftSchema),
  });

  function openCreate(date: string) {
    reset({ user_id: staffOptions[0] ? Number(staffOptions[0].value) : 0, shift_date: date, start_time: '08:00', end_time: '17:00', note: '' });
    setModalState({ date });
  }

  const saveMutation = useMutation({
    mutationFn: (values: ShiftFormValues) => shiftsApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shifts'] });
      showToast('Đã xếp ca trực thành công');
      setModalState(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => shiftsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shifts'] });
      showToast('Đã xóa ca trực');
      setDeleteTarget(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  function onSubmit(values: ShiftSchemaValues) {
    saveMutation.mutate({ ...values, note: values.note || null });
  }

  function shiftsForDate(dateStr: string): WorkShift[] {
    return (shifts ?? []).filter((s) => s.shift_date.slice(0, 10) === dateStr);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-neutral-900">Xếp lịch trực Giao dịch viên</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-neutral-100"
            aria-label="Tuần trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-neutral-900">
            {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
          </span>
          <button
            type="button"
            onClick={() => setWeekAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-neutral-100"
            aria-label="Tuần sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {weekDates.map((date, idx) => {
          const dateStr = toDateStr(date);
          const dayShifts = shiftsForDate(dateStr);
          return (
            <div key={dateStr} className="rounded-lg border border-neutral-100 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-500">{WEEKDAY_LABELS[idx]}</p>
                  <p className="text-sm font-semibold text-neutral-900">{formatDate(date)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openCreate(dateStr)}
                  aria-label="Thêm ca trực"
                  className="relative rounded p-1 text-primary hover:bg-primary/10 before:absolute before:-inset-1 before:content-['']"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1.5">
                {dayShifts.length === 0 ? (
                  <p className="text-xs text-neutral-500">Chưa xếp ca</p>
                ) : (
                  dayShifts.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded bg-neutral-100 px-2 py-1.5 text-xs">
                      <div>
                        <p className="font-medium text-neutral-900">{s.staff?.full_name ?? `NV #${s.user_id}`}</p>
                        <p className="text-neutral-500">{s.start_time} - {s.end_time}</p>
                      </div>
                      <button type="button" onClick={() => setDeleteTarget(s)} aria-label="Xóa ca" className="relative text-neutral-500 hover:text-danger before:absolute before:-inset-1 before:content-['']">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={modalState !== null} onClose={() => setModalState(null)} title="Xếp ca trực">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <SelectField label="Giao dịch viên" options={staffOptions} error={errors.user_id?.message} {...register('user_id')} />
          <TextField type="date" label="Ngày trực" error={errors.shift_date?.message} {...register('shift_date')} />
          <div className="grid grid-cols-2 gap-4">
            <TextField type="time" label="Giờ bắt đầu" error={errors.start_time?.message} {...register('start_time')} />
            <TextField type="time" label="Giờ kết thúc" error={errors.end_time?.message} {...register('end_time')} />
          </div>
          <TextareaField label="Ghi chú" error={errors.note?.message} {...register('note')} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalState(null)}>Hủy</Button>
            <Button type="submit" isLoading={saveMutation.isPending}>Lưu</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Xác nhận xóa">
        <p className="text-neutral-900">Bạn có chắc muốn xóa ca trực này?</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button>
          <Button variant="danger" isLoading={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>Xóa</Button>
        </div>
      </Modal>
    </div>
  );
}
