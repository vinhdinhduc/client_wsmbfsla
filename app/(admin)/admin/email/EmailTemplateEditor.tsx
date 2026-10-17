'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Extension, Mark, mergeAttributes } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  MousePointer2,
} from 'lucide-react';
import { EmailVariable } from '@/lib/email-template-catalog';
import {
  findUnsupportedEmailVariables,
  highlightEmailHtml,
  insertAtSelection,
} from '@/lib/email-template-preview';
import styles from './EmailTemplateEditor.module.scss';

const blocks = [
  {
    label: 'Tiêu đề',
    html: '<h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;color:#1f2937">Tiêu đề email</h1>',
  },
  {
    label: 'Đoạn văn',
    html: '<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#1f2937">Nội dung đoạn văn.</p>',
  },
  {
    label: 'Khối thông tin 2 cột',
    html: '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;border-left:4px solid #0065b3;background-color:#f5f8fc"><tbody><tr><td width="38%" style="padding:11px 14px;color:#64748b">Mã đăng ký</td><td style="padding:11px 14px;color:#1f2937;font-weight:bold">{{registration_code}}</td></tr><tr><td width="38%" style="padding:11px 14px;color:#64748b">Số điện thoại</td><td style="padding:11px 14px;color:#1f2937;font-weight:bold">{{phone}}</td></tr></tbody></table>',
  },
  {
    label: 'Nút CTA',
    html: '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0"><tbody><tr><td class="email-cta-cell" align="center" bgcolor="#0065b3" style="border-radius:8px;background-color:#0065b3"><a href="{{confirm_url}}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:bold">Xem chi tiết</a></td></tr></tbody></table>',
  },
  {
    label: 'Nút gọi hotline',
    html: '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0"><tbody><tr><td class="email-cta-cell" align="center" bgcolor="#0065b3" style="border-radius:8px;background-color:#0065b3"><a href="tel:{{hotline}}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:bold">Gọi hotline</a></td></tr></tbody></table>',
  },
  {
    label: 'Callout lưu ý',
    html: '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;background-color:#fff8e5"><tbody><tr><td style="padding:14px 16px;border-left:4px solid #f0b429;color:#59420b"><strong>Lưu ý:</strong> {{message}}</td></tr></tbody></table>',
  },
  {
    label: 'Mã đăng ký nổi bật',
    html: '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;background-color:#f5f8fc"><tbody><tr><td style="padding:14px 20px;border:1px solid #dbe3eb;border-radius:8px;color:#0065b3;font-size:20px;font-weight:bold">{{registration_code}}</td></tr></tbody></table>',
  },
  {
    label: 'Badge trạng thái',
    html: '<span class="registration-status-badge" style="display:inline-block;padding:5px 10px;border-radius:16px;background-color:#e0f2fe;color:#075985;font-weight:bold">{{status}}</span>',
  },
  {
    label: 'Đường kẻ',
    html: '<hr style="border:0;border-bottom:1px solid #dbe3eb;margin:24px 0">',
  },
  {
    label: 'Chữ ký',
    html: '<p style="margin:20px 0 0;line-height:1.65">Trân trọng,<br><strong>{{branch_name}}</strong><br>Hotline: {{hotline}}</p>',
  },
];
const voidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function createVariableExtension(supportedVariables: string[]) {
  const supported = new Set(supportedVariables);
  return Extension.create({
    name: 'unsupportedEmailVariable',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            decorations(state) {
              const decorations: Decoration[] = [];
              state.doc.descendants((node, position) => {
                if (!node.isText || !node.text) return;
                const expression = /{{\s*([a-z_]+)\s*}}/g;
                let match: RegExpExecArray | null;
                while ((match = expression.exec(node.text)) !== null) {
                  if (!supported.has(match[1])) {
                    decorations.push(
                      Decoration.inline(
                        position + match.index,
                        position + match.index + match[0].length,
                        {
                          class: styles.invalidVariable,
                        },
                      ),
                    );
                  }
                }
              });
              return DecorationSet.create(state.doc, decorations);
            },
          },
        }),
      ];
    },
  });
}

const emailAttributes = Extension.create({
  name: 'emailLayoutAttributes',
  addGlobalAttributes() {
    const names = [
      'style',
      'bgcolor',
      'width',
      'height',
      'align',
      'valign',
      'border',
      'cellpadding',
      'cellspacing',
      'role',
      'class',
    ];
    return [
      {
        types: [
          'table',
          'tableRow',
          'tableCell',
          'tableHeader',
          'paragraph',
          'heading',
          'blockquote',
          'horizontalRule',
          'link',
        ],
        attributes: Object.fromEntries(
          names.map((name) => [
            name,
            {
              default: null,
              parseHTML: (element: HTMLElement) => element.getAttribute(name),
              renderHTML: (attributes: Record<string, string | null>) =>
                attributes[name] ? { [name]: attributes[name] } : {},
            },
          ]),
        ),
      },
    ];
  },
});

const emailInlineStyle = Mark.create({
  name: 'emailInlineStyle',
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style'),
        renderHTML: (attributes: { style?: string | null }) =>
          attributes.style ? { style: attributes.style } : {},
      },
      class: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('class'),
        renderHTML: (attributes: { class?: string | null }) =>
          attributes.class ? { class: attributes.class } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[style]' }, { tag: 'span[class]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

export function EmailTemplateEditor({
  value,
  onChange,
  variables,
  supportedVariables,
}: {
  value: string;
  onChange: (value: string) => void;
  variables: EmailVariable[];
  supportedVariables: string[];
}) {
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const [sourceScrollTop, setSourceScrollTop] = useState(0);
  const variableExtension = useMemo(
    () => createVariableExtension(supportedVariables),
    [supportedVariables],
  );
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      emailInlineStyle,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      emailAttributes,
      variableExtension,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
    editorProps: {
      attributes: {
        class: styles.visualContent,
        role: 'textbox',
        'aria-label': 'Nội dung thư',
        'aria-multiline': 'true',
      },
    },
  });
  const unknownVariables = findUnsupportedEmailVariables(value, supportedVariables);

  useEffect(() => {
    if (editor && editor.getHTML() !== value) editor.commands.setContent(value || '', false);
  }, [editor, value]);

  function insertText(text: string) {
    if (mode === 'visual' && editor) {
      editor.chain().focus().insertContent(text).run();
      return;
    }
    const input = htmlRef.current;
    if (!input) {
      onChange(`${value}${text}`);
      return;
    }
    const inserted = insertAtSelection(value, input.selectionStart, input.selectionEnd, text);
    onChange(inserted.value);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(inserted.cursor, inserted.cursor);
    });
  }

  function addLink() {
    const href = window.prompt('Nhập đường dẫn liên kết:');
    if (!href || !/^(https?:\/\/|mailto:|tel:|\/)/i.test(href)) return;
    editor?.chain().focus().extendMarkRange('link').setLink({ href }).run();
  }

  function insertBlock(valueToInsert: string) {
    if (!valueToInsert) return;
    insertText(valueToInsert);
  }

  function autoCloseHtmlTag(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== '>') return;
    const input = event.currentTarget;
    const cursor = input.selectionStart;
    const openingTag = value.slice(0, cursor).match(/<([a-z][\w:-]*)\b[^<>]*$/i);
    if (
      !openingTag ||
      voidElements.has(openingTag[1].toLowerCase()) ||
      /\/\s*$/.test(openingTag[0])
    )
      return;
    event.preventDefault();
    const closingTag = `</${openingTag[1]}>`;
    const nextValue = `${value.slice(0, cursor)}>${closingTag}${value.slice(input.selectionEnd)}`;
    onChange(nextValue);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(cursor + 1, cursor + 1);
    });
  }

  return (
    <div className={styles.editor}>
      <div className={styles.editorTop}>
        <div className={styles.modeTabs} role="tablist" aria-label="Chế độ soạn nội dung">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'visual'}
            onClick={() => setMode('visual')}
          >
            Trực quan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'html'}
            onClick={() => setMode('html')}
          >
            Mã HTML
          </button>
        </div>
        <label className={styles.insertBlock}>
          <span>Chèn bố cục</span>
          <select
            value=""
            onChange={(event) => insertBlock(event.target.value)}
            aria-label="Chèn bố cục"
          >
            <option value="">Chọn bố cục</option>
            {blocks.map((block) => (
              <option key={block.label} value={block.html}>
                {block.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.toolbar} aria-label="Định dạng nội dung">
        <button
          type="button"
          title="Đậm"
          aria-label="Đậm"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold />
        </button>
        <button
          type="button"
          title="Nghiêng"
          aria-label="Nghiêng"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </button>
        <button type="button" title="Liên kết" aria-label="Liên kết" onClick={addLink}>
          <LinkIcon />
        </button>
        <button
          type="button"
          title="Danh sách"
          aria-label="Danh sách"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List />
        </button>
        <button
          type="button"
          title="Danh sách số"
          aria-label="Danh sách số"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </button>
        <button
          type="button"
          title="Căn trái"
          aria-label="Căn trái"
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft />
        </button>
        <button
          type="button"
          title="Căn giữa"
          aria-label="Căn giữa"
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter />
        </button>
        <button
          type="button"
          title="Căn phải"
          aria-label="Căn phải"
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight />
        </button>
        <button
          type="button"
          title="Nút CTA"
          aria-label="Chèn nút CTA"
          onClick={() => insertBlock(blocks[3].html)}
        >
          <MousePointer2 />
        </button>
        <button
          type="button"
          title="Đường kẻ"
          aria-label="Đường kẻ"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          <Minus />
        </button>
        <span className={styles.toolbarHint}>
          <Code2 /> HTML email
        </span>
      </div>
      <div className={mode === 'visual' ? styles.visualMode : styles.hiddenMode}>
        <EditorContent editor={editor} />
      </div>
      {mode === 'html' && (
        <div className={styles.sourceEditor}>
          <pre
            aria-hidden="true"
            className={styles.sourceHighlight}
            style={{ transform: `translateY(-${sourceScrollTop}px)` }}
            dangerouslySetInnerHTML={{ __html: highlightEmailHtml(value) }}
          />
          <textarea
            ref={htmlRef}
            className={styles.htmlSource}
            value={value}
            aria-label="Mã HTML nội dung thư"
            spellCheck={false}
            onScroll={(event) => setSourceScrollTop(event.currentTarget.scrollTop)}
            onKeyDown={autoCloseHtmlTag}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      )}
      <div className={styles.variables}>
        <strong>Biến hỗ trợ</strong>
        <div>
          {variables.map((variable) => {
            const supported = supportedVariables.includes(variable.key);
            return (
              <button
                key={variable.key}
                type="button"
                className={supported ? '' : styles.mutedVariable}
                title={`${variable.description} · Ví dụ: ${variable.example}${supported ? '' : ' · Không dùng trong mẫu này'}`}
                onClick={() => insertText(`{{${variable.key}}}`)}
              >
                {`{{${variable.key}}}`}
              </button>
            );
          })}
        </div>
      </div>
      {unknownVariables.length > 0 && (
        <p className={styles.variableWarning} role="alert">
          Biến chưa được hỗ trợ cho mẫu này:{' '}
          {unknownVariables.map((variable) => `{{${variable}}}`).join(', ')}
        </p>
      )}
    </div>
  );
}
