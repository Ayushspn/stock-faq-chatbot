import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

// Loading dots shown while waiting for Claude
function ThinkingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-7 h-7 rounded bg-terminal-green-dim flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-terminal-green text-xs">AI</span>
      </div>
      <div className="bg-terminal-surface border border-terminal-border rounded px-4 py-3">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-blink"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
          <span className="text-[10px] text-terminal-text-dim ml-1 font-mono uppercase tracking-widest">
            Analyzing...
          </span>
        </div>
      </div>
    </div>
  );
}

// Empty state shown before first message
function EmptyState() {
  const SUGGESTIONS = [
    "Which stocks are near 52-week high?",
    "Show me high RS rank stocks in Nifty 500",
    "What are the top momentum stocks this month?",
    "Which sectors have the highest volume shockers?",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 animate-fade-in">
      <div className="text-center">
        <p className="font-display text-3xl font-bold tracking-widest text-terminal-green text-glow uppercase">
          StockSense
        </p>
        <p className="text-xs text-terminal-text-dim mt-2 tracking-wider">
          Ask anything about your uploaded stock data
        </p>
      </div>

      <div className="w-full max-w-md space-y-2">
        <p className="text-[10px] text-terminal-text-dim uppercase tracking-widest mb-3 text-center">
          Try asking
        </p>
        {SUGGESTIONS.map((s, i) => (
          <div
            key={i}
            className="border border-terminal-border rounded px-3 py-2 text-xs
              text-terminal-text-dim font-mono hover:border-terminal-green/30
              hover:text-terminal-text transition-all duration-200 cursor-default"
          >
            <span className="text-terminal-green mr-2">›</span>
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChatWindow({ messages, isLoading }) {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return <EmptyState />;
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isLoading && <ThinkingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
