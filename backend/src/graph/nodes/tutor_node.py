"""
LangGraph node: tutor

Creates final assistant message from retrieved context.
"""

from __future__ import annotations
from src.agents.tutor_agent import tutor_node as agent_tutor_node
from src.graph.state import AgentState

def tutor_node(state: AgentState) -> dict:
    # Use the smart agent node that handles messages/profile correctly
    result = agent_tutor_node(state)
    ai_msg = result["messages"][0]
    answer = ai_msg.content
    
    return {
        "messages": result["messages"],
        "final_answer": answer,
    }