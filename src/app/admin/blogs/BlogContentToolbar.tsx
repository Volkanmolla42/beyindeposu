"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  Redo2,
  Table,
  Undo2,
} from "lucide-react";

interface BlogContentToolbarProps {
  editor: Editor | null;
}

const blockButtonClass =
  "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-2xs transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 disabled:cursor-not-allowed disabled:opacity-50";

const historyButtonClass =
  "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

function formatButtonClass(active: boolean) {
  return `inline-flex h-7 min-w-7 items-center justify-center rounded-lg border px-2 text-[11px] font-bold shadow-2xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    active
      ? "border-amber-300 bg-amber-100 text-amber-950"
      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
  }`;
}

function selectInsertedText(editor: Editor, text: string, from: number) {
  let range: { from: number; to: number } | null = null;

  editor.state.doc.nodesBetween(
    from,
    editor.state.doc.content.size,
    (node, pos) => {
      if (range) return false;
      if (!node.isText || !node.text) return true;

      const index = node.text.indexOf(text);
      if (index === -1) return true;

      range = { from: pos + index, to: pos + index + text.length };
      return false;
    },
  );

  if (range) editor.commands.setTextSelection(range);
}

function insertCallout(editor: Editor, kind: "tip" | "warning") {
  const placeholder =
    kind === "tip"
      ? "İpucu metnini buraya yazın."
      : "Uyarı metnini buraya yazın.";
  const from = editor.state.selection.from;

  editor
    .chain()
    .focus()
    .insertContent({
      type: "callout",
      attrs: { kind },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: placeholder }],
        },
      ],
    })
    .run();

  selectInsertedText(editor, placeholder, from);
}

function insertFaq(editor: Editor) {
  const question = "Sıkça sorulan soru?";
  const answer = "Cevabı buraya yazın.";
  const from = editor.state.selection.from;

  editor
    .chain()
    .focus()
    .insertContent({
      type: "callout",
      attrs: { kind: "faq" },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: question }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: answer }],
        },
      ],
    })
    .run();

  selectInsertedText(editor, question, from);
}

export default function BlogContentToolbar({
  editor,
}: BlogContentToolbarProps) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            h2: current.isActive("heading", { level: 2 }),
            h3: current.isActive("heading", { level: 3 }),
            list: current.isActive("bulletList"),
            callout: current.isActive("callout"),
            canUndo: current.can().undo(),
            canRedo: current.can().redo(),
          }
        : null,
  });

  const disabled = !editor;
  const blockDisabled = disabled || (active?.callout ?? false);

  return (
    <div className="border-b border-slate-200 bg-slate-50 py-2">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-1.5 px-4 lg:px-6">
        <button
          type="button"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={disabled || !(active?.canUndo ?? false)}
          title="Geri al (Ctrl+Z)"
          aria-label="Geri al (Ctrl+Z)"
          className={historyButtonClass}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={disabled || !(active?.canRedo ?? false)}
          title="Yinele (Ctrl+Y)"
          aria-label="Yinele (Ctrl+Y)"
          className={historyButtonClass}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />

        <button
          type="button"
          onClick={() => editor && insertFaq(editor)}
          disabled={blockDisabled}
          title="SSS bloğu ekle"
          className={blockButtonClass}
        >
          <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
          SSS
        </button>
        <button
          type="button"
          onClick={() => editor && insertCallout(editor, "tip")}
          disabled={blockDisabled}
          title="İpucu bloğu ekle"
          className={blockButtonClass}
        >
          <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
          İpucu
        </button>
        <button
          type="button"
          onClick={() => editor && insertCallout(editor, "warning")}
          disabled={blockDisabled}
          title="Uyarı bloğu ekle"
          className={blockButtonClass}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          Uyarı
        </button>
        <button
          type="button"
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
              .run()
          }
          disabled={disabled}
          title="Tablo ekle"
          className={blockButtonClass}
        >
          <Table className="h-3.5 w-3.5 text-amber-600" />
          Tablo
        </button>

        <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />

        <button
          type="button"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          disabled={disabled}
          aria-pressed={active?.h2 ?? false}
          title="Büyük başlık (H2)"
          className={formatButtonClass(active?.h2 ?? false)}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
          disabled={disabled}
          aria-pressed={active?.h3 ?? false}
          title="Alt başlık (H3)"
          className={formatButtonClass(active?.h3 ?? false)}
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={disabled}
          aria-pressed={active?.bold ?? false}
          title="Kalın"
          className={formatButtonClass(active?.bold ?? false)}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={disabled}
          aria-pressed={active?.italic ?? false}
          title="İtalik"
          className={`${formatButtonClass(active?.italic ?? false)} italic`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          aria-pressed={active?.list ?? false}
          title="Madde işaretli liste"
          className={formatButtonClass(active?.list ?? false)}
        >
          Liste
        </button>
      </div>
    </div>
  );
}
