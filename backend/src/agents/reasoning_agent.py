from langchain_google_genai import ChatGoogleGenerativeAI
from src.config import DEFAULT_MODEL, GOOGLE_API_KEY

llm = ChatGoogleGenerativeAI(model=DEFAULT_MODEL, google_api_key=GOOGLE_API_KEY)

def run(question, docs):
    context = "\n".join([d.page_content for d in docs])

    prompt = f"""
Bạn là trợ giảng AI. Trả lời dựa trên context:

{context}

Question: {question}
"""

    return llm.invoke(prompt).content