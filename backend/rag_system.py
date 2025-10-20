# rag_system.py
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langgraph.graph import StateGraph, START, END
from langchain_core.documents import Document
from langchain_core.messages import SystemMessage
from langgraph.prebuilt import ToolNode, tools_condition

import os
import uuid
import json
from typing import TypedDict, Annotated, List, Literal
from typing_extensions import NotRequired
from dotenv import load_dotenv

load_dotenv()


# =====================================================
# 📌 Shared State Schema
# =====================================================
class RAGState(TypedDict):
    question: str
    query: dict
    context: List[Document]
    messages: list
    answer: NotRequired[str]


# =====================================================
# 📌 Main RAG System
# =====================================================
class RAGSystem:
    def __init__(self):
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        self.chroma_persist_dir = os.getenv('CHROMA_PERSIST_DIR', './chroma_data')

        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=self.gemini_api_key,
            temperature=0.7
        )

        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=self.gemini_api_key
        )

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )

    # =====================================================
    # 📥 Indexing
    # =====================================================
    async def index_document(self, file_path: str, user_id: int, doc_id: int):
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        chunks = self.text_splitter.split_documents(documents)

        for chunk in chunks:
            chunk.metadata['user_id'] = user_id
            chunk.metadata['doc_id'] = doc_id

        collection_name = f"user_{user_id}_docs"

        vectorstore = Chroma(
            collection_name=collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.chroma_persist_dir
        )
        vectorstore.add_documents(chunks)
        return len(chunks)

    # =====================================================
    # 🧠 RAG LangGraph Pipeline
    # =====================================================
    def _get_vectorstore(self, user_id: int):
        collection_name = f"user_{user_id}_docs"
        return Chroma(
            collection_name=collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.chroma_persist_dir
        )

    def _analyze_query(self, state: RAGState):
        """LLM rewrites the user query into structured search query."""
        structured_schema = TypedDict(
            "Search",
            {
                "query": Annotated[str, ..., "Search query to run."],
                "section": Annotated[
                    Literal["beginning", "middle", "end"],
                    ...,
                    "Section to query."
                ]
            }
        )
        structured_llm = self.llm.with_structured_output(structured_schema)
        search_query = structured_llm.invoke(state["question"])
        return {"query": search_query}

    def _retrieve(self, state: RAGState):
        query = state["query"]
        vectorstore = self._get_vectorstore(state["query"]["user_id"])  # user_id must be added to query
        retrieved_docs = vectorstore.similarity_search(
            query["query"],
            k=5,
            filter=lambda doc: doc.metadata.get("section") == query["section"]
        )
        return {"context": retrieved_docs}

    def _generate(self, state: RAGState):
        docs_content = "\n\n".join(doc.page_content for doc in state["context"])
        system_message = SystemMessage(
            content=(
                "You are an assistant for question-answering tasks. "
                "Use the following pieces of retrieved context to answer "
                "the question. If you don't know the answer, say that you don't know. "
                "Keep the answer concise and clear.\n\n" + docs_content
            )
        )
        conversation_messages = [system_message]
        response = self.llm.invoke(conversation_messages + state.get("messages", []))
        return {"answer": response.content}

    def _build_graph(self):
        graph = StateGraph(RAGState)
        graph.add_node("analyze_query", self._analyze_query)
        graph.add_node("retrieve", self._retrieve)
        graph.add_node("generate", self._generate)
        graph.add_edge(START, "analyze_query")
        graph.add_edge("analyze_query", "retrieve")
        graph.add_edge("retrieve", "generate")
        graph.add_edge("generate", END)
        return graph.compile()

    async def query_documents(self, query: str, user_id: int, mode: str = "Quick Learner", messages: list = None):
        """Public method to run full RAG pipeline."""
        try:
            graph = self._build_graph()
            initial_state: RAGState = {
                "question": query,
                "messages": messages or [],
                "query": {"user_id": user_id}  # propagate user_id for retrieval
            }
            final_state = graph.invoke(initial_state)
            return {
                "answer": final_state["answer"],
                "sources": [{"content": doc.page_content, "metadata": doc.metadata} for doc in final_state["context"]]
            }
        except Exception as e:
            # fallback to direct LLM answer
            response = await self.llm.ainvoke(f"{mode}: {query}")
            return {"answer": response.content, "sources": []}

    # =====================================================
    # 📝 Utility: Summaries and Topic Extraction
    # =====================================================
    async def generate_summary(self, file_path: str):
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        full_text = "\n".join([doc.page_content for doc in documents[:5]])
        prompt = f"Summarize this academic document:\n\n{full_text[:4000]}"
        response = await self.llm.ainvoke(prompt)
        return response.content

    async def extract_topics(self, file_path: str):
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        full_text = "\n".join([doc.page_content for doc in documents[:5]])
        prompt = f"Extract 5-10 key topics or concepts from this document. Return as JSON array:\n\n{full_text[:3000]}"
        response = await self.llm.ainvoke(prompt)
        return response.content