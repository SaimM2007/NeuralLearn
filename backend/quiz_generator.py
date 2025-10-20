from langchain_google_genai import ChatGoogleGenerativeAI
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

class QuizGenerator:
    def __init__(self):
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=self.gemini_api_key,
            temperature=0.8
        )
    
    async def generate_quiz(self, topic: str, content: str, difficulty: str = "medium", num_questions: int = 5):
        """Generate quiz questions from content"""
        
        difficulty_instructions = {
            "easy": "Create basic recall and understanding questions.",
            "medium": "Create application and analysis questions.",
            "hard": "Create complex synthesis and evaluation questions."
        }
        
        prompt = f"""Generate {num_questions} multiple-choice quiz questions about: {topic}

Content:
{content[:3000]}

Difficulty: {difficulty}
{difficulty_instructions.get(difficulty, '')}

Return ONLY a valid JSON array with this exact structure:
[
  {{
    "question": "Question text?",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correct_answer": "A",
    "explanation": "Why this is correct"
  }}
]

Questions:"""
        
        response = await self.llm.ainvoke(prompt)
        
        # Extract JSON from response
        try:
            # Try to find JSON array in response
            content = response.content
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                questions = json.loads(json_match.group())
            else:
                questions = json.loads(content)
            return questions
        except:
            # Fallback: create basic structure
            return [{
                "question": "Sample question about the topic",
                "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                "correct_answer": "A",
                "explanation": "This is a sample question."
            }]
    
    async def evaluate_answer(self, question: str, user_answer: str, correct_answer: str):
        """Evaluate and provide feedback on an answer"""
        prompt = f"""Question: {question}
User's Answer: {user_answer}
Correct Answer: {correct_answer}

Provide brief feedback on the user's answer. If incorrect, explain why and guide them to the correct understanding.

Feedback:"""
        
        response = await self.llm.ainvoke(prompt)
        return response.content
    
    async def adapt_difficulty(self, user_score: float, current_difficulty: str):
        """Suggest next difficulty based on performance"""
        if user_score >= 0.8 and current_difficulty != "hard":
            if current_difficulty == "easy":
                return "medium"
            else:
                return "hard"
        elif user_score < 0.5 and current_difficulty != "easy":
            if current_difficulty == "hard":
                return "medium"
            else:
                return "easy"
        return current_difficulty