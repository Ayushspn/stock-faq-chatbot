import { useState, useEffect, useRef } from "react";
import { Send, AlertTriangle } from "lucide-react";
import UploadPanel from "./components/UploadPanel";
import ChatWindow from "./components/ChatWindow";
import { sendMessage, getStatus } from "./api";

let msgIdCounter = 0;
const uid = () => ++msgIdCounter;

export default function App() {
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [totalChunks, setTotalChunks] = useState(0);
  const [noDocsWarn, setNoDocsWarn]   = useState(false);
  const inputRef = useRef(null);

  // ── Fetch index status on mount ─────────────────────────────────────────
  useEffect(() => {
    getStatus()
      .then((s) => setTotalChunks(s.total_chunks))
      .catch(() => {}); // backend might not be running yet
  }, []);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    // Warn if no docs uploaded
    if (totalChunks === 0) {
      setNoDocsWarn(true);
      setTimeout(() => setNoDocsWarn(false), 3000);
      return;
    }

    setNoDocsWarn(false);
    setInput("");

    // Optimistically add user message
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", content: question },
    ]);

    setIsLoading(true);

    try {
      const data = await sendMessage(question);
      setMessages((prev) => [
        ...prev,
        {
          id:         uid(),
          role:       "assistant",
          content:    data.answer,
          sources:    data.sources,
          chunksUsed: data.chunks_used,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id:      uid(),
          role:    "assistant",
          content: "Something went wrong. Please check if the backend is running.",
          error:   err.message,
          sources: [],
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen grid-bg scanlines overflow-hidden">

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <UploadPanel
        totalChunks={totalChunks}
        onUploadComplete={setTotalChunks}
      />

      {/* ── Main area ──────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-terminal-border bg-terminal-surface/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse-green" />
            <span className="text-xs text-terminal-text-dim font-mono uppercase tracking-widest">
              Research Terminal
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-terminal-text-dim font-mono">
            <span>NSE · BSE · Nifty 500</span>
            <span className="border-l border-terminal-border pl-4">
              {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </header>

        {/* Chat window */}
        <ChatWindow messages={messages} isLoading={isLoading} />

        {/* ── Input bar ────────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-4 border-t border-terminal-border bg-terminal-surface/60 backdrop-blur-sm">

          {/* No-docs warning */}
          {noDocsWarn && (
            <div className="flex items-center gap-2 mb-3 text-xs text-terminal-amber animate-fade-in font-mono">
              <AlertTriangle size={12} />
              Upload documents first — I need data to answer questions.
            </div>
          )}

          <div
            className={`
              flex items-end gap-3 border rounded px-4 py-3
              transition-all duration-200 bg-terminal-bg
              ${isLoading
                ? "border-terminal-border opacity-60"
                : "border-terminal-muted focus-within:border-terminal-green focus-within:glow-green"
              }
            `}
          >
            {/* Prompt prefix */}
            <span className="text-terminal-green font-mono text-sm shrink-0 mb-0.5">›</span>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask about stocks, sectors, fundamentals, technicals..."
              rows={1}
              className="
                flex-1 bg-transparent resize-none outline-none
                text-sm font-mono text-terminal-text placeholder:text-terminal-text-dim
                leading-relaxed max-h-32 overflow-y-auto
              "
              style={{ fieldSizing: "content" }}
            />

            {/* Blinking cursor when empty */}
            {!input && !isLoading && (
              <span className="text-terminal-green animate-blink text-sm mb-0.5 shrink-0">█</span>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="
                shrink-0 p-1.5 rounded transition-all duration-200
                text-terminal-text-dim hover:text-terminal-green
                disabled:opacity-30 disabled:cursor-not-allowed
                hover:bg-terminal-green-dim
              "
            >
              <Send size={15} />
            </button>
          </div>

          <p className="text-[10px] text-terminal-text-dim mt-2 font-mono text-center">
            Enter to send · Shift+Enter for new line · Answers grounded in uploaded documents
          </p>
        </div>
      </div>
    </div>
  );
}
