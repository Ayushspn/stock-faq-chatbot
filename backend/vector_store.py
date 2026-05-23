import uuid
from typing import List, Dict, Any

import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer

from config import settings
from document_processor import DocumentChunk


class VectorStore:
    """
    Wraps ChromaDB + SentenceTransformer embeddings.

    Responsibilities:
    - Embed document chunks via sentence-transformers (local, no API cost)
    - Persist vectors in ChromaDB on disk
    - Retrieve top-K similar chunks for a query
    """

    def __init__(self):
        # Persistent ChromaDB client — survives server restarts
        self.client = chromadb.PersistentClient(
            path=settings.CHROMA_DB_PATH,
            settings=ChromaSettings(anonymized_telemetry=False),
        )

        self.collection = self.client.get_or_create_collection(
            name=settings.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},  # cosine similarity for text
        )

        # Load embedding model once at startup (cached to disk by HuggingFace)
        print(f"[VectorStore] Loading embedding model: {settings.EMBEDDING_MODEL}")
        self.embedder = SentenceTransformer(settings.EMBEDDING_MODEL)
        print("[VectorStore] ✅ Ready")

    # ------------------------------------------------------------------ #
    #  Ingest                                                              #
    # ------------------------------------------------------------------ #

    def add_chunks(self, chunks: List[DocumentChunk]) -> int:
        """
        Embed and store a list of DocumentChunks.
        Returns the count of chunks actually added.
        """
        if not chunks:
            return 0

        texts = [c.text for c in chunks]
        metadatas = [c.metadata for c in chunks]
        ids = [str(uuid.uuid4()) for _ in chunks]

        # Batch embed — sentence-transformers handles batching internally
        embeddings = self.embedder.encode(texts, show_progress_bar=False).tolist()

        self.collection.add(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        return len(chunks)

    # ------------------------------------------------------------------ #
    #  Retrieve                                                            #
    # ------------------------------------------------------------------ #

    def search(self, query: str, top_k: int = None) -> List[Dict[str, Any]]:
        """
        Embed the query and return top-K most similar chunks.

        Returns a list of dicts:
        [{ "text": ..., "metadata": ..., "score": ... }, ...]
        """
        k = top_k or settings.TOP_K_RESULTS

        query_embedding = self.embedder.encode([query], show_progress_bar=False).tolist()

        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=min(k, self.collection.count() or 1),
            include=["documents", "metadatas", "distances"],
        )

        # Flatten ChromaDB's nested response format
        hits = []
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for doc, meta, dist in zip(docs, metas, distances):
            hits.append({
                "text": doc,
                "metadata": meta,
                "score": round(1 - dist, 4),  # convert distance → similarity
            })

        # Sort by similarity descending (highest relevance first)
        hits.sort(key=lambda x: x["score"], reverse=True)
        return hits

    # ------------------------------------------------------------------ #
    #  Utils                                                               #
    # ------------------------------------------------------------------ #

    def count(self) -> int:
        """Total chunks currently stored."""
        return self.collection.count()

    def clear(self) -> None:
        """Delete all documents from the collection (use carefully)."""
        self.client.delete_collection(settings.COLLECTION_NAME)
        self.collection = self.client.get_or_create_collection(
            name=settings.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        print("[VectorStore] 🗑️  Collection cleared.")
