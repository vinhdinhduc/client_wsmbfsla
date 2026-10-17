'use client';
import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobsApi, Job } from '@/lib/api/jobs';
import { useToast } from '@/components/ui/Toast';
import { Pencil, Trash2, Download, Eye } from 'lucide-react';
import { JobContent } from '@/components/jobs/JobContent';
import { JOB_EMPLOYMENT_LABELS } from '@/lib/jobs-presentation';
import previewStyles from '@/components/jobs/JobDetail.module.scss';
import { TextField, SelectField, CheckboxField } from '@/components/ui/FormField';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { Button } from '@/components/ui/Button';
import {
  FormCard,
  FormSection,
  FormActions,
  PageHeader,
  IconButton,
  QueryState,
  ResponsiveTable,
} from '@/components/ui/FormLayout';
import styles from '@/components/ui/FormLayout.module.scss';
const empty = {
  title: '',
  slug: '',
  category: 'Kinh doanh',
  employment_type: 'full_time',
  location: 'Sơn La',
  quantity: 1,
  salary_type: 'negotiable',
  description: '<p></p>',
  requirements: '',
  benefits: '',
  deadline: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
  is_hot: false,
  is_urgent: false,
  status: 'draft',
} as Partial<Job>;
export default function JobsAdmin() {
  const client = useQueryClient(),
    { showToast } = useToast();
  const [form, setForm] = useState<Partial<Job>>(empty),
    [editing, setEditing] = useState<number>();
  const [preview, setPreview] = useState(false);
  async function downloadFile(load: () => Promise<Blob>, filename: string) {
    try {
      const blob = await load();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      showToast((error as Error).message, 'error');
    }
  }
  const jobs = useQuery({ queryKey: ['admin-jobs'], queryFn: jobsApi.listAdmin });
  const applications = useQuery({ queryKey: ['job-applications'], queryFn: jobsApi.applications });
  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        requirements: form.requirements || null,
        benefits: form.benefits || null,
      };
      return editing ? jobsApi.update(editing, payload) : jobsApi.create(payload);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['admin-jobs'] });
      setForm(empty);
      setEditing(undefined);
      showToast('Đã lưu vị trí');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  return (
    <div className={styles.page}>
      <PageHeader
        title="Tuyển dụng"
        description="Quản lý vị trí tuyển dụng và theo dõi hồ sơ ứng tuyển."
      />
      <FormCard
        title={editing ? 'Sửa vị trí' : 'Thêm vị trí'}
        description="Điền thông tin vị trí và nội dung dành cho ứng viên."
      >
        <form onSubmit={submit} className={styles.stack}>
          <FormSection title="Thông tin vị trí" columns>
            <SelectField
              label="Hình thức làm việc"
              value={form.employment_type || 'full_time'}
              onChange={(event) => setForm({ ...form, employment_type: event.target.value })}
            >
              {Object.entries(JOB_EMPLOYMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              {form.employment_type && !JOB_EMPLOYMENT_LABELS[form.employment_type] && (
                <option value={form.employment_type}>{form.employment_type}</option>
              )}
            </SelectField>
            <TextField
              label="Tiêu đề"
              required
              placeholder="Tiêu đề"
              value={form.title || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  title: e.target.value,
                  slug: editing
                    ? form.slug
                    : e.target.value
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/đ/g, 'd')
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, ''),
                })
              }
            />
            <TextField
              label="Slug"
              required
              placeholder="Slug"
              value={form.slug || ''}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
            <TextField
              label="Nhóm ngành"
              required
              placeholder="Nhóm ngành"
              value={form.category || ''}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <TextField
              label="Địa điểm"
              required
              placeholder="Địa điểm"
              value={form.location || ''}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </FormSection>
          <FormSection title="Thời hạn & số lượng">
            <div className={styles.dateGrid}>
              <TextField
                label="Hạn nộp"
                type="date"
                required
                value={form.deadline || ''}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
              <TextField
                label="Số lượng"
                type="number"
                min={1}
                value={form.quantity || 1}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              />
            </div>
          </FormSection>
          <FormSection title="Nội dung">
            <RichTextEditor
              label="Mô tả công việc"
              minHeight="12rem"
              value={form.description || ''}
              onChange={(html) => setForm((previous) => ({ ...previous, description: html }))}
            />
            <RichTextEditor
              label="Yêu cầu"
              minHeight="10rem"
              value={form.requirements || ''}
              onChange={(html) => setForm((previous) => ({ ...previous, requirements: html }))}
            />
            <RichTextEditor
              label="Quyền lợi"
              minHeight="10rem"
              value={form.benefits || ''}
              onChange={(html) => setForm((previous) => ({ ...previous, benefits: html }))}
            />
          </FormSection>
          <FormSection title="Trạng thái">
            <div className={styles.rowActions}>
              <CheckboxField
                label="Hot"
                type="checkbox"
                checked={Boolean(form.is_hot)}
                onChange={(e) => setForm({ ...form, is_hot: e.target.checked })}
              />
              <CheckboxField
                label="Gấp"
                type="checkbox"
                checked={Boolean(form.is_urgent)}
                onChange={(e) => setForm({ ...form, is_urgent: e.target.checked })}
              />
            </div>
            <SelectField
              label="Trạng thái"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Job['status'] })}
            >
              <option value="draft">Nháp</option>
              <option value="recruiting">Đang tuyển</option>
              <option value="paused">Tạm dừng</option>
            </SelectField>
          </FormSection>
          <FormActions>
            <Button
              type="button"
              variant="outline"
              aria-expanded={preview}
              aria-controls="job-preview"
              onClick={() => setPreview(!preview)}
            >
              <Eye size={18} aria-hidden="true" />
              {preview ? 'Đóng xem trước' : 'Xem trước tin'}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(undefined);
                  setForm(empty);
                }}
              >
                Hủy chỉnh sửa
              </Button>
            )}
            <Button type="submit" isLoading={save.isPending}>
              Lưu vị trí
            </Button>
          </FormActions>
        </form>
      </FormCard>
      {preview && (
        <div
          id="job-preview"
          className={previewStyles.content}
          aria-label="Xem trước tin tuyển dụng"
        >
          <section className={previewStyles.hero}>
            <p className={previewStyles.eyebrow}>Bản xem trước · Chưa xuất bản</p>
            <h2>{form.title || 'Tiêu đề vị trí'}</h2>
            <p>
              {form.location} · {form.quantity} người ·{' '}
              {JOB_EMPLOYMENT_LABELS[form.employment_type || ''] || form.employment_type} · Hạn{' '}
              {form.deadline}
            </p>
          </section>
          <JobContent
            description={form.description}
            requirements={form.requirements}
            benefits={form.benefits}
          />
        </div>
      )}
      <FormCard title="Vị trí" description="Các vị trí đã tạo và trạng thái tuyển dụng.">
        <QueryState
          loading={jobs.isPending}
          error={jobs.error}
          empty={!jobs.data?.length}
          emptyTitle="Chưa có vị trí nào"
        />
        <ResponsiveTable label="Danh sách vị trí" headings={['Thông tin', 'Thao tác']}>
          {jobs.data?.map((item) => (
            <tr key={item.id}>
              <td data-label="Thông tin">
                <strong>{item.title}</strong>
                <p>
                  {item.status === 'draft'
                    ? 'Nháp'
                    : item.status === 'recruiting'
                      ? 'Đang tuyển'
                      : 'Tạm dừng'}{' '}
                  · Hạn nộp: {item.deadline}
                </p>
              </td>
              <td data-label="Thao tác">
                <div className={styles.rowActions}>
                  <IconButton
                    label={`Sửa vị trí ${item.title}`}
                    onClick={() => {
                      setEditing(item.id);
                      setForm({
                        ...item,
                        employment_type:
                          Object.entries(JOB_EMPLOYMENT_LABELS).find(
                            ([, label]) => label === item.employment_type,
                          )?.[0] || item.employment_type,
                      });
                    }}
                  >
                    <Pencil />
                  </IconButton>
                  <IconButton
                    label={`Xóa vị trí ${item.title}`}
                    onClick={() => {
                      if (window.confirm(`Xóa vị trí “${item.title}”?`))
                        void jobsApi
                          .remove(item.id)
                          .then(() => client.invalidateQueries({ queryKey: ['admin-jobs'] }))
                          .catch((error: Error) => showToast(error.message, 'error'));
                    }}
                  >
                    <Trash2 />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      </FormCard>
      <div id="applications" style={{ scrollMarginTop: '100px' }}>
        <FormCard
          title="Hồ sơ ứng tuyển"
          description="Theo dõi trạng thái, tải CV và xuất danh sách hồ sơ."
          actions={
            <Button
              variant="secondary"
              onClick={() => downloadFile(jobsApi.exportApplications, 'ho-so-ung-tuyen.xlsx')}
            >
              <Download size={18} aria-hidden="true" /> Xuất Excel
            </Button>
          }
        >
          <QueryState
            loading={applications.isPending}
            error={applications.error}
            empty={!applications.data?.length}
            emptyTitle="Chưa có hồ sơ ứng tuyển"
          />
          <ResponsiveTable label="Hồ sơ ứng tuyển" headings={['Ứng viên', 'Trạng thái', 'CV']}>
            {applications.data?.map((item) => (
              <tr key={item.id}>
                <td data-label="Ứng viên">
                  <strong>{item.full_name}</strong>
                  <p>
                    {item.code} · {item.job?.title || 'Nguồn ứng viên'}
                  </p>
                  <p>
                    {item.phone} · {item.email}
                  </p>
                </td>
                <td data-label="Trạng thái">
                  <SelectField
                    label={`Trạng thái hồ sơ ${item.code}`}
                    value={item.status}
                    onChange={(e) =>
                      jobsApi
                        .updateApplication(item.id, {
                          status: e.target.value as typeof item.status,
                        })
                        .then(() => client.invalidateQueries({ queryKey: ['job-applications'] }))
                        .catch((error: Error) => showToast(error.message, 'error'))
                    }
                  >
                    <option value="new">Mới</option>
                    <option value="screening">Sơ loại</option>
                    <option value="interview">Phỏng vấn</option>
                    <option value="accepted">Đạt</option>
                    <option value="rejected">Loại</option>
                  </SelectField>
                </td>
                <td data-label="CV">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      downloadFile(
                        () => jobsApi.cv(item.id),
                        `cv-${item.code}.${item.cv_mime === 'application/pdf' ? 'pdf' : 'docx'}`,
                      )
                    }
                  >
                    Tải CV
                  </Button>
                </td>
              </tr>
            ))}
          </ResponsiveTable>
        </FormCard>
      </div>
    </div>
  );
}
