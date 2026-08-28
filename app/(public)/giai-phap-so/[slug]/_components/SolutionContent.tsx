import { Solution } from '@/types/product';

export function SolutionContent({ solution }: { solution: Solution }) {
  return (
    <div
      className="prose prose-sm max-w-none text-neutral-900 sm:prose-base"
      dangerouslySetInnerHTML={{ __html: solution.content }}
    />
  );
}
