import { User, Bot, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import SourceCard from "./SourceCard";

export default function MessageBubble({ message }) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? "flex-row-reverse" : "flex-row"}`}>

      {/* ── Avatar ───────────────────────────────────────────────────── */}
      <div
        className={`
          shrink-0 w-7 h-7 rounded flex items-center justify-center mt-0.5
          ${isUser
            ? "bg-terminal-muted text-terminal-text-dim"
            : "bg-terminal-green-dim text-terminal-green animate-pulse-green"
          }
        `}
      >
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>

      {/* ── Bubble ───────────────────────────────────────────────────── */}
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1.5`}>

        {/* Label */}
        <span className="text-[10px] text-terminal-text-dim uppercase tracking-widest font-mono">
          {isUser ? "YOU" : "STOCKSENSE AI"}
        </span>

        {/* Message body */}
        <div
          className={`
            rounded px-4 py-3 text-sm leading-relaxed font-mono
            ${isUser
              ? "bg-terminal-muted text-terminal-text border border-terminal-border"
              : "bg-terminal-surface border border-terminal-border text-terminal-text ai-prose"
            }
          `}
          dangerouslySetInnerHTML={
            isUser
              ? undefined
              : { __html: formatAIText(message.content) }
          }
        >
          {isUser ? message.content : undefined}
        </div>

        {/* ── Sources toggle (AI messages only) ───────────────────────── */}
        {!isUser && message.sources?.length > 0 && (
          <div className="w-full">
            <button
              onClick={() => setShowSources((v) => !v)}
              className="flex items-center gap-1.5 text-[10px] text-terminal-amber
                hover:text-terminal-amber/80 transition-colors font-mono uppercase tracking-wider"
            >
              {showSources ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              {message.sources.length} source{message.sources.length > 1 ? "s" : ""}
              &nbsp;·&nbsp;{message.chunksUsed} chunks
            </button>

            {showSources && (
              <div className="mt-2 space-y-1.5">
                {message.sources.map((src, i) => (
                  <SourceCard key={i} source={src} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {message.error && (
          <p className="text-xs text-red-400 font-mono">⚠ {message.error}</p>
        )}
      </div>
    </div>
  );
}

// ── Minimal markdown-ish formatter for AI responses ──────────────────────────
function formatAIText(text) {
  if (!text) return "";
  return text
    // Bold **text**
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Inline code `code`
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Bullet lines starting with - or •
    .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    // Double newlines → paragraphs
    .replace(/\n\n/g, "</p><p>")
    // Single newlines → <br>
    .replace(/\n/g, "<br>")
    // Wrap in paragraph
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}
