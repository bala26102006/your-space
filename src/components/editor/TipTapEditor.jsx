import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote, Code, Image as ImageIcon } from 'lucide-react';

export default function TipTapEditor({
  content,
  onChange,
  placeholder = 'Write something calm...',
  readOnly = false,
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Image,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const html = editor.getHTML();
      const text = editor.getText();
      onChange({ json, html, text });
    },
  });

  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content || '', false);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col">
      {!readOnly && (
        <div className="flex items-center gap-1 pb-3 mb-2 border-b border-black/5 dark:border-white/10 flex-wrap text-text-secondary dark:text-[#A7ADBA]">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-primary dark:hover:text-[#ECEEF2] transition-colors ${
              editor.isActive('bold') ? 'bg-black/10 dark:bg-white/20 text-text-primary dark:text-white font-bold' : ''
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-primary dark:hover:text-[#ECEEF2] transition-colors ${
              editor.isActive('italic') ? 'bg-black/10 dark:bg-white/20 text-text-primary dark:text-white' : ''
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-primary dark:hover:text-[#ECEEF2] transition-colors ${
              editor.isActive('heading', { level: 1 }) ? 'bg-black/10 dark:bg-white/20 text-text-primary dark:text-white font-bold' : ''
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-primary dark:hover:text-[#ECEEF2] transition-colors ${
              editor.isActive('heading', { level: 2 }) ? 'bg-black/10 dark:bg-white/20 text-text-primary dark:text-white font-bold' : ''
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-primary dark:hover:text-[#ECEEF2] transition-colors ${
              editor.isActive('bulletList') ? 'bg-black/10 dark:bg-white/20 text-text-primary dark:text-white' : ''
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-primary dark:hover:text-[#ECEEF2] transition-colors ${
              editor.isActive('orderedList') ? 'bg-black/10 dark:bg-white/20 text-text-primary dark:text-white' : ''
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-primary dark:hover:text-[#ECEEF2] transition-colors ${
              editor.isActive('blockquote') ? 'bg-black/10 dark:bg-white/20 text-text-primary dark:text-white' : ''
            }`}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-primary dark:hover:text-[#ECEEF2] transition-colors ${
              editor.isActive('codeBlock') ? 'bg-black/10 dark:bg-white/20 text-text-primary dark:text-white' : ''
            }`}
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-black/10 dark:border-white/10 mx-1"></div>
          <button
            type="button"
            onClick={() => {
              const url = window.prompt('Enter image URL:');
              if (url) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            }}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-text-secondary hover:text-text-primary dark:hover:text-[#ECEEF2] transition-colors"
            title="Add Image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="pane-scroller flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] [overscroll-behavior:contain]">
        <EditorContent editor={editor} className="max-w-none py-2 text-text-primary" />
      </div>
    </div>
  );
}
