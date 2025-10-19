# NeuralLearn

Overview:
- NeuraLearn is an intelligent study assistant that helps students transform their notes into helpful tools to learn from. It uses AI to automatically summarize content, generate quizzes, and track performance — offering an adaptive study plan based on user weaknesses and topic patterns.
- The project combines software engineering, AI integration (Gemini API, RAG via LangChain), and data-driven feedback to enhance personalized learning.

Features:
- Note Upload: Supports text and PDF uploads.
- AI Summarization: Extracts and simplifies key takeaways using language models.
- Quiz Generation: Produces multiple-choice and fill-in-the-blank questions from the notes.
- Performance Analytics: Tracks user accuracy and difficulty progression.
- Study Recommendations: Suggests topics to review based on quiz data.
- Optional Chatbot Coach: Provides interactive Q&A and clarifications.

Tech Stack:
- Frontend:	React (JavaScript)
- Backend: FastAPI (Python)
- Database: ChromaDB, PostgreSQL
- AI Frameworks: LangChain, Gemini API

AI Components:
- Summarization: Uses large language models via LangChain to generate structured content summaries.
- Question Generation: Employs custom prompt templates to extract key facts and transform them into quiz questions.
- Adaptive Feedback: Analyzes accuracy trends to recommend future study paths.
