import { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ContactForm } from './_components/ContactForm';

export const metadata: Metadata = {
  title: 'Liên hệ',
  description: 'Liên hệ với MobiFone Chi nhánh Sơn La để được tư vấn và hỗ trợ.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Liên hệ' }]} />
      <h1 className="mb-6 mt-3 font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">Liên hệ với chúng tôi</h1>
      <div className="mx-auto max-w-xl rounded-lg border border-neutral-100 bg-white p-6 shadow-sm sm:p-8">
        <ContactForm />
      </div>
    </div>
  );
}
