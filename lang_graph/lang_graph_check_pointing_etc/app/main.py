# from .graph import graph
from dotenv import load_dotenv
from langgraph.checkpoint.mongodb import MongoDBSaver
from .graph import create_chat_graph
from pymongo import MongoClient

load_dotenv()

"""
    def init():
        while True:
            user_input = input(">> ")
            # result = graph.invoke({"messages": [{"role": "user", "content": user_input}]})
            # result = graph.stream({"messages": [{"role": "user", "content": user_input}]}, stream_mode="values")
            for event in graph.stream({"messages": [{"role": "user", "content": user_input}]}, stream_mode="values"):
                if "messages" in event:
                    event["messages"][-1].pretty_print()


    init()

"""
# for this when i give prompt "Hey, remember that my name is saleh" the ai message is something like this "Of course, Saleh! How can I assist you today?", but when i ask "what is my name" the ai message is something like this "I'm sorry, but I don't know your name. You haven't provided it".   to solve this problem we use checkpointing in langGraph
# checkpoint is har node ka input, output and kab run huyi etc ohh sab db me store karta hai and iska benefit ye hai ki agr graph ko dubara execute karna hai toh usko pata hai ki last me kidar stop hua hai because of checkpoint so jah stop hua tha wahi se continue karsakte hai. jab .invoke() ya .stream() karenge tab data ko load karenge database se uss state ko.
# https://langchain-ai.github.io/langgraph/how-tos/persistence_mongodb/

# Run file: python -m app.main
# ! ===============================================================================
# Checkpointing
# checkpointing is not a RAG it is a storing a each state in db. that is State class which is in graph.py and next time wahi se state ko load karleta hai and jah pe ruka tha wahi se resume b karta hai
# e.g: assume we have 5 node in that 3 node successfully worked but 2 failed. so it runs where it was stoped it means resume 

MONGODB_URI = "mongodb://admin:admin@localhost:27017"
config = {"configurable": {"thread_id": "3"}}

def init():
    with MongoDBSaver.from_conn_string(MONGODB_URI) as checkpointer:
        graph_with_mongo = create_chat_graph(checkpointer=checkpointer)

        while True:
            user_input = input(">> ")
            for event in graph_with_mongo.stream({"messages": [{"role": "user", "content": user_input}]}, config=config, stream_mode="values"):
                if "messages" in event:
                    event["messages"][-1].pretty_print()

init()

# Human in the Loop: It pause execution at certain steps and wait for human input — like approval, editing, or selecting an option — before continuing.
# https://langchain-ai.github.io/langgraph/tutorials/introduction/#part-4-human-in-the-loop

# now we build a tool that connect to support team if ai not reslove the issue of user and by doing this small project we will understand the Human-in-the-loop concept
#  The tool is in graph.py which is 'human_assistance_tool()'


# invoke(): Runs the graph all at once and returns the final result (like calling a function and getting the answer).

# stream(): Runs the graph step-by-step, yielding outputs as each node runs — useful for streaming responses (like live chat or showing partial results).