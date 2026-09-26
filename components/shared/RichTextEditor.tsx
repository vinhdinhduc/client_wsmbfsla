'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useId, useRef } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
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
  Underline as UnderlineIcon,
  Strikethrough,
  Heading3,
  Heading4,
  Quote,
  Code,
  Table2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Eraser,
} from 'lucide-react';
import styles from './RichTextEditor.module.scss';
import { mediaApi } from '@/lib/api/media';
import { assetUrl } from '@/lib/assets';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  error?: string;
  label?: string;
  minHeight?: string;
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
      aria-pressed={isActive}
      title={label}
      className={`${styles.toolbarButton} ${isActive ? styles.toolbarActive : ''}`}
    >
      <Icon className={styles.icon} />
    </button>
  );
}

/** Component dung chung cho form tao/sua Tin tuc va Giai phap (muc 7 dau bai). */
export function RichTextEditor({ value, onChange, error, label, minHeight }: RichTextEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      ImageExtension,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class: styles.editorContent,
        id,
        role: 'textbox',
        'aria-label': label || 'Nội dung',
        'aria-multiline': 'true',
        ...(minHeight ? { style: `min-height: ${minHeight}` } : {}),
      },
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== value) editor.commands.setContent(value || '', false);
  }, [editor, value]);

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div className={`${styles.editor} ${error ? styles.editorError : ''}`}>
        {editor && (
          <div className={styles.toolbar}>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              icon={Bold}
              label="Đậm"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              icon={Italic}
              label="Nghiêng"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              icon={UnderlineIcon}
              label="Gạch chân"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              icon={Strikethrough}
              label="Gạch ngang"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              icon={Heading2}
              label="Tiêu đề"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              icon={Heading3}
              label="Tiêu đề H3"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
              isActive={editor.isActive('heading', { level: 4 })}
              icon={Heading4}
              label="Tiêu đề H4"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              icon={Quote}
              label="Trích dẫn"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              icon={Code}
              label="Khối mã"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              icon={List}
              label="Danh sách"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              icon={ListOrdered}
              label="Danh sách số"
            />
            <ToolbarButton
              onClick={() => {
                const url = window.prompt('Nhập URL liên kết:');
                if (url && /^(https?:\/\/|mailto:)/i.test(url))
                  editor
                    .chain()
                    .focus()
                    .setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' })
                    .run();
              }}
              isActive={editor.isActive('link')}
              icon={LinkIcon}
              label="Liên kết"
            />
            <ToolbarButton
              onClick={() => fileRef.current?.click()}
              icon={ImageIcon}
              label="Tải ảnh lên"
            />
            <ToolbarButton
              onClick={() => {
                const url = window.prompt('Nhập URL hình ảnh:');
                if (url && /^https?:\/\//i.test(url))
                  editor
                    .chain()
                    .focus()
                    .setImage({ src: url, alt: window.prompt('Mô tả ảnh (alt):') || '' })
                    .run();
              }}
              icon={ImageIcon}
              label="Chèn ảnh"
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
              icon={Table2}
              label="Chèn bảng"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              icon={AlignLeft}
              label="Căn trái"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              icon={AlignCenter}
              label="Căn giữa"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              icon={AlignRight}
              label="Căn phải"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              icon={Minus}
              label="Đường kẻ"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
              icon={Eraser}
              label="Xóa định dạng"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              icon={Undo}
              label="Hoàn tác"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              icon={Redo}
              label="Làm lại"
            />
          </div>
        )}
        <EditorContent editor={editor} />
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          aria-label="Chọn ảnh tải lên"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file || !editor) return;
            try {
              const result = await mediaApi.upload(file);
              editor
                .chain()
                .focus()
                .setImage({ src: assetUrl(result.url) || result.url, alt: file.name })
                .run();
            } catch (uploadError) {
              window.alert((uploadError as Error).message);
            }
            event.target.value = '';
          }}
        />
        <div className={styles.counter}>{editor?.getText().length ?? 0} ký tự</div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
