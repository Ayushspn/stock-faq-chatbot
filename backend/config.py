from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # Ollama (local — no API key needed)
    OLLAMA_MODEL: str = "llama3.2:latest"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    MAX_TOKENS: int = 1024

    # ChromaDB
    CHROMA_DB_PATH: str = "./chroma_db"
    COLLECTION_NAME: str = "stock_faq_docs"

    # Embeddings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"  # fast, local, free

    # RAG
    TOP_K_RESULTS: int = 5
    CHUNK_SIZE: int = 500       # characters per chunk
    CHUNK_OVERLAP: int = 50     # overlap between chunks

    class Config:
        env_file = ".env"


settings = Settings()