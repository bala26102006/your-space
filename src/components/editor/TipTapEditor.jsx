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
        <div className="flex items-center gap-1 pb-3 mb-2 border-b border-black/5 dark:border-white/10 flex-wrap text-text-muted">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 ${
              editor.isActive('bold') ? 'bg-black/10 dark:bg-white/20 text-text-primary' : ''
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 ${
              editor.isActive('italic') ? 'bg-black/10 dark:bg-white/20 text-text-primary' : ''
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 ${
              editor.isActive('heading', { level: 1 }) ? 'bg-black/10 dark:bg-white/20 text-text-primary' : ''
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 ${
              editor.isActive('heading', { level: 2 }) ? 'bg-black/10 dark:bg-white/20 text-text-primary' : ''
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 ${
              editor.isActive('bulletList') ? 'bg-black/10 dark:bg-white/20 text-text-primary' : ''
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 ${
              editor.isActive('orderedList') ? 'bg-black/10 dark:bg-white/20 text-text-primary' : ''
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 ${
              editor.isActive('blockquote') ? 'bg-black/10 dark:bg-white/20 text-text-primary' : ''
            }`}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 ${
              editor.isActive('codeBlock') ? 'bg-black/10 dark:bg-white/20 text-text-primary' : ''
            }`}
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>
          <button
            type="button"
            onClick={() => {
              const url = window.prompt('Enter image URL:');
              if (url) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            }}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
            title="Add Image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="prose dark:prose-invert max-w-none py-2" />
      </div>
    </div>
  );
}
