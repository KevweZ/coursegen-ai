/**
 * RichTextEditor — Tiptap-based WYSIWYG editor for slide text editing.
 *
 * Architecture note:
 * The parent passes `key={editingSlide.id}` so React remounts this component
 * whenever a different slide is opened. This means `content` is only ever
 * set ONCE (on mount via `initialHtml`), and Tiptap owns all subsequent state.
 * This avoids any external-sync useEffect that would fight the editor's own
 * state machine and silently undo formatting commands.
 */
import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import {
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Minus, ChevronDown,
} from 'lucide-react';
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

const HEADING_OPTIONS = [
  { label: 'Normal',    value: 0 },
  { label: 'Heading 1', value: 1 },
  { label: 'Heading 2', value: 2 },
  { label: 'Heading 3', value: 3 },
] as const;

/**
 * Converts a Markdown string to basic HTML understood by Tiptap.
 * If the value is already HTML (contains tags) it is returned as-is.
 */
function markdownToHtml(md: string): string {
  if (!md) return '';
  if (/<[a-z][\s\S]*>/i.test(md.trim())) return md;

  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^[*-] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  html = html.replace(/(<li>[\s\S]+?<\/li>)(\n<li>[\s\S]+?<\/li>)*/g,
    (match) => `<ul>${match}</ul>`);

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
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minRows?: number;
}

export function RichTextEditor({ value, onChange, placeholder = 'Edit slide content...', minRows = 8 }: Props) {
  const [headingOpen, setHeadingOpen] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyle, Color],
    // Content is set ONCE on mount. Parent must use key={slideId} to remount
    // when switching slides — this is the correct Tiptap pattern.
    content: markdownToHtml(value),
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

  const activeHeading =
    HEADING_OPTIONS.find(h => h.value !== 0 && editor.isActive('heading', { level: h.value }))
    ?? HEADING_OPTIONS[0];

  /**
   * All toolbar interactions use onMouseDown + e.preventDefault().
   * This keeps focus inside the editor so block-level commands (heading, list)
   * have a valid selection to operate on.
   */
  const ToolBtn = ({
    onPress, active, title, children,
  }: { onPress: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onPress(); }}
      className={cn(
        'p-1.5 rounded-lg transition-colors text-sm font-bold',
        active
          ? 'bg-indigo-500/30 text-indigo-300'
          : 'text-slate-400 hover:bg-slate-700 hover:text-white',
      )}
    >
      {children}
    </button>
  );

  const applyHeading = (level: number) => {
    setHeadingOpen(false);
    if (level === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().setHeading({ level: level as 1 | 2 | 3 }).run();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-0.5 flex-wrap bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5">

        {/* Heading dropdown */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setHeadingOpen(v => !v); }}
            title="Heading level"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <span className="min-w-[46px] text-left">{activeHeading.label}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          {headingOpen && (
            <>
              <div className="fixed inset-0 z-[499]" onMouseDown={e => { e.preventDefault(); setHeadingOpen(false); }} />
              <div className="absolute top-full left-0 mt-1 w-32 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[500] overflow-hidden">
                {HEADING_OPTIONS.map(h => (
                  <button
                    key={h.value}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); applyHeading(h.value); }}
                    className={cn(
                      'w-full text-left px-3 py-2 font-bold transition-colors',
                      activeHeading.value === h.value
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'text-slate-300 hover:bg-slate-800',
                      h.value === 1 && 'text-base',
                      h.value === 2 && 'text-sm',
                      h.value === 3 && 'text-xs',
                    )}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <ToolBtn title="Bold (Ctrl+B)" active={editor.isActive('bold')} onPress={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Italic (Ctrl+I)" active={editor.isActive('italic')} onPress={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Underline (Ctrl+U)" active={editor.isActive('underline')} onPress={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolBtn>

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <ToolBtn title="Bullet List" active={editor.isActive('bulletList')} onPress={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Numbered List" active={editor.isActive('orderedList')} onPress={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Horizontal Rule" active={false} onPress={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-3.5 h-3.5" />
        </ToolBtn>

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <span className="text-[10px] text-slate-500 font-bold mr-1">COLOR</span>
        {COLORS.map(c => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c.value).run(); }}
            className="w-5 h-5 rounded-full border-2 border-transparent hover:border-white transition-all shrink-0"
            style={{
              backgroundColor: c.value,
              outline: editor.isActive('textStyle', { color: c.value }) ? '2px solid #6366f1' : 'none',
              outlineOffset: '2px',
            }}
          />
        ))}
        <button
          type="button"
          title="Remove color"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetColor().run(); }}
          className="text-[10px] text-slate-500 hover:text-slate-300 ml-1 font-bold"
        >
          ✕
        </button>
      </div>

      <div
        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus-within:border-indigo-500 transition-all overflow-y-auto"
        style={{ minHeight: `${minRows * 1.75}rem` }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
