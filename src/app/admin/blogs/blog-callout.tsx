"use client";

import {
  Node,
  mergeAttributes,
  type JSONContent,
  type MarkdownParseHelpers,
  type MarkdownRendererHelpers,
  type MarkdownToken,
  type MarkdownTokenizer,
} from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Lightbulb,
} from "lucide-react";

const CALLOUT_STYLES = {
  tip: {
    icon: Lightbulb,
    wrapper: "border-amber-300 bg-amber-50/90 text-amber-950",
    iconBox: "bg-amber-400 text-slate-950",
    label: "text-amber-800",
    title: "İpucu",
  },
  warning: {
    icon: AlertTriangle,
    wrapper: "border-rose-300 bg-rose-50 text-rose-950",
    iconBox: "bg-rose-500 text-white",
    label: "text-rose-800",
    title: "Uyarı",
  },
  note: {
    icon: Info,
    wrapper: "border-slate-300 bg-slate-50 text-slate-950",
    iconBox: "bg-slate-600 text-white",
    label: "text-slate-800",
    title: "Not",
  },
  important: {
    icon: AlertCircle,
    wrapper: "border-purple-300 bg-purple-50 text-purple-950",
    iconBox: "bg-purple-600 text-white",
    label: "text-purple-800",
    title: "Önemli",
  },
} as const;

type CalloutKind = keyof typeof CALLOUT_STYLES | "faq";

const CALLOUT_BLOCK_RE = /^:::(\w+)\n([\s\S]*?)\n?:::\n?/;

function CalloutView({ node }: NodeViewProps) {
  const kind = (node.attrs.kind as CalloutKind) || "tip";

  if (kind === "faq") {
    return (
      <NodeViewWrapper
        className="my-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
        data-callout="faq"
      >
        <div
          className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 p-4"
          contentEditable={false}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400 text-[11px] font-bold text-slate-950 shadow-xs">
            SSS
          </span>
          <span className="text-sm font-bold text-slate-900">
            Sıkça Sorulan Soru
          </span>
        </div>
        <NodeViewContent className="faq-content p-4 text-sm leading-relaxed text-slate-700" />
      </NodeViewWrapper>
    );
  }

  const style = CALLOUT_STYLES[kind] ?? CALLOUT_STYLES.tip;
  const Icon = style.icon;

  return (
    <NodeViewWrapper
      className={`my-6 flex items-start gap-3.5 rounded-2xl border-2 p-4 shadow-xs sm:p-5 ${style.wrapper}`}
      data-callout={kind}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.iconBox}`}
        contentEditable={false}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <span
          className={`block text-xs font-bold uppercase tracking-wider ${style.label}`}
          contentEditable={false}
        >
          {style.title}
        </span>
        <NodeViewContent className="callout-content mt-1 text-sm leading-relaxed text-slate-800 sm:text-base" />
      </div>
    </NodeViewWrapper>
  );
}

export const BlogCallout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: "tip",
        parseHTML: (element) => element.getAttribute("data-callout") || "tip",
        renderHTML: (attributes) => ({
          "data-callout": attributes.kind,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  markdownTokenizer: {
    name: "callout",
    level: "block",
    start: (src: string) => src.indexOf(":::"),
    tokenize: (src: string, _tokens: MarkdownToken[], lexer): MarkdownToken | undefined => {
      const match = CALLOUT_BLOCK_RE.exec(src);
      if (!match) return undefined;

      return {
        type: "callout",
        raw: match[0],
        calloutKind: match[1],
        text: match[2],
        tokens: lexer.blockTokens(match[2]),
      };
    },
  } satisfies MarkdownTokenizer,

  parseMarkdown: (
    token: MarkdownToken,
    helpers: MarkdownParseHelpers,
  ): JSONContent => {
    const content = helpers.parseChildren(token.tokens || []);

    return {
      type: "callout",
      attrs: { kind: token.calloutKind || "tip" },
      content: content.length > 0 ? content : [{ type: "paragraph" }],
    };
  },

  renderMarkdown: (
    node: JSONContent,
    helpers: MarkdownRendererHelpers,
  ): string => {
    const kind = (node.attrs?.kind as string) || "tip";
    const body = helpers
      .renderChildren(node.content || [], "\n\n")
      .trimEnd();

    return `:::${kind}\n${body}\n:::\n\n`;
  },
});
