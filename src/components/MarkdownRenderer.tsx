import React from "react";
import { CheckCircle2, AlertTriangle, ArrowRightCircle, Info } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Split content into blocks by double newlines to handle paragraphs, headers, tables, etc.
  const blocks = content.split(/\n\n+/);

  const renderBlock = (block: string, index: number) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // 1. Detect Headers
    if (trimmed.startsWith("###")) {
      const text = trimmed.replace(/^###\s*/, "");
      return (
        <h3 key={index} className="text-lg font-semibold text-zinc-100 mt-4 mb-2 flex items-center gap-2">
          {text.includes("Low Stock") && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
          {text.includes("Business Summary") && <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />}
          {!text.includes("Low Stock") && !text.includes("Business Summary") && <ArrowRightCircle className="w-5 h-5 text-amber-500 shrink-0" />}
          {renderInline(text)}
        </h3>
      );
    }

    if (trimmed.startsWith("####")) {
      const text = trimmed.replace(/^####\s*/, "");
      return (
        <h4 key={index} className="text-base font-semibold text-zinc-100 mt-3 mb-1">
          {renderInline(text)}
        </h4>
      );
    }

    // 2. Detect Bullet Checklist / Warnings in lines
    if (trimmed.startsWith("✔") || trimmed.startsWith("- ✔")) {
      const lines = trimmed.split("\n");
      return (
        <div key={index} className="space-y-1.5 my-2">
          {lines.map((line, lIdx) => {
            const cleanLine = line.replace(/^(-\s*)?✔\s*/, "");
            return (
              <div key={lIdx} className="flex items-center gap-2 text-zinc-300 bg-transparent border border-amber-500/30/70 border border-amber-500/20 px-3 py-1.5 rounded-lg text-sm">
                <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{renderInline(cleanLine)}</span>
              </div>
            );
          })}
        </div>
      );
    }

    if (trimmed.startsWith("⚠") || trimmed.startsWith("- ⚠")) {
      const lines = trimmed.split("\n");
      return (
        <div key={index} className="space-y-1.5 my-2">
          {lines.map((line, lIdx) => {
            const cleanLine = line.replace(/^(-\s*)?⚠\s*/, "");
            return (
              <div key={lIdx} className="flex items-center gap-2 text-zinc-300 bg-amber-50/70 border border-emerald-500 px-3 py-1.5 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{renderInline(cleanLine)}</span>
              </div>
            );
          })}
        </div>
      );
    }

    // 3. Detect Table
    if (trimmed.includes("|") && trimmed.split("\n").length >= 2) {
      const lines = trimmed.split("\n");
      const headers = lines[0]
        .split("|")
        .map(cell => cell.trim())
        .filter(cell => cell !== "");
      
      // Check if second line is divider (e.g., :--- or ---)
      const isDivider = lines[1] && lines[1].includes("-") && lines[1].includes("|");
      const dataLines = isDivider ? lines.slice(2) : lines.slice(1);

      return (
        <div key={index} className="overflow-x-auto my-3 border border-zinc-800 rounded-xl shadow-xs">
          <table className="min-w-full divide-y divide-zinc-800 text-left font-sans text-xs">
            <thead className="bg-zinc-950/80">
              <tr>
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className="px-4 py-2.5 font-semibold text-zinc-300">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-900">
              {dataLines
                .map(dl => dl.split("|").map(cell => cell.trim()).filter(cell => cell !== ""))
                .filter(row => row.length > 0)
                .map((row, rIdx) => {
                  const isTotalRow = row.some(cell => cell.toLowerCase().includes("total") || cell.includes("₹"));
                  return (
                    <tr key={rIdx} className={`${isTotalRow ? "bg-zinc-950/60 font-semibold text-zinc-100" : "hover:bg-zinc-950/40 text-zinc-300"}`}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2 text-ellipsis">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      );
    }

    // 4. Detect Unordered List
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const lines = trimmed.split("\n");
      return (
        <ul key={index} className="list-none space-y-1 my-2 pl-1 font-sans text-sm text-zinc-300">
          {lines.map((line, lIdx) => {
            const cleanLine = line.replace(/^[-*]\s*/, "");
            return (
              <li key={lIdx} className="flex items-start gap-2">
                <span className="text-amber-500 mt-1 select-none shrink-0">•</span>
                <span>{renderInline(cleanLine)}</span>
              </li>
            );
          })}
        </ul>
      );
    }

    // 5. Default Paragraph
    return (
      <p key={index} className="text-sm text-zinc-300 leading-relaxed font-sans my-1.5">
        {renderInline(trimmed)}
      </p>
    );
  };

  // Process simple inline markdown formatting like bold (**text**) and highlight spans
  const renderInline = (text: string): React.ReactNode[] => {
    // Regular expression to match **bold**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const clean = part.slice(2, -2);
        return <strong key={pIdx} className="font-semibold text-zinc-100">{clean}</strong>;
      }

      // Check for custom color text wrappers or status spans
      if (part.includes("<span")) {
        // Simple HTML span parser for classNames in static markdown fallback
        const match = part.match(/class="([^"]+)">([^<]+)<\/span>/);
        if (match) {
          const [, className, content] = match;
          const cleanClass = className
            .replace("text-rose-500", "text-rose-500")
            .replace("text-amber-500", "text-amber-500");
          return <span key={pIdx} className={`${cleanClass} font-semibold`}>{content}</span>;
        }
      }

      return <React.Fragment key={pIdx}>{part}</React.Fragment>;
    });
  };

  return <div className="space-y-1.5">{blocks.map((block, idx) => renderBlock(block, idx))}</div>;
}
