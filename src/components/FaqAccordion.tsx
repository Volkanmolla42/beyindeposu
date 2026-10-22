import { ChevronRight } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items?: FaqItem[] | null;
  title?: string;
  subtitle?: string;
  id?: string;
  className?: string;
}

export function FaqAccordion({
  items,
  title = "Sıkça Sorulan Sorular",
  subtitle = "Merak Edilenler",
  id = "faq-section",
  className = "",
}: FaqAccordionProps) {
  if (!items || items.length === 0) return null;

  return (
    <section
      aria-labelledby={id}
      className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-10 space-y-6 ${className}`}
    >
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
          {subtitle}
        </span>
        <h2
          id={id}
          className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl mt-1"
        >
          {title}
        </h2>
      </div>

      <div className="space-y-3">
        {items.map((faq, index) => (
          <details
            key={index}
            className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-5 transition-colors open:border-amber-300 open:bg-amber-50/20"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm sm:text-base font-semibold text-slate-900 focus:outline-none">
              <span>{faq.question}</span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-2xs group-open:rotate-90 group-open:bg-amber-500 group-open:text-slate-950 transition-all">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </summary>
            <div className="pt-3 text-xs sm:text-sm leading-relaxed text-slate-600">
              {faq.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export default FaqAccordion;
