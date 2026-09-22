import { apiFetch } from './client';

export const mediaApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return apiFetch<{ url: string }>('/admin/media', { method: 'POST', body: form, isFormData: true });
  },
};
