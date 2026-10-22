import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  return (
    <div className={`leading-relaxed text-slate-800 text-sm sm:text-base space-y-4 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        disallowedElements={["img"]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-bold tracking-tight text-slate-950 leading-tight text-2xl sm:text-3xl mt-8 mb-4">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-bold tracking-tight text-slate-900 border-b border-slate-200 pb-2 text-xl sm:text-2xl mt-10 mb-4 flex items-center gap-2.5">
              <span className="w-1.5 h-5 bg-amber-400 rounded-full inline-block shrink-0" />
              <span>{children}</span>
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-bold text-slate-900 text-lg sm:text-xl mt-6 mb-2">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="font-bold text-slate-900 text-base sm:text-lg mt-5 mb-2">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-slate-700 leading-relaxed my-3">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="space-y-1.5 list-disc list-outside pl-5 text-slate-700 marker:text-amber-500 my-4">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1.5 list-decimal list-outside pl-5 text-slate-700 marker:font-bold marker:text-amber-600 my-4">
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
          blockquote: ({ children }) => (
            <blockquote className="my-4 pl-4 border-l-4 border-amber-400 bg-amber-50/40 py-2 pr-4 rounded-r-xl italic text-slate-800">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-5 overflow-hidden rounded-2xl border border-slate-200 shadow-2xs bg-white">
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
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-amber-50/40 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-slate-700 leading-relaxed align-top">
              {children}
            </td>
          ),
          hr: () => <hr className="my-6 border-t border-slate-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
