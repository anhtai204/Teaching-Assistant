"""
AI Teaching Assistant — LangGraph-powered agent.

This module provides `run_agent()` which invokes the compiled LangGraph
and returns the final assistant reply with appended sources.

The interactive CLI (`main()`) is preserved for local testing.
"""

import logging

from langchain_core.messages import HumanMessage

from src.config import LOG_LEVEL
from src.graph.builder import graph
from src.memory.memory_service import debug_memory_recall
from src.config import MEMORY_FACT_MAX_DISTANCE, MEMORY_FACT_TOP_K

logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------

async def astream_agent(
    user_input: str,
    user_id: str = "default",
    session_id: str = "default",
    course_id: str = "default",
    user_profile: dict = None,
):
    """
    Async generator that yields tokens and metadata from the LangGraph.
    Yields JSON strings for:
    - 'metadata': Contains sources/citations.
    - 'token': Each new word/token from the AI.
    - 'error': If something goes wrong.
    """
    
    initial_state = {
        "user_profile": user_profile or {},
        "messages": [HumanMessage(content=user_input)],
        "user_id": user_id,
        "session_id": session_id,
        "course_id": course_id,
        "sources": [],
        "memory_block": "",
        "summary_block": "",
        "route": "",
        "route_reason": "",
        "context": [],
        "final_answer": "",
    }

    try:
        # We use astream to capture updates to the state
        # In a more complex setup, we'd use astream_events to get LLM tokens
        # For simplicity, we'll run the graph and yield tokens from the final node
        
        import json
        async for event in graph.astream(initial_state, {"recursion_limit": 25}, stream_mode="updates"):
            # Check for retrieval results to send sources early
            if "retrieval" in event:
                sources = event["retrieval"].get("sources", [])
                chunks = event["retrieval"].get("context", [])
                # Use proper JSON serialization for complex objects
                metadata_str = json.dumps({
                    "type": "metadata", 
                    "sources": list(sources), 
                    "chunks": chunks
                }, default=str)
                yield f"data: {metadata_str}\n\n"

            # Check for tutor results
            if "tutor" in event:
                final_answer = event["tutor"].get("final_answer", "")
                if final_answer:
                    # Stream tokens (words) to the UI
                    words = final_answer.split(' ')
                    for word in words:
                        chunk_str = json.dumps({"type": "token", "content": f"{word} "})
                        yield f"data: {chunk_str}\n\n"
        
        yield "data: [DONE]\n\n"

    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield f"data: {{\"type\": \"error\", \"message\": \"{str(e)}\"}}\n\n"

def run_agent(
    user_input: str,
    user_id: str = "default",
    session_id: str = "default",
    course_id: str = "default",
    user_profile: dict = None,
) -> str:
    """Run the agent synchronously and return the final answer."""
    initial_state = {
        "user_profile": user_profile or {},
        "messages": [HumanMessage(content=user_input)],
        "user_id": user_id,
        "session_id": session_id,
        "course_id": course_id,
        "sources": [],
        "memory_block": "",
        "summary_block": "",
        "route": "",
        "route_reason": "",
        "context": [],
        "final_answer": "",
    }
    result = graph.invoke(initial_state, {"recursion_limit": 25})
    return result.get("final_answer", "")


# ------------------------------------------------------------------
# Interactive CLI (local testing)
# ------------------------------------------------------------------

def main():
    """Interactive CLI for testing the LangGraph agent."""

    user_id = input("User ID (default: default): ").strip() or "default"
    session_id = input("Session ID (default: auto): ").strip() or "cli"

    print("LangGraph Agent (type 'quit' to exit)")
    print("-" * 50)

    while True:
        user_input = input("\nYou: ").strip()

        if not user_input or user_input.lower() in ("quit", "exit", "q"):
            print("Bye!")
            break

        if user_input.startswith("/memory-debug"):
            debug_query = user_input.replace("/memory-debug", "", 1).strip()
            if not debug_query:
                print("\nUsage: /memory-debug <query>")
                continue

            rows = debug_memory_recall(
                user_id,
                debug_query,
                top_k=MEMORY_FACT_TOP_K,
                max_distance=MEMORY_FACT_MAX_DISTANCE,
            )
            print("\n[Memory Debug]")
            if not rows:
                print("No relevant memory found.")
                continue

            for idx, row in enumerate(rows, start=1):
                dist = row.get("distance")
                meta = row.get("metadata", {})
                print(f"{idx}. distance={dist} | type={meta.get('memory_type')} | source={meta.get('source')}")
                print(f"   text: {row.get('text')}")
            continue

        try:
            response = run_agent(
                user_input,
                user_id=user_id,
                session_id=session_id,
            )
            print(f"\nAgent: {response}")

        except Exception as e:
            logger.error(f"Error: {e}")
            print(f"\nError: {e}")


if __name__ == "__main__":
    main()