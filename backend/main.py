from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from document_processor import DocumentProcessor
from vector_store import VectorStore
from rag_pipeline import RAGPipeline


# ------------------------------------------------------------------ #
#  App state — singletons shared across requests                       #
# ------------------------------------------------------------------ #

vector_store: VectorStore = None
rag_pipeline: RAGPipeline = None
doc_processor: DocumentProcessor = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize heavy objects once at startup."""
    global vector_store, rag_pipeline, doc_processor

    print("[Startup] Initializing StockSense backend...")
    doc_processor = DocumentProcessor()
    vector_store = VectorStore()           # loads embedding model here
    rag_pipeline = RAGPipeline(vector_store)
    print("[Startup] ✅ StockSense ready!")

    yield  # server runs here

    print("[Shutdown] Cleaning up...")


# ------------------------------------------------------------------ #
#  FastAPI app                                                          #
# ------------------------------------------------------------------ #

app = FastAPI(
    title="StockSense FAQ Chatbot API",
    description="RAG-powered stock market Q&A using Claude + ChromaDB",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow React dev server (localhost:5173) during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------ #
#  Schemas                                                              #
# ------------------------------------------------------------------ #

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str
    sources: list
    chunks_used: int

class UploadResponse(BaseModel):
    filename: str
    chunks_added: int
    total_chunks: int

class StatusResponse(BaseModel):
    status: str
    total_chunks: int
    collection: str


# ------------------------------------------------------------------ #
#  Routes                                                               #
# ------------------------------------------------------------------ #

@app.get("/", tags=["Health"])
def root():
    return {"message": "StockSense API is running 🚀"}


@app.get("/status", response_model=StatusResponse, tags=["Health"])
def status():
    """Check how many document chunks are currently indexed."""
    return StatusResponse(
        status="ok",
        total_chunks=vector_store.count(),
        collection="stock_faq_docs",
    )


@app.post("/upload", response_model=List[UploadResponse], tags=["Documents"])
async def upload_documents(files: List[UploadFile] = File(...)):
    """
    Upload one or more PDF/CSV/TXT files.
    Processes, chunks, embeds, and stores them in ChromaDB.
    """
    results = []

    for file in files:
        if not file.filename:
            raise HTTPException(status_code=400, detail="File has no filename.")

        ext = file.filename.rsplit(".", 1)[-1].lower()
        if ext not in ("pdf", "csv", "txt", "md"):
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type: .{ext}. Allowed: pdf, csv, txt, md",
            )

        file_bytes = await file.read()

        try:
            chunks = doc_processor.process_file(file_bytes, file.filename)
            added = vector_store.add_chunks(chunks)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

        results.append(
            UploadResponse(
                filename=file.filename,
                chunks_added=added,
                total_chunks=vector_store.count(),
            )
        )

    return results


@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
def chat(request: ChatRequest):
    """
    Ask a question. Returns Claude's grounded answer + source citations.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        result = rag_pipeline.answer(request.question)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG pipeline error: {str(e)}")

    return ChatResponse(**result)


@app.delete("/clear", tags=["Documents"])
def clear_documents():
    """
    ⚠️  Wipes ALL documents from ChromaDB.
    Use carefully — meant for dev/testing resets.
    """
    vector_store.clear()
    return {"message": "All documents cleared.", "total_chunks": 0}
