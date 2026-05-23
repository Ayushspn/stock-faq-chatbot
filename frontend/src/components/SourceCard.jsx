import { FileText, TrendingUp } from "lucide-react";

export default function SourceCard({ source }) {
  const scorePercent = Math.round(source.score * 100);

  return (
    <div
      className="
        border border-terminal-border rounded bg-terminal-surface
        px-3 py-2.5 text-xs hover:border-terminal-amber/40
        hover:bg-terminal-amber-dim/10 transition-all duration-200
        animate-slide-up cursor-default group
      "
    >
      {/* ── Top row: filename + score ────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <FileText size={10} className="text-terminal-amber shrink-0" />
          <span className="text-terminal-amber font-mono truncate text-[11px] font-medium">
            {source.label}
          </span>
        </div>

        {/* Relevance score badge */}
        <div className="flex items-center gap-1 shrink-0">
          <TrendingUp size={9} className="text-terminal-text-dim" />
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              scorePercent >= 80
                ? "bg-terminal-green-dim text-terminal-green"
                : scorePercent >= 60
                ? "bg-yellow-900/30 text-yellow-400"
                : "bg-terminal-muted text-terminal-text-dim"
            }`}
          >
            {scorePercent}%
          </span>
        </div>
      </div>

      {/* ── Preview text ─────────────────────────────────────────────── */}
      <p className="text-terminal-text-dim leading-relaxed line-clamp-2 text-[10px]">
        {source.preview}
      </p>
    </div>
  );
}
