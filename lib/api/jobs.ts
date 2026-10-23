import { apiFetch, ApiError, buildApiUrl } from './client';
export interface Job {
  id: number;
  title: string;
  slug: string;
  category: string;
  level?: string | null;
  employment_type: string;
  store_id?: number | null;
  location: string;
  quantity: number;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_type: 'range' | 'negotiable' | 'hidden';
  description: string;
  requirements?: string | null;
  benefits?: string | null;
  deadline: string;
  is_hot: boolean;
  is_urgent: boolean;
  status: 'draft' | 'recruiting' | 'paused';
  created_at: string;
  updated_at?: string;
}
export interface JobApplication {
  id: number;
  code: string;
  job_id: number | null;
  full_name: string;
  phone: string;
  email: string;
  cv_mime?: string;
  cv_original_name?: string;
  status: 'new' | 'screening' | 'interview' | 'accepted' | 'rejected';
  created_at: string;
  job?: Pick<Job, 'id' | 'title'>;
}
function uploadApplication(
  form: FormData,
  options: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {},
) {
  if (!options.onProgress || typeof XMLHttpRequest === 'undefined')
    return apiFetch<{ id: number; code: string }>('/public/job-applications', {
      method: 'POST',
      body: form,
      isFormData: true,
      signal: options.signal,
    });
  return new Promise<{ id: number; code: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', buildApiUrl('/public/job-applications'));
    xhr.timeout = 90_000;
    const abort = () => xhr.abort();
    const cleanup = () => options.signal?.removeEventListener('abort', abort);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        options.onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      cleanup();
      try {
        const payload = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && payload.success) resolve(payload.data);
        else
          reject(
            new ApiError(
              xhr.status >= 500
                ? 'Máy chủ chưa thể nhận hồ sơ. Vui lòng thử lại.'
                : payload.message || 'Không thể gửi hồ sơ. Vui lòng thử lại.',
              xhr.status,
            ),
          );
      } catch {
        reject(new ApiError('Không thể gửi hồ sơ. Vui lòng thử lại.', xhr.status));
      }
    };
    xhr.onerror = () => {
      cleanup();
      reject(
        new ApiError('Không thể kết nối tới máy chủ. Dữ liệu của bạn vẫn được giữ để thử lại.', 0),
      );
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(new ApiError('Gửi hồ sơ quá thời gian chờ. Vui lòng thử lại.', 0));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException('Đã hủy gửi hồ sơ', 'AbortError'));
    };
    if (options.signal?.aborted) {
      reject(new DOMException('Đã hủy gửi hồ sơ', 'AbortError'));
      return;
    }
    options.signal?.addEventListener('abort', abort, { once: true });
    xhr.send(form);
  });
}
export const jobsApi = {
  listPublic: (
    params: {
      category?: string;
      location?: string;
      employment_type?: string;
      include_expired?: boolean;
    } = {},
  ) => apiFetch<Job[]>('/public/jobs', { params }),
  detail: (slug: string) => apiFetch<Job>(`/public/jobs/${slug}`),
  apply: uploadApplication,
  listAdmin: () => apiFetch<Job[]>('/admin/jobs'),
  get: (id: number) => apiFetch<Job>(`/admin/jobs/${id}`),
  create: (body: Partial<Job>) => apiFetch<Job>('/admin/jobs', { method: 'POST', body }),
  update: (id: number, body: Partial<Job>) =>
    apiFetch<Job>(`/admin/jobs/${id}`, { method: 'PUT', body }),
  remove: (id: number) => apiFetch<null>(`/admin/jobs/${id}`, { method: 'DELETE' }),
  applications: () => apiFetch<JobApplication[]>('/admin/jobs/applications'),
  updateApplication: (id: number, body: Partial<JobApplication>) =>
    apiFetch<JobApplication>(`/admin/jobs/applications/${id}`, { method: 'PATCH', body }),
  cv: (id: number) => apiFetch<Blob>(`/admin/jobs/applications/${id}/cv`),
  exportApplications: () => apiFetch<Blob>('/admin/jobs/applications/export'),
};
