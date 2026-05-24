from typing import List, Dict, Any

import ollama

from config import settings
from vector_store import VectorStore


# Stock-market-aware system prompt
SYSTEM_PROMPT = """You are StockSense, an expert stock market research assistant.

You help users understand:
- Indian equity markets (NSE/BSE), Nifty 500 stocks
- Fundamental analysis (P/E, revenue growth, debt, promoter holding)
- Technical analysis (stage analysis, moving averages, relative strength)
- Sector rotation and macro trends
- Swing trading setups (VCP, tight base, breakouts)

RULES:
1. Answer ONLY based on the provided context documents.
2. If the context does not contain enough information, say: "I don't have enough data on this in the uploaded documents."
3. Always cite the source (filename, page/row) when referencing data.
4. Be concise. Use bullet points for lists of stocks or metrics.
5. Never give buy/sell advice. Frame as data-driven observations only.
6. If the user asks about a specific stock, pull all relevant context about it.
"""


class RAGPipeline:
    """
    Orchestrates the full RAG flow:
    1. Retrieve top-K chunks from VectorStore
    2. Build a grounded prompt with context
    3. Call Claude API
    4. Return answer + source citations
    """

    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        self.client = ollama.Client(host=settings.OLLAMA_BASE_URL)

    # ------------------------------------------------------------------ #
    #  Main entry                                                          #
    # ------------------------------------------------------------------ #

    def answer(self, question: str) -> Dict[str, Any]:
        """
        Full RAG pipeline for a single question.

        Returns:
        {
            "answer": str,
            "sources": [{ "source", "page"/"rows", "score", "preview" }],
            "chunks_used": int
        }
        """
        if self.vector_store.count() == 0:
            return {
                "answer": "No documents uploaded yet. Please upload stock data files first.",
                "sources": [],
                "chunks_used": 0,
            }

        # Step 1: Retrieve relevant chunks
        hits = self.vector_store.search(query=question, top_k=settings.TOP_K_RESULTS)

        # Step 2: Build context block
        context_block = self._build_context(hits)

        # Step 3: Build user message with context injected
        user_message = f"""Use the following context to answer the question.

---CONTEXT START---
{context_block}
---CONTEXT END---

Question: {question}"""

        # Step 4: Call Claude
        response = self.client.chat(
            model=settings.OLLAMA_MODEL,
            messages= [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        options={"num_predict": settings.MAX_TOKENS, "temperature": 0.3},
        )
        answer_text = response["message"]["content"]

        # Step 5: Format sources for frontend
        sources = self._format_sources(hits)

        return {
            "answer": answer_text,
            "sources": sources,
            "chunks_used": len(hits),
        }

    # ------------------------------------------------------------------ #
    #  Helpers                                                             #
    # ------------------------------------------------------------------ #

    def _build_context(self, hits: List[Dict[str, Any]]) -> str:
        """Format retrieved chunks into a numbered context block for Claude."""
        parts = []
        for i, hit in enumerate(hits, 1):
            meta = hit["metadata"]
            source_label = self._source_label(meta)
            parts.append(f"[{i}] ({source_label})\n{hit['text']}")
        return "\n\n".join(parts)

    def _source_label(self, meta: Dict[str, Any]) -> str:
        """Human-readable source label from metadata."""
        source = meta.get("source", "unknown")
        if "page" in meta:
            return f"{source}, page {meta['page']}"
        if "rows" in meta:
            return f"{source}, rows {meta['rows']}"
        return source

    def _format_sources(self, hits: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Return clean source list for the frontend citation cards."""
        seen = set()
        sources = []

        for hit in hits:
            meta = hit["metadata"]
            label = self._source_label(meta)

            # Deduplicate same source+page references
            if label not in seen:
                seen.add(label)
                sources.append({
                    "label": label,
                    "source": meta.get("source", ""),
                    "score": hit["score"],
                    "preview": hit["text"][:150] + "...",  # snippet for UI
                })

        return sources
