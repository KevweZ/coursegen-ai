/**
 * RichTextEditor — Tiptap-based WYSIWYG editor for slide text editing.
 * Supports Bold, Italic, Underline, color swatches, and plain text export.
 */
import React from 'react';
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

interface Props {
  value: string;          // HTML string
  onChange: (html: string) => void;
  placeholder?: string;
  minRows?: number;
}

export function RichTextEditor({ value, onChange, placeholder = 'Edit slide content...', minRows = 8 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
    ],
    content: value || '',
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
