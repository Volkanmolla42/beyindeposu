"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import {
  editorMarkdownToMarkdown,
  markdownToEditorMarkdown,
} from "@/lib/blog-markdown";
import { BlogCallout } from "./blog-callout";
import { BlogBlockDelete } from "./blog-block-delete";
import BlogContentToolbar from "./BlogContentToolbar";

interface BlogRichTextEditorProps {
  initialContent: string;
  onChange: (markdown: string) => void;
}

export default function BlogRichTextEditor({
  initialContent,
  onChange,
}: BlogRichTextEditorProps) {
  const [initialMarkdown] = useState(() =>
    markdownToEditorMarkdown(initialContent),
  );
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const syncMarkdown = (current: Editor) => {
    onChangeRef.current(
      editorMarkdownToMarkdown(current.getMarkdown()),
    );
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      TableKit,
      Markdown.configure({
        markedOptions: { gfm: true },
      }),
      BlogCallout,
      BlogBlockDelete,
    ],
    content: initialMarkdown,
    contentType: "markdown",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "blog-editor-content",
        "aria-label": "Makale içeriği",
      },
    },
    onCreate: ({ editor: current }) => syncMarkdown(current),
    onUpdate: ({ editor: current }) => syncMarkdown(current),
  });

  const isEmpty =
    useEditorState({
      editor,
      selector: ({ editor: current }) => !current || current.isEmpty,
    }) ?? true;

  return (
    <div>
      <BlogContentToolbar editor={editor} />

      <div className="relative h-[520px] overflow-y-auto lg:h-[calc(100dvh-18rem)] lg:min-h-[560px] lg:max-h-[860px]">
        <div className="relative mx-auto flex min-h-full w-full max-w-5xl flex-col">
          {editor ? (
            <EditorContent
              editor={editor}
              className="flex flex-1 flex-col"
            />
          ) : (
            <div className="p-6 text-sm text-slate-400">
              Editör yükleniyor...
            </div>
          )}

          {editor && isEmpty && (
            <div className="pointer-events-none absolute left-4 top-4 text-sm text-slate-400 lg:left-6 lg:top-6">
              Yazmaya başlayın veya yukarıdaki blokları ekleyin...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
