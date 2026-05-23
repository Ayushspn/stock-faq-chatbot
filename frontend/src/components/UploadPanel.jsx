import { useState, useRef, useCallback } from "react";
import { Upload, FileText, Trash2, Database, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { uploadFiles, clearDocuments } from "../api";

export default function UploadPanel({ totalChunks, onUploadComplete }) {
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadLog, setUploadLog] = useState([]);  // {filename, chunks, status}
  const [error, setError]         = useState(null);
  const fileRef = useRef();

  // ── Drag handlers ───────────────────────────────────────────────────────
  const handleDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = ()  => setDragging(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) handleUpload(files);
  }, []);

  // ── Upload logic ────────────────────────────────────────────────────────
  const handleUpload = async (files) => {
    setError(null);
    setUploading(true);
    try {
      const results = await uploadFiles(files);
      setUploadLog((prev) => [
        ...prev,
        ...results.map((r) => ({
          filename: r.filename,
          chunks: r.chunks_added,
          status: "ok",
        })),
      ]);
      onUploadComplete(results.at(-1)?.total_chunks ?? totalChunks);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Clear all indexed documents? This cannot be undone.")) return;
    try {
      await clearDocuments();
      setUploadLog([]);
      onUploadComplete(0);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <aside className="flex flex-col h-full border-r border-terminal-border bg-terminal-surface w-72 shrink-0">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b border-terminal-border">
        <p className="font-display text-lg font-bold tracking-widest text-terminal-green uppercase">
          StockSense
        </p>
        <p className="text-xs text-terminal-text-dim mt-0.5 tracking-wide">
          AI Research Terminal v1.0
        </p>
      </div>

      {/* ── Index status ────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-terminal-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-terminal-text-dim uppercase tracking-wider">Vector Index</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-mono ${
              totalChunks > 0
                ? "bg-terminal-green-dim text-terminal-green"
                : "bg-terminal-muted text-terminal-text-dim"
            }`}
          >
            {totalChunks > 0 ? "LIVE" : "EMPTY"}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <Database size={13} className="text-terminal-text-dim" />
          <span className="text-sm font-mono text-terminal-text">
            {totalChunks.toLocaleString()}
            <span className="text-terminal-text-dim ml-1">chunks indexed</span>
          </span>
        </div>
      </div>

      {/* ── Drop zone ───────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b border-terminal-border">
        <p className="text-xs text-terminal-text-dim uppercase tracking-wider mb-2">
          Upload Documents
        </p>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`
            relative border border-dashed rounded cursor-pointer transition-all duration-200
            flex flex-col items-center justify-center gap-2 py-6 px-3
            ${dragging
              ? "border-terminal-green bg-terminal-green-dim glow-green"
              : "border-terminal-muted hover:border-terminal-green/50 hover:bg-terminal-muted/20"
            }
          `}
        >
          {uploading ? (
            <Loader size={20} className="text-terminal-green animate-spin" />
          ) : (
            <Upload size={20} className={dragging ? "text-terminal-green" : "text-terminal-text-dim"} />
          )}
          <span className="text-xs text-terminal-text-dim text-center leading-relaxed">
            {uploading
              ? "Processing..."
              : "Drop files here or click to browse"}
          </span>
          <span className="text-[10px] text-terminal-text-dim/60">
            PDF · CSV · TXT · MD
          </span>

          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.csv,.txt,.md"
            className="hidden"
            onChange={(e) => handleUpload(Array.from(e.target.files))}
          />
        </div>

        {error && (
          <div className="mt-2 flex items-start gap-1.5 text-red-400 text-xs animate-fade-in">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* ── Upload log ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        {uploadLog.length === 0 && (
          <p className="text-xs text-terminal-text-dim text-center mt-4">
            No files uploaded yet
          </p>
        )}
        {uploadLog.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-2 py-1.5 animate-slide-up"
          >
            {item.status === "ok" ? (
              <CheckCircle size={12} className="text-terminal-green mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs text-terminal-text truncate">{item.filename}</p>
              <p className="text-[10px] text-terminal-text-dim">
                +{item.chunks} chunks
              </p>
            </div>
            <FileText size={11} className="text-terminal-text-dim shrink-0 mt-0.5" />
          </div>
        ))}
      </div>

      {/* ── Footer: Clear button ─────────────────────────────────────────── */}
      {totalChunks > 0 && (
        <div className="px-4 py-3 border-t border-terminal-border">
          <button
            onClick={handleClear}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs
              border border-terminal-muted text-terminal-text-dim rounded
              hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/5
              transition-all duration-200"
          >
            <Trash2 size={12} />
            Clear Index
          </button>
        </div>
      )}
    </aside>
  );
}
