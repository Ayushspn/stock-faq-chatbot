import os
import csv
import io
from typing import List, Dict, Any
from pathlib import Path

import PyPDF2
import pandas as pd

from config import settings


class DocumentChunk:
    """Represents a single chunk of processed text with metadata."""

    def __init__(self, text: str, metadata: Dict[str, Any]):
        self.text = text
        self.metadata = metadata  # source, page, chunk_index, file_type, etc.

    def __repr__(self):
        return f"<DocumentChunk source='{self.metadata.get('source')}' len={len(self.text)}>"


class DocumentProcessor:
    """
    Ingests PDF, CSV, TXT files and splits them into overlapping chunks
    ready to be embedded and stored in ChromaDB.
    """

    def __init__(self):
        self.chunk_size = settings.CHUNK_SIZE
        self.chunk_overlap = settings.CHUNK_OVERLAP

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    def process_file(self, file_bytes: bytes, filename: str) -> List[DocumentChunk]:
        """Entry point — detect file type and dispatch to correct parser."""
        ext = Path(filename).suffix.lower()

        if ext == ".pdf":
            raw_pages = self._parse_pdf(file_bytes, filename)
        elif ext == ".csv":
            raw_pages = self._parse_csv(file_bytes, filename)
        elif ext in (".txt", ".md"):
            raw_pages = self._parse_txt(file_bytes, filename)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

        # Chunk each page/block independently to preserve boundaries
        all_chunks: List[DocumentChunk] = []
        for page_text, meta in raw_pages:
            chunks = self._chunk_text(page_text, meta)
            all_chunks.extend(chunks)

        return all_chunks

    # ------------------------------------------------------------------ #
    #  Parsers                                                             #
    # ------------------------------------------------------------------ #

    def _parse_pdf(self, file_bytes: bytes, filename: str) -> List[tuple]:
        """Extract text page-by-page from a PDF."""
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                meta = {
                    "source": filename,
                    "file_type": "pdf",
                    "page": i + 1,
                }
                pages.append((text, meta))
        return pages

    def _parse_csv(self, file_bytes: bytes, filename: str) -> List[tuple]:
        """
        Convert CSV rows to readable text blocks.
        Each row becomes: 'Column1: val1 | Column2: val2 | ...'
        Groups of 10 rows are merged into one chunk for better context.
        """
        df = pd.read_csv(io.BytesIO(file_bytes))
        df.fillna("N/A", inplace=True)

        # Convert each row to a readable sentence
        rows_as_text = []
        for _, row in df.iterrows():
            row_text = " | ".join(f"{col}: {val}" for col, val in row.items())
            rows_as_text.append(row_text)

        # Group rows into blocks of 10
        block_size = 10
        blocks = []
        for i in range(0, len(rows_as_text), block_size):
            block = "\n".join(rows_as_text[i : i + block_size])
            meta = {
                "source": filename,
                "file_type": "csv",
                "rows": f"{i+1}-{min(i+block_size, len(rows_as_text))}",
            }
            blocks.append((block, meta))

        return blocks

    def _parse_txt(self, file_bytes: bytes, filename: str) -> List[tuple]:
        """Parse plain text / markdown files."""
        text = file_bytes.decode("utf-8", errors="ignore")
        meta = {"source": filename, "file_type": "txt"}
        return [(text, meta)]

    # ------------------------------------------------------------------ #
    #  Chunker                                                             #
    # ------------------------------------------------------------------ #

    def _chunk_text(self, text: str, base_meta: Dict[str, Any]) -> List[DocumentChunk]:
        """
        Split text into overlapping chunks of `chunk_size` chars.
        Overlap = `chunk_overlap` chars from the previous chunk's tail.
        """
        chunks = []
        start = 0
        chunk_index = 0

        while start < len(text):
            end = start + self.chunk_size
            chunk_text = text[start:end].strip()

            if chunk_text:
                meta = {**base_meta, "chunk_index": chunk_index}
                chunks.append(DocumentChunk(text=chunk_text, metadata=meta))
                chunk_index += 1

            # Move forward, but keep overlap from the previous window
            start += self.chunk_size - self.chunk_overlap

        return chunks
