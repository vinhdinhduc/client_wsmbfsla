'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, utilitiesApi, Utility } from '@/lib/api/utilities';
import { useToast } from '@/components/ui/Toast';

import { Pencil, Trash2 } from 'lucide-react';
import { TextField, TextareaField, SelectField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import {
  FormCard,
  FormSection,
  FormActions,
  PageHeader,
  IconButton,
  QueryState,
  ResponsiveTable,
  ImagePreview,
} from '@/components/ui/FormLayout';
import styles from '@/components/ui/FormLayout.module.scss';

const emptyUtility = {
  name: '',
  slug: '',
  summary: '',
  content: '',
  features: [],
  card_image: '',
  hero_image: '',
  ios_url: '',
  android_url: '',
  website_url: '',
  cta_type: 'website',
  cta_label: 'Chi tiết',
  sort_order: 0,
  status: 'active',
} as Partial<Utility>;
const emptyDownload = {
  title: '',
  category: '',
  file_url: '',
  description: '',
  sort_order: 0,
  status: 'active',
} as Partial<Download>;

export default function UtilitiesAdmin() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState<Partial<Utility>>(emptyUtility);
  const [id, setId] = useState<number>();
  const [downloadForm, setDownloadForm] = useState<Partial<Download>>(emptyDownload);
  const [downloadId, setDownloadId] = useState<number>();
  const list = useQuery({ queryKey: ['admin-utilities'], queryFn: utilitiesApi.adminList });
  const downloads = useQuery({
    queryKey: ['admin-utility-downloads'],
    queryFn: utilitiesApi.adminDownloads,
  });
  const save = useMutation({
    mutationFn: () => (id ? utilitiesApi.update(id, form) : utilitiesApi.create(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-utilities'] });
      setForm(emptyUtility);
      setId(undefined);
      showToast('Đã lưu tiện ích');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  const saveDownload = useMutation({
    mutationFn: () =>
      downloadId
        ? utilitiesApi.updateDownload(downloadId, downloadForm)
        : utilitiesApi.createDownload(downloadForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-utility-downloads'] });
      setDownloadForm(emptyDownload);
      setDownloadId(undefined);
      showToast('Đã lưu tài liệu');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }
  function submitDownload(event: FormEvent) {
    event.preventDefault();
    saveDownload.mutate();
  }
  function autoSlug(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Tiện ích và tải về"
        description="Quản lý tiện ích số và tài liệu dành cho khách hàng."
      />
      <FormCard
        title={id ? 'Sửa tiện ích' : 'Thêm tiện ích'}
        description="Cập nhật thông tin, hình ảnh và liên kết của tiện ích."
      >
        <form onSubmit={submit} className={styles.stack}>
          <FormSection title="Thông tin chung" columns>
            <TextField
              required
              label="Tên"
              placeholder="Tên"
              value={form.name ?? ''}
              onChange={(event) =>
                setForm({
                  ...form,
                  name: event.target.value,
                  slug: id ? form.slug : autoSlug(event.target.value),
                })
              }
            />
            <TextField
              required
              label="Slug"
              placeholder="Slug"
              value={form.slug ?? ''}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
            />
            <TextareaField
              label="Mô tả ngắn"
              placeholder="Mô tả ngắn"
              value={form.summary ?? ''}
              onChange={(event) => setForm({ ...form, summary: event.target.value })}
            />
          </FormSection>
          <FormSection title="Hình ảnh" columns>
            <div>
              <TextField
                label="URL ảnh thẻ"
                placeholder="URL ảnh thẻ"
                value={form.card_image ?? ''}
                onChange={(event) => setForm({ ...form, card_image: event.target.value })}
              />
              <ImagePreview url={form.card_image} label="Xem trước ảnh thẻ" />
            </div>
            <div>
              <TextField
                label="URL ảnh hero"
                placeholder="URL ảnh hero"
                value={form.hero_image ?? ''}
                onChange={(event) => setForm({ ...form, hero_image: event.target.value })}
              />
              <ImagePreview url={form.hero_image} label="Xem trước ảnh hero" />
            </div>
          </FormSection>
          <FormSection title="Liên kết" columns>
            <TextField
              type="url"
              label="Link iOS"
              placeholder="Link iOS"
              value={form.ios_url ?? ''}
              onChange={(event) => setForm({ ...form, ios_url: event.target.value })}
            />
            <TextField
              type="url"
              label="Link Android"
              placeholder="Link Android"
              value={form.android_url ?? ''}
              onChange={(event) => setForm({ ...form, android_url: event.target.value })}
            />
            <div className={styles.wide}>
              <TextField
                type="url"
                label="Website"
                placeholder="Website"
                value={form.website_url ?? ''}
                onChange={(event) => setForm({ ...form, website_url: event.target.value })}
              />
            </div>
          </FormSection>
          <FormSection title="Nội dung">
            <TextareaField
              hint="Mỗi dòng một mục"
              label="Tính năng"
              placeholder="Tính năng, mỗi dòng một mục"
              value={(form.features ?? []).join('\n')}
              onChange={(event) =>
                setForm({ ...form, features: event.target.value.split('\n').filter(Boolean) })
              }
            />
            <TextareaField
              className={styles.code}
              rows={6}
              label="Nội dung HTML"
              placeholder="Nội dung HTML"
              value={form.content ?? ''}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
            />
          </FormSection>
          <FormSection title="Hiển thị">
            <SelectField
              label="Hiển thị"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as Utility['status'] })
              }
            >
              <option value="active">Hiển thị</option>
              <option value="inactive">Ẩn</option>
            </SelectField>
          </FormSection>
          <FormActions>
            <Button type="submit" isLoading={save.isPending}>
              Lưu tiện ích
            </Button>
          </FormActions>
        </form>
        <section className={styles.stack} aria-label="Danh sách tiện ích">
          <h3>Tiện ích đã tạo</h3>
          <QueryState
            loading={list.isPending}
            error={list.error}
            empty={!list.data?.length}
            emptyTitle="Chưa có tiện ích nào"
          />
          <ResponsiveTable label="Danh sách tiện ích" headings={['Thông tin', 'Thao tác']}>
            {list.data?.map((item) => (
              <tr key={item.id}>
                <td data-label="Thông tin">
                  <strong>{item.name}</strong>
                  <p>{item.status === 'active' ? 'Hiển thị' : 'Ẩn'}</p>
                </td>
                <td data-label="Thao tác">
                  <div className={styles.rowActions}>
                    <IconButton
                      label={`Sửa tiện ích ${item.name}`}
                      onClick={() => {
                        setId(item.id);
                        setForm(item);
                      }}
                    >
                      <Pencil />
                    </IconButton>
                    <IconButton
                      label={`Xóa tiện ích ${item.name}`}
                      onClick={() => {
                        if (window.confirm(`Xóa tiện ích “${item.name}”?`))
                          void utilitiesApi
                            .remove(item.id)
                            .then(() =>
                              queryClient.invalidateQueries({ queryKey: ['admin-utilities'] }),
                            )
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
        </section>
      </FormCard>
      <FormCard
        title="Trung tâm tải về"
        description="Thêm tài liệu và sắp xếp theo danh mục để khách hàng dễ tìm kiếm."
      >
        <form onSubmit={submitDownload} className={styles.stack}>
          <FormSection title="Thông tin tài liệu" columns>
            <TextField
              required
              label="Tên tài liệu"
              placeholder="Tên tài liệu"
              value={downloadForm.title ?? ''}
              onChange={(event) => setDownloadForm({ ...downloadForm, title: event.target.value })}
            />
            <TextField
              required
              label="Danh mục"
              placeholder="Danh mục"
              value={downloadForm.category ?? ''}
              onChange={(event) =>
                setDownloadForm({ ...downloadForm, category: event.target.value })
              }
            />
            <div className={styles.wide}>
              <TextField
                required
                type="url"
                label="URL tải xuống"
                placeholder="URL tải xuống"
                value={downloadForm.file_url ?? ''}
                onChange={(event) =>
                  setDownloadForm({ ...downloadForm, file_url: event.target.value })
                }
              />
            </div>
            <TextareaField
              label="Mô tả"
              placeholder="Mô tả"
              value={downloadForm.description ?? ''}
              onChange={(event) =>
                setDownloadForm({ ...downloadForm, description: event.target.value })
              }
            />
            <SelectField
              label="Hiển thị"
              value={downloadForm.status}
              onChange={(event) =>
                setDownloadForm({
                  ...downloadForm,
                  status: event.target.value as Download['status'],
                })
              }
            >
              <option value="active">Hiển thị</option>
              <option value="inactive">Ẩn</option>
            </SelectField>
          </FormSection>
          <FormActions>
            <Button type="submit" isLoading={saveDownload.isPending}>
              Lưu tài liệu
            </Button>
          </FormActions>
        </form>
        <section className={styles.stack} aria-label="Danh sách tài liệu">
          <h3>Tài liệu đã tạo</h3>
          <QueryState
            loading={downloads.isPending}
            error={downloads.error}
            empty={!downloads.data?.length}
            emptyTitle="Chưa có tài liệu nào"
          />
          <ResponsiveTable label="Danh sách tài liệu" headings={['Thông tin', 'Thao tác']}>
            {downloads.data?.map((item) => (
              <tr key={item.id}>
                <td data-label="Thông tin">
                  <strong>{item.title}</strong>
                  <p>
                    {item.category} · {item.download_count} lượt tải
                  </p>
                </td>
                <td data-label="Thao tác">
                  <div className={styles.rowActions}>
                    <IconButton
                      label={`Sửa tài liệu ${item.title}`}
                      onClick={() => {
                        setDownloadId(item.id);
                        setDownloadForm(item);
                      }}
                    >
                      <Pencil />
                    </IconButton>
                    <IconButton
                      label={`Xóa tài liệu ${item.title}`}
                      onClick={() => {
                        if (window.confirm(`Xóa tài liệu “${item.title}”?`))
                          void utilitiesApi
                            .removeDownload(item.id)
                            .then(() =>
                              queryClient.invalidateQueries({
                                queryKey: ['admin-utility-downloads'],
                              }),
                            )
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
        </section>
      </FormCard>
    </div>
  );
}
