import React from "react";

interface FormattedSummaryProps {
  summaryText: string | null | undefined;
  className?: string;
}

// Helper to highlight **bold** terms or terms with prominent styling
function renderFormattedParagraph(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const clean = part.slice(2, -2);
      return (
        <strong
          key={index}
          className="font-bold text-indigo-950 dark:text-indigo-100 bg-amber-100/70 dark:bg-amber-950/60 px-1 py-0.5 rounded-sm border-b-2 border-amber-400 dark:border-amber-500"
        >
          {clean}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function renderHeaderLine(trimmed: string, idx: number) {
  const isShort = trimmed.includes("⚡") || trimmed.includes("SINTESI") || trimmed.includes("Breve");
  const isLong = trimmed.includes("QUADRO") || trimmed.includes("DETTAGLIATO") || trimmed.includes("Approfondito");
  const cleanTitle = trimmed.replace(/^#+\s*/, "");

  return (
    <div
      key={idx}
      className={`mt-4 mb-2 flex items-center gap-2 font-bold text-sm uppercase tracking-wider ${
        isShort
          ? "text-amber-700 dark:text-amber-300"
          : isLong
          ? "text-indigo-700 dark:text-indigo-300"
          : "text-slate-900 dark:text-slate-100"
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isShort
            ? "bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-950/50"
            : isLong
            ? "bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950/50"
            : "bg-slate-400"
        }`}
      />
      <span>{cleanTitle}</span>
    </div>
  );
}

function renderBulletLine(trimmed: string, idx: number) {
  const content = trimmed.replace(/^[•\-*]\s*/, "");
  return (
    <div key={idx} className="flex items-start gap-2.5 pl-1 leading-relaxed text-sm sm:text-base">
      <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0 mt-1 select-none text-sm">
        ✦
      </span>
      <div className="flex-1">{renderFormattedParagraph(content)}</div>
    </div>
  );
}

function renderParagraphLine(line: string, idx: number) {
  return (
    <p key={idx} className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-200">
      {renderFormattedParagraph(line)}
    </p>
  );
}

function isHeaderLine(trimmed: string): boolean {
  return (
    trimmed.startsWith("###") ||
    trimmed.startsWith("##") ||
    trimmed.startsWith("⚡") ||
    trimmed.includes("SINTESI RAPIDA") ||
    trimmed.includes("QUADRO DETTAGLIATO") ||
    trimmed.includes("CONCETTI CHIAVE") ||
    trimmed.includes("IMPLICAZIONI")
  );
}

function isBulletLine(trimmed: string): boolean {
  return trimmed.startsWith("•") || trimmed.startsWith("- ") || trimmed.startsWith("* ");
}

/**
 * Highlights keywords wrapped in **bold** or <mark>, renders short vs long breakdown,
 * bullet points, and key concepts cleanly.
 */
export default function FormattedSummary({ summaryText, className = "" }: FormattedSummaryProps) {
  if (!summaryText) {
    return <p className="text-slate-500 italic">Nessun riassunto disponibile.</p>;
  }

  const lines = summaryText.split("\n");

  return (
    <div className={`space-y-4 text-slate-800 dark:text-slate-200 ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (isHeaderLine(trimmed)) {
          return renderHeaderLine(trimmed, idx);
        }

        if (isBulletLine(trimmed)) {
          return renderBulletLine(trimmed, idx);
        }

        return renderParagraphLine(line, idx);
      })}
    </div>
  );
}
