import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Lightbulb,
  AlertTriangle,
  Info,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

interface Props {
  content: string;
}

function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (React.isValidElement(node) && (node.props as { children?: React.ReactNode })?.children) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

function removeAlertTag(node: React.ReactNode): React.ReactNode {
  if (typeof node === "string") {
    return node.replace(/^\s*\[!(TIP|WARNING|CAUTION|NOTE|INFO|IMPORTANT|FAQ|SSS)\]\s*/i, "").trim();
  }
  if (Array.isArray(node)) {
    let tagStripped = false;
    return node.map((item, idx) => {
      if (!tagStripped && typeof item === "string" && /\[!(TIP|WARNING|CAUTION|NOTE|INFO|IMPORTANT|FAQ|SSS)\]/i.test(item)) {
        tagStripped = true;
        return item.replace(/^\s*\[!(TIP|WARNING|CAUTION|NOTE|INFO|IMPORTANT|FAQ|SSS)\]\s*/i, "").trim();
      }
      if (!tagStripped && React.isValidElement(item)) {
        const itemProps = item.props as { children?: React.ReactNode };
        if (itemProps?.children) {
          tagStripped = true;
          return React.cloneElement(item, {
            key: item.key || idx,
            children: removeAlertTag(itemProps.children),
          } as React.Attributes);
        }
      }
      return item;
    });
  }
  if (React.isValidElement(node)) {
    const nodeProps = node.props as { children?: React.ReactNode };
    if (nodeProps?.children) {
      return React.cloneElement(node, {
        children: removeAlertTag(nodeProps.children),
      } as React.Attributes);
    }
  }
  return node;
}

function parseFaq(children: React.ReactNode): { question: string; answer: React.ReactNode } {
  if (Array.isArray(children)) {
    const validElements = children.filter(
      (child) =>
        child !== null &&
        child !== undefined &&
        !(typeof child === "string" && child.trim() === ""),
    );
    if (validElements.length > 1) {
      const firstChild = validElements[0];
      const rawQuestion = extractText(firstChild)
        .replace(/^\s*\[!(FAQ|SSS)\]\s*/i, "")
        .replace(/^Soru:\s*/i, "")
        .trim();

      const restAnswers = validElements.slice(1);
      return {
        question: rawQuestion || "Sıkça Sorulan Soru",
        answer: restAnswers,
      };
    }
  }

  const fullText = extractText(children)
    .replace(/^\s*\[!(FAQ|SSS)\]\s*/i, "")
    .trim();

  const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return {
      question: lines[0].replace(/^Soru:\s*/i, "").trim(),
      answer: lines.slice(1).join("\n\n").replace(/^Cevap:\s*/i, "").trim(),
    };
  }

  const qMarkIndex = fullText.indexOf("?");
  if (qMarkIndex !== -1 && qMarkIndex < fullText.length - 1) {
    return {
      question: fullText.slice(0, qMarkIndex + 1).replace(/^Soru:\s*/i, "").trim(),
      answer: fullText.slice(qMarkIndex + 1).replace(/^Cevap:\s*/i, "").trim(),
    };
  }

  return {
    question: fullText || "Sıkça Sorulan Soru",
    answer: removeAlertTag(children),
  };
}

function renderFaqCard(children: React.ReactNode) {
  const { question, answer } = parseFaq(children);

  return (
    <details
      className="group my-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition-all hover:border-amber-400 not-prose"
      open
    >
      <summary className="flex items-center justify-between gap-3 p-4 sm:p-5 cursor-pointer list-none select-none bg-slate-50/70 hover:bg-slate-100/70 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-bold text-3xs sm:text-xs shadow-xs">
            SSS
          </span>
          <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
            {question}
          </h4>
        </div>
        <ChevronDown className="w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="p-4 sm:p-5 pt-3.5 sm:pt-4 border-t border-slate-100 text-slate-700 text-sm sm:text-base leading-relaxed bg-white">
        {answer}
      </div>
    </details>
  );
}

function renderCalloutCard(type: "tip" | "warning" | "note" | "important", children: React.ReactNode) {
  const clean = removeAlertTag(children);

  if (type === "tip") {
    return (
      <div className="my-6 p-4 sm:p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-amber-950 shadow-xs flex items-start gap-3.5 not-prose">
        <div className="p-2 rounded-xl bg-amber-400 text-slate-950 shrink-0 mt-0.5">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-sm sm:text-base leading-relaxed font-medium">
          <span className="block text-xs font-bold uppercase tracking-wider text-amber-800">
            İpucu
          </span>
          <div className="text-slate-800">{clean}</div>
        </div>
      </div>
    );
  }

  if (type === "warning") {
    return (
      <div className="my-6 p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 shadow-xs flex items-start gap-3.5 not-prose">
        <div className="p-2 rounded-xl bg-rose-500 text-white shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-sm sm:text-base leading-relaxed font-medium">
          <span className="block text-xs font-bold uppercase tracking-wider text-rose-800">
            Uyarı
          </span>
          <div className="text-slate-800">{clean}</div>
        </div>
      </div>
    );
  }

  if (type === "important") {
    return (
      <div className="my-6 p-4 sm:p-5 rounded-2xl bg-purple-50 border-2 border-purple-300 text-purple-950 shadow-xs flex items-start gap-3.5 not-prose">
        <div className="p-2 rounded-xl bg-purple-600 text-white shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-sm sm:text-base leading-relaxed font-medium">
          <span className="block text-xs font-bold uppercase tracking-wider text-purple-800">
            Önemli
          </span>
          <div className="text-slate-800">{clean}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-6 p-4 sm:p-5 rounded-2xl bg-slate-50 border-2 border-slate-300 text-slate-950 shadow-xs flex items-start gap-3.5 not-prose">
      <div className="p-2 rounded-xl bg-slate-600 text-white shrink-0 mt-0.5">
        <Info className="w-5 h-5" />
      </div>
      <div className="space-y-1 text-sm sm:text-base leading-relaxed font-medium">
        <span className="block text-xs font-bold uppercase tracking-wider text-slate-800">
          Not
        </span>
        <div className="text-slate-800">{clean}</div>
      </div>
    </div>
  );
}

export default function ArticleRenderer({ content }: Props) {
  return (
    <div className="article-renderer leading-relaxed text-slate-800 text-base sm:text-lg space-y-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        disallowedElements={["img"]}
        components={{
          h1: ({ children }) => (
            <h1
              className="font-bold tracking-tight text-slate-950 leading-tight text-3xl sm:text-4xl mt-10 mb-5"
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className="font-bold tracking-tight text-slate-900 border-b border-slate-200/90 flex items-center gap-2.5 pb-2.5 text-2xl sm:text-3xl mt-12 mb-4"
            >
              <span className="w-1.5 h-6 bg-amber-400 rounded-full inline-block shrink-0" />
              <span>{children}</span>
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className="font-bold text-slate-900 text-xl sm:text-2xl mt-8 mb-3"
            >
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4
              className="font-bold text-slate-900 text-lg sm:text-xl mt-6 mb-2"
            >
              {children}
            </h4>
          ),
          p: ({ children }) => {
            const raw = extractText(children).trim();
            if (raw.startsWith("[!FAQ]") || raw.startsWith("[!SSS]")) {
              return renderFaqCard(children);
            }
            if (raw.startsWith("[!TIP]")) {
              return renderCalloutCard("tip", children);
            }
            if (raw.startsWith("[!WARNING]") || raw.startsWith("[!CAUTION]")) {
              return renderCalloutCard("warning", children);
            }
            if (raw.startsWith("[!NOTE]") || raw.startsWith("[!INFO]")) {
              return renderCalloutCard("note", children);
            }
            if (raw.startsWith("[!IMPORTANT]")) {
              return renderCalloutCard("important", children);
            }

            return (
              <p className="text-slate-700 leading-relaxed my-4 text-base sm:text-lg">
                {children}
              </p>
            );
          },
          ul: ({ children }) => (
            <ul
              className="space-y-2 list-disc list-outside pl-6 text-slate-700 marker:text-amber-500 my-5 text-base sm:text-lg"
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              className="space-y-2.5 list-decimal list-outside pl-6 text-slate-700 marker:font-bold marker:text-amber-600 my-5 text-base sm:text-lg"
            >
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1 leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-slate-950">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-800">{children}</em>
          ),
          code: ({ children }) => (
            <code className="font-mono text-xs font-bold bg-slate-900 text-amber-400 px-2 py-0.5 rounded-md border border-slate-800 inline-block">
              {children}
            </code>
          ),
          blockquote: ({ children }) => {
            const raw = extractText(children).trim();
            if (raw.includes("[!FAQ]") || raw.includes("[!SSS]")) {
              return renderFaqCard(children);
            }
            if (raw.includes("[!TIP]")) {
              return renderCalloutCard("tip", children);
            }
            if (raw.includes("[!WARNING]") || raw.includes("[!CAUTION]")) {
              return renderCalloutCard("warning", children);
            }
            if (raw.includes("[!NOTE]") || raw.includes("[!INFO]")) {
              return renderCalloutCard("note", children);
            }
            if (raw.includes("[!IMPORTANT]")) {
              return renderCalloutCard("important", children);
            }

            return (
              <blockquote className="my-5 pl-4 border-l-4 border-amber-400 bg-amber-50/40 py-2.5 pr-4 rounded-r-xl italic text-slate-800">
                {children}
              </blockquote>
            );
          },
          table: ({ children }) => (
            <div className="my-6 overflow-hidden rounded-2xl border border-slate-200 shadow-xs bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  {children}
                </table>
              </div>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-900 font-bold text-xs uppercase tracking-wider">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-amber-50/50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-slate-700 leading-relaxed align-top">
              {children}
            </td>
          ),
          hr: () => <hr className="my-8 border-t border-slate-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
