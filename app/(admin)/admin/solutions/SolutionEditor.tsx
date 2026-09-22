'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Solution } from '@/types/product';
import { SolutionFormValues, solutionsApi } from '@/lib/api/solutions';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { IconPicker } from '@/components/shared/IconPicker';
import { useToast } from '@/components/ui/Toast';
import styles from './SolutionEditor.module.scss';

type Form = SolutionFormValues;
const sections = [
  ['overview', 'Tổng quan'], ['features', 'Tính năng'], ['audience', 'Đối tượng khách hàng'],
  ['pricing', 'Bảng giá'], ['process', 'Sơ đồ và quy trình'], ['faq', 'FAQ'],
] as const;

export function SolutionEditor({ initial }: { initial?: Solution }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState<Form>({
    name: initial?.name || '', slug: initial?.slug || '', category: initial?.category || 'sme',
    summary: initial?.summary || '', content: initial?.content || '<p></p>', thumbnail: initial?.thumbnail,
    target_customers: initial?.target_customers || '', legal_basis: initial?.legal_basis || '',
    brochure_url: initial?.brochure_url || '', video_url: initial?.video_url || '',
    is_hot: initial?.is_hot || false, status: initial?.status || 'active',
    hero_badge: initial?.hero_badge || '', hero_title: initial?.hero_title || '', hero_subtitle: initial?.hero_subtitle || '',
    cta_label: initial?.cta_label || '', cta_url: initial?.cta_url || '',
    seo_title: initial?.seo_title || '', seo_description: initial?.seo_description || '',
    section_visibility: initial?.section_visibility || {}, section_titles: initial?.section_titles || {}, audience_cards: initial?.audience_cards || [],
    features: initial?.features?.map(({ icon, title, description, sort_order }) => ({ icon, title, description, sort_order })) || [],
    pricing: initial?.pricing?.map(({ package_code, package_name, price, cycle_months, condition_note, status, sort_order }) => ({ package_code, package_name, price, cycle_months, condition_note, status, sort_order })) || [],
    faqs: initial?.faqs?.map(({ question, answer, sort_order }) => ({ question, answer, sort_order })) || [],
    gallery: initial?.gallery?.map(({ image_url, caption, sort_order }) => ({ image_url, caption, sort_order })) || [],
    steps: initial?.steps?.map(({ title, description, icon, sort_order }) => ({ title, description, icon, sort_order })) || [],
  });
  const [bulkFaq, setBulkFaq] = useState('');
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));
  const save = useMutation({
    mutationFn: () => initial ? solutionsApi.update(initial.id, form) : solutionsApi.create(form),
    onSuccess: () => { showToast('Đã lưu giải pháp'); router.push('/admin/solutions'); router.refresh(); },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(); };
  return <form className={styles.form} onSubmit={submit}>
    <header><h1>{initial ? 'Sửa giải pháp số' : 'Thêm giải pháp số'}</h1><button type="button" onClick={() => router.back()}>Quay lại</button></header>
    <section><h2>Thông tin chung</h2><div className={styles.grid}>
      <label>Tên giải pháp<input required value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
      <label>Slug<input required value={form.slug} onChange={(e) => set('slug', e.target.value)} /></label>
      <label>Nhóm khách hàng<select value={form.category} onChange={(e) => set('category', e.target.value as Form['category'])}><option value="sme">SME</option><option value="ubnd">UBND</option><option value="ho_kinh_doanh">Hộ kinh doanh</option><option value="cuc_nganh">Cục / Ngành</option><option value="chuyen_doi_so">Chuyển đổi số</option></select></label>
      <label>Trạng thái<select value={form.status} onChange={(e) => set('status', e.target.value as Form['status'])}><option value="active">Đăng</option><option value="inactive">Nháp</option></select></label>
      <label className={styles.wide}>Tóm tắt<textarea value={form.summary || ''} onChange={(e) => set('summary', e.target.value)} /></label>
      <label>Ảnh Hero<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => set('image', e.target.files?.[0])} /></label>
    </div></section>
    <section><h2>Hero & CTA</h2><div className={styles.grid}>
      <label>Nhãn<input value={form.hero_badge || ''} onChange={(e) => set('hero_badge', e.target.value)} /></label>
      <label>Tiêu đề<input value={form.hero_title || ''} onChange={(e) => set('hero_title', e.target.value)} /></label>
      <label className={styles.wide}>Phụ đề<textarea value={form.hero_subtitle || ''} onChange={(e) => set('hero_subtitle', e.target.value)} /></label>
      <label>Nhãn CTA<input value={form.cta_label || ''} onChange={(e) => set('cta_label', e.target.value)} /></label>
      <label>Đường dẫn CTA<input value={form.cta_url || ''} onChange={(e) => set('cta_url', e.target.value)} /></label>
    </div></section>
    <section><h2>Nội dung</h2><RichTextEditor value={form.content} onChange={(value) => set('content', value)} /></section>
    <section><h2>Hiển thị section</h2><div className={styles.grid}>{sections.map(([key, label]) => <div key={key}><label><input type="checkbox" checked={form.section_visibility?.[key] !== false} onChange={(e) => set('section_visibility', { ...form.section_visibility, [key]: e.target.checked })} />{label}</label><input aria-label={`Tiêu đề ${label}`} placeholder={label} value={form.section_titles?.[key] || ''} onChange={(e) => set('section_titles', { ...form.section_titles, [key]: e.target.value })} /></div>)}</div></section>
    <section><div className={styles.sectionHead}><h2>Tính năng</h2><button type="button" onClick={() => set('features', [...(form.features || []), { icon: '', title: '', description: '', sort_order: form.features?.length || 0 }])}>Thêm tính năng</button></div>{form.features?.map((feature, index) => <div className={styles.item} key={index}><IconPicker value={feature.icon || ''} onChange={(icon) => set('features', form.features?.map((x, i) => i === index ? { ...x, icon } : x))} /><input aria-label="Tiêu đề *" placeholder="Tiêu đề" value={feature.title} onChange={(e) => set('features', form.features?.map((x, i) => i === index ? { ...x, title: e.target.value } : x))} /><input placeholder="Mô tả" value={feature.description || ''} onChange={(e) => set('features', form.features?.map((x, i) => i === index ? { ...x, description: e.target.value } : x))} /><button type="button" onClick={() => set('features', form.features?.filter((_, i) => i !== index))}>Xóa</button></div>)}</section>
    <section><div className={styles.sectionHead}><h2>Đối tượng khách hàng</h2><button type="button" onClick={() => set('audience_cards', [...(form.audience_cards || []), { icon: '', title: '', description: '' }])}>Thêm</button></div>{form.audience_cards?.map((card, index) => <div className={styles.item} key={index}><input placeholder="Icon" value={card.icon} onChange={(e) => set('audience_cards', form.audience_cards?.map((x, i) => i === index ? { ...x, icon: e.target.value } : x))} /><input placeholder="Tiêu đề" value={card.title} onChange={(e) => set('audience_cards', form.audience_cards?.map((x, i) => i === index ? { ...x, title: e.target.value } : x))} /><input placeholder="Mô tả" value={card.description} onChange={(e) => set('audience_cards', form.audience_cards?.map((x, i) => i === index ? { ...x, description: e.target.value } : x))} /><button type="button" onClick={() => set('audience_cards', form.audience_cards?.filter((_, i) => i !== index))}>Xóa</button></div>)}</section>
    <section><div className={styles.sectionHead}><h2>Bảng giá</h2><button type="button" onClick={() => set('pricing', [...(form.pricing || []), { package_code: '', package_name: '', price: 0, cycle_months: 1, condition_note: '', status: 'active', sort_order: form.pricing?.length || 0 }])}>Thêm</button></div>{form.pricing?.map((plan, index) => <div className={styles.item} key={index}><input placeholder="Mã gói" value={plan.package_code} onChange={(e) => set('pricing', form.pricing?.map((x, i) => i === index ? { ...x, package_code: e.target.value } : x))} /><input placeholder="Tên gói" value={plan.package_name} onChange={(e) => set('pricing', form.pricing?.map((x, i) => i === index ? { ...x, package_name: e.target.value } : x))} /><input type="number" min="0" placeholder="Giá" value={plan.price} onChange={(e) => set('pricing', form.pricing?.map((x, i) => i === index ? { ...x, price: Number(e.target.value) } : x))} /><input type="number" min="1" placeholder="Chu kỳ tháng" value={plan.cycle_months || 1} onChange={(e) => set('pricing', form.pricing?.map((x, i) => i === index ? { ...x, cycle_months: Number(e.target.value) } : x))} /><input placeholder="Điều kiện" value={plan.condition_note || ''} onChange={(e) => set('pricing', form.pricing?.map((x, i) => i === index ? { ...x, condition_note: e.target.value } : x))} /><select aria-label={`Trạng thái gói ${index + 1}`} value={plan.status || 'active'} onChange={(e) => set('pricing', form.pricing?.map((x, i) => i === index ? { ...x, status: e.target.value as 'active' | 'inactive' } : x))}><option value="active">Đang bán</option><option value="inactive">Tạm ngừng</option></select><button type="button" onClick={() => set('pricing', form.pricing?.filter((_, i) => i !== index))}>Xóa</button></div>)}</section>
    <section><div className={styles.sectionHead}><h2>Thư viện ảnh</h2><button type="button" onClick={() => set('gallery', [...(form.gallery || []), { image_url: '', caption: '', sort_order: form.gallery?.length || 0 }])}>Thêm ảnh</button></div>{form.gallery?.map((photo, index) => <div className={styles.item} key={index}><input placeholder="Đường dẫn ảnh" value={photo.image_url} onChange={(e) => set('gallery', form.gallery?.map((x, i) => i === index ? { ...x, image_url: e.target.value } : x))} /><input placeholder="Mô tả ảnh" value={photo.caption || ''} onChange={(e) => set('gallery', form.gallery?.map((x, i) => i === index ? { ...x, caption: e.target.value } : x))} /><button type="button" onClick={() => set('gallery', form.gallery?.filter((_, i) => i !== index))}>Xóa</button></div>)}</section>
    <section><div className={styles.sectionHead}><h2>Các bước quy trình</h2><button type="button" onClick={() => set('steps', [...(form.steps || []), { title: '', description: '', icon: '', sort_order: form.steps?.length || 0 }])}>Thêm</button></div>{form.steps?.map((step, index) => <div className={styles.item} key={index}><input placeholder="Tiêu đề" value={step.title} onChange={(e) => set('steps', form.steps?.map((x, i) => i === index ? { ...x, title: e.target.value } : x))} /><input placeholder="Mô tả" value={step.description || ''} onChange={(e) => set('steps', form.steps?.map((x, i) => i === index ? { ...x, description: e.target.value } : x))} /><button type="button" onClick={() => set('steps', form.steps?.filter((_, i) => i !== index))}>Xóa</button></div>)}</section>
    <section><div className={styles.sectionHead}><h2>FAQ</h2><button type="button" onClick={() => set('faqs', [...(form.faqs || []), { question: '', answer: '', sort_order: form.faqs?.length || 0 }])}>Thêm</button></div>{form.faqs?.map((faq, index) => <div className={styles.item} key={index}><input placeholder="Câu hỏi" value={faq.question} onChange={(e) => set('faqs', form.faqs?.map((x, i) => i === index ? { ...x, question: e.target.value } : x))} /><textarea placeholder="Câu trả lời" value={faq.answer || ''} onChange={(e) => set('faqs', form.faqs?.map((x, i) => i === index ? { ...x, answer: e.target.value } : x))} /><button type="button" onClick={() => set('faqs', form.faqs?.filter((_, i) => i !== index))}>Xóa</button></div>)}</section>
    <section><h2>Nhập nhanh FAQ</h2><p>Mỗi cặp gồm câu hỏi ở dòng đầu, câu trả lời ở các dòng tiếp theo. Để dòng trống giữa các cặp.</p><textarea value={bulkFaq} onChange={(e) => setBulkFaq(e.target.value)} /><button type="button" onClick={() => { const parsed = bulkFaq.trim().split(/\n\s*\n/).map((block) => { const [question, ...answer] = block.trim().split('\n'); return { question: question.trim(), answer: answer.join('\n').trim(), sort_order: 0 }; }).filter((entry) => entry.question && entry.answer); set('faqs', [...(form.faqs || []), ...parsed]); setBulkFaq(''); }}>Thêm các FAQ</button></section>
    <section><h2>SEO</h2><div className={styles.grid}><label>Meta title (tối đa 60)<input maxLength={60} value={form.seo_title || ''} onChange={(e) => set('seo_title', e.target.value)} /></label><label>Meta description (tối đa 160)<textarea maxLength={160} value={form.seo_description || ''} onChange={(e) => set('seo_description', e.target.value)} /></label></div></section>
    <footer><button type="submit" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : initial ? 'Lưu giải pháp' : 'Tạo giải pháp'}</button>{initial && <a href={`/admin/solutions/${initial.id}/preview`} target="_blank" rel="noopener noreferrer">Xem trước</a>}</footer>
  </form>;
}
