'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading2,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  error?: string;
  label?: string;
}

function ToolbarButton({
  onClick,
  isActive,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  isActive?: boolean;
  icon: typeof Bold;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded transition-colors duration-150',
        isActive ? 'bg-primary text-white' : 'text-neutral-900 hover:bg-neutral-100',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** Component dung chung cho form tao/sua Tin tuc va Giai phap (muc 7 dau bai). */
export function RichTextEditor({ value, onChange, error, label }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      ImageExtension,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] px-3 py-2 focus:outline-none',
      },
    },
  });

  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-neutral-900">{label}</label>}
      <div className={cn('rounded-lg border', error ? 'border-danger' : 'border-neutral-100')}>
        {editor && (
          <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-100 p-1.5">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} label="Đậm" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} label="Nghiêng" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} icon={Heading2} label="Tiêu đề" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} label="Danh sách" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} label="Danh sách số" />
            <ToolbarButton
              onClick={() => {
                const url = window.prompt('Nhập URL liên kết:');
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }}
              isActive={editor.isActive('link')}
              icon={LinkIcon}
              label="Liên kết"
            />
            <ToolbarButton
              onClick={() => {
                const url = window.prompt('Nhập URL hình ảnh:');
                if (url) editor.chain().focus().setImage({ src: url }).run();
              }}
              icon={ImageIcon}
              label="Chèn ảnh"
            />
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} icon={Undo} label="Hoàn tác" />
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} icon={Redo} label="Làm lại" />
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
