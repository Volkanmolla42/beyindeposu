import React from "react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Split content into blocks by double newlines
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let inTable = false;
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-3 space-y-1.5 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <div>{renderInline(item)}</div>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const [header, , ...body] = tableRows;
      elements.push(
        <div key={`table-${elements.length}`} className="my-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            {header && (
              <thead className="bg-slate-100/80 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  {header.map((col, cIdx) => (
                    <th key={cIdx} className="px-3.5 py-2.5 whitespace-nowrap">
                      {renderInline(col.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/60 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2.5 whitespace-nowrap">
                      {renderInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Table row detection
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList();
      inTable = true;
      const cells = trimmed
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      // Skip separator row like | --- | --- |
      if (cells.every((c) => /^[-:\s]+$/.test(c))) {
        tableRows.push(["---"]);
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // List item detection (- item or * item)
    if (/^[-*]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
      continue;
    } else {
      flushList();
    }

    if (!trimmed) {
      continue;
    }

    // H2 Heading
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-sm sm:text-base font-extrabold text-slate-900 mt-6 mb-2.5 pt-2 border-b border-slate-200 pb-1.5 flex items-center gap-2"
        >
          <span className="w-1.5 h-4 rounded-full bg-blue-600 shrink-0" />
          <span>{renderInline(trimmed.replace(/^##\s+/, ""))}</span>
        </h2>
      );
      continue;
    }

    // H3 Heading
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-xs sm:text-sm font-bold text-slate-800 mt-4 mb-2 flex items-center gap-1.5"
        >
          {renderInline(trimmed.replace(/^###\s+/, ""))}
        </h3>
      );
      continue;
    }

    // Regular Paragraph
    elements.push(
      <p key={`p-${i}`} className="my-2.5 text-xs text-slate-700 leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();
  flushTable();

  return <div className="space-y-1">{elements}</div>;
}

// Inline renderer for **bold**, `code`, etc.
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-blue-700 font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
