/**
 * RichTextEditor — Tiptap-based WYSIWYG editor for slide text editing.
 * Supports Bold, Italic, Underline, color swatches, and plain text export.
 *
 * IMPORTANT: Incoming `value` may be either raw Markdown or HTML.
 * We convert Markdown → HTML before passing to Tiptap so that **bold**
 * becomes <strong>bold</strong> etc., preventing mixed-syntax output.
 */
import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading2, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

const COLORS = [
  { label: 'White',   value: '#ffffff' },
  { label: 'Light',   value: '#cbd5e1' },
  { label: 'Indigo',  value: '#818cf8' },
  { label: 'Emerald', value: '#34d399' },
  { label: 'Amber',   value: '#fbbf24' },
  { label: 'Rose',    value: '#fb7185' },
  { label: 'Dark',    value: '#1e293b' },
  { label: 'Black',   value: '#000000' },
];

/**
 * Converts a Markdown string to basic HTML understood by Tiptap.
 * If the value is already HTML (contains tags) it is returned as-is.
 */
function markdownToHtml(md: string): string {
  if (!md) return '';
  // If it's already HTML, don't double-convert
  if (/<[a-z][\s\S]*>/i.test(md.trim())) return md;

  let html = md
    // Headings (##, ###)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold + Italic (***text***)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold (**text**)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic (*text*)
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr />')
    // Unordered list items (- item or * item)
    .replace(/^[*-] (.+)$/gm, '<li>$1</li>')
    // Ordered list items (1. item)
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>[\s\S]+?<\/li>)(\n<li>[\s\S]+?<\/li>)*/g, (match) => `<ul>${match}</ul>`);

  // Wrap plain text lines in <p> (lines not already wrapped in a block tag)
  html = html
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (/^<(h[1-6]|ul|ol|li|hr|p|blockquote)/i.test(trimmed)) return trimmed;
      return `<p>${trimmed}</p>`;
    })
    .filter(Boolean)
    .join('\n');

  return html || `<p>${md}</p>`;
}

interface Props {
  value: string;          // Markdown or HTML string
  onChange: (html: string) => void;
  placeholder?: string;
  minRows?: number;
}

export function RichTextEditor({ value, onChange, placeholder = 'Edit slide content...', minRows = 8 }: Props) {
  const initialHtml = markdownToHtml(value);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
    ],
    content: initialHtml,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[12rem] text-sm leading-relaxed prose prose-invert max-w-none focus:outline-none',
        'data-placeholder': placeholder,
      },
    },
  });

  // Sync editor content when value prop changes externally (different slide opened)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = markdownToHtml(value);
    // Only update if genuinely different to avoid cursor jumping
    if (current !== incoming) {
      editor.commands.setContent(incoming, false);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null;

  const ToolBtn = ({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded-lg transition-colors text-sm font-bold',
        active
          ? 'bg-indigo-500/30 text-indigo-300'
          : 'text-slate-400 hover:bg-slate-700 hover:text-white'
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Formatting toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5">
        <ToolBtn title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="w-px h-5 bg-slate-600 mx-1" />
        <ToolBtn title="Heading" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Bullet List" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Numbered List" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Horizontal Rule" active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="w-px h-5 bg-slate-600 mx-1" />
        {/* Color swatches */}
        <span className="text-[10px] text-slate-500 font-bold mr-1">COLOR</span>
        {COLORS.map(c => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            onClick={() => editor.chain().focus().setColor(c.value).run()}
            className="w-5 h-5 rounded-full border-2 border-transparent hover:border-white transition-all shrink-0"
            style={{ backgroundColor: c.value, outline: editor.isActive('textStyle', { color: c.value }) ? '2px solid #6366f1' : 'none', outlineOffset: '2px' }}
          />
        ))}
        <button
          type="button"
          title="Remove color"
          onClick={() => editor.chain().focus().unsetColor().run()}
          className="text-[10px] text-slate-500 hover:text-slate-300 ml-1 font-bold"
        >
          ✕
        </button>
      </div>

      {/* Editor content area */}
      <div
        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus-within:border-indigo-500 transition-all overflow-y-auto"
        style={{ minHeight: `${minRows * 1.75}rem` }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
