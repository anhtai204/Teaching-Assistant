import json
import os
from typing import List, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage
from src.config import OPENAI_API_KEY, DEFAULT_MODEL

def generate_knowledge_gaps_with_llm(unresolved_history: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """
    Analyzes negative feedback or unresolved chats to extract knowledge gaps.
    """
    if not unresolved_history:
        return []

    llm = ChatOpenAI(
        model=DEFAULT_MODEL,
        api_key=OPENAI_API_KEY,
        temperature=0.2,
        max_retries=1,
        timeout=30
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an AI Analytics Engine for an educational platform.
Your task is to analyze the following chat history of students who gave negative feedback or had unresolved questions.
Identify the core topics they are struggling with.

Return a JSON array of objects, where each object has:
- 'topic': (string) A concise, formal name of the struggling topic (e.g., 'Backpropagation Algorithm', 'SQL Joins').
- 'frequency': (integer) Your estimated count of how many times this topic appeared in the provided history.
- 'gap_score': (float) A severity score from 1.0 to 10.0 based on how confused the students seem.

Return ONLY the raw JSON array. Do not include markdown formatting like ```json.
"""),
        ("human", "Here is the unresolved chat history to analyze:\n\n{history}")
    ])

    # Format history into a readable text
    history_text = "\n".join([f"Student: {msg['user_msg']}\nAI: {msg['ai_msg']}\nFeedback: {msg['feedback']}" for msg in unresolved_history])

    chain = prompt | llm

    try:
        response = chain.invoke({"history": history_text})
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
            
        gaps = json.loads(content.strip())
        if not isinstance(gaps, list):
            gaps = [gaps]
        return gaps
    except Exception as e:
        print(f"[Analytics Service] Failed to generate knowledge gaps: {e}")
        return []
