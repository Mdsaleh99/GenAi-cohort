
# 🧠 LangGraph Projects with Code Examples

This document includes two real-world LangGraph projects with Python code snippets to help you get started.

---

## 📚 Project 1: AI Study Assistant with RAG & Smart Follow-Up

### Goal:
- Accepts student question
- Uses RAG if needed to search context
- Answers using LLM
- Loops back for follow-up
- Stores memory across turns

---

### 📦 Required Installations

```bash
pip install langgraph langchain openai chromadb
```

---

### 🔧 Example Code

```python
from langgraph.graph import StateGraph, END
from langchain.chat_models import ChatOpenAI
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from langchain.chains import RetrievalQA
from langchain.document_loaders import TextLoader
import os

os.environ["OPENAI_API_KEY"] = "your-api-key"

# Setup Vector Store (simulated)
retriever = Chroma(persist_directory="./db", embedding_function=OpenAIEmbeddings()).as_retriever()

# QA Chain
qa_chain = RetrievalQA.from_chain_type(
    llm=ChatOpenAI(), retriever=retriever
)

# Nodes
def receive_input(state): return {"question": state["question"]}

def should_search(state): return "search_docs" if "?" in state["question"] else "generate_direct"

def search_docs(state): return {"context": qa_chain.run(state["question"])}

def generate_direct(state): return {"answer": f"General response to: {state['question']}"}

def ask_followup(state): return {"question": "Do you have another question?"}

# Graph
builder = StateGraph(dict)
builder.add_node("receive_input", receive_input)
builder.add_node("search_docs", search_docs)
builder.add_node("generate_direct", generate_direct)
builder.add_node("ask_followup", ask_followup)

builder.set_entry_point("receive_input")
builder.add_conditional_edges("receive_input", should_search)
builder.add_edge("search_docs", "ask_followup")
builder.add_edge("generate_direct", "ask_followup")
builder.add_conditional_edges("ask_followup", lambda state: "receive_input" if "yes" in state["question"].lower() else END)

graph = builder.compile()

# Run
graph.invoke({"question": "What is photosynthesis?"})
```

---

## 🧪 Project 2: AI Interview Coach

### Goal:
- Simulate DSA and HR interviews
- Evaluate answers
- Provide feedback
- Loop for more questions
- Final summary

---

### 🔧 Code Example

```python
from langgraph.graph import StateGraph, END
from langchain.chat_models import ChatOpenAI

llm = ChatOpenAI()

questions = [
    "Explain Merge Sort and its complexity.",
    "Describe a challenge you faced in a team project."
]

def intro(state): return {"index": 0, "score": 0, "question": questions[0]}

def ask_question(state): return {"question": questions[state["index"]]}

def record_response(state): return {"response": input(f"Answer: ")}

def evaluate_response(state):
    score = 5  # Simulated
    feedback = "Good structure, improve clarity."
    return {"score": state["score"] + score, "feedback": feedback}

def loop_check(state):
    if state["index"] + 1 < len(questions):
        return {"index": state["index"] + 1, "question": questions[state["index"] + 1]}
    return END

builder = StateGraph(dict)
builder.add_node("intro", intro)
builder.add_node("ask_question", ask_question)
builder.add_node("record_response", record_response)
builder.add_node("evaluate_response", evaluate_response)
builder.add_node("loop_check", loop_check)

builder.set_entry_point("intro")
builder.add_edge("intro", "ask_question")
builder.add_edge("ask_question", "record_response")
builder.add_edge("record_response", "evaluate_response")
builder.add_edge("evaluate_response", "loop_check")
builder.add_conditional_edges("loop_check", lambda state: "ask_question" if "index" in state else END)

graph = builder.compile()

graph.invoke({})
```

---

## ✅ Summary

| Project | Highlights |
|--------|------------|
| AI Study Assistant | RAG, Follow-up Loop, Conditional Graph |
| AI Interview Coach | Looping, Scoring, Evaluation, Multi-turn |

Use LangGraph to scale and extend these systems with tools, agents, and memory.

