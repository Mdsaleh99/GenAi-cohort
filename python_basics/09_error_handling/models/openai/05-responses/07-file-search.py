import requests
from io import BytesIO
from openai import OpenAI
import textwrap

client = OpenAI()


"""
https://platform.openai.com/storage/files/
"""

# --------------------------------------------------------------
# Upload a file
# --------------------------------------------------------------


def create_file(client, file_path):
    if file_path.startswith("http://") or file_path.startswith("https://"):
        # Download the file content from the URL
        response = requests.get(file_path)
        file_content = BytesIO(response.content)
        file_name = file_path.split("/")[-1]
        file_tuple = (file_name, file_content)
        result = client.files.create(file=file_tuple, purpose="assistants")
    else:
        # Handle local file path
        with open(file_path, "rb") as file_content:
            result = client.files.create(file=file_content, purpose="assistants")
    print(result.id)
    return result.id


# Replace with your own file path or URL
file_id = create_file(client, "https://cdn.openai.com/API/docs/deep_research_blog.pdf")

# --------------------------------------------------------------
# Create a vector store
# --------------------------------------------------------------

"""
https://platform.openai.com/storage/vector_stores
Please be aware of costs!
"""

vector_store = client.vector_stores.create(name="knowledge_base")
print(vector_store.id)

# --------------------------------------------------------------
# Add a file to the vector store
# --------------------------------------------------------------

result = client.vector_stores.files.create(
    vector_store_id=vector_store.id, file_id=file_id
)
print(result)

# --------------------------------------------------------------
# Check status
# --------------------------------------------------------------

result = client.vector_stores.files.list(vector_store_id=vector_store.id)
print(result)

# --------------------------------------------------------------
# Use file search
# --------------------------------------------------------------

"""
At the moment, you can search in only one vector store at a time, 
so you can include only one vector store ID when calling the file search tool.
"""

response = client.responses.create(
    model="gpt-4o",
    input="What is deep research by OpenAI?",
    tools=[{"type": "file_search", "vector_store_ids": [vector_store.id]}],
)
print(response)
print(textwrap.fill(response.output_text, width=80))

# --------------------------------------------------------------
# Limit results
# --------------------------------------------------------------

response = client.responses.create(
    model="gpt-4o",
    input="What is deep research by OpenAI?",
    tools=[
        {
            "type": "file_search",
            "vector_store_ids": [vector_store.id],
            "max_num_results": 2,
        }
    ],
    include=["output[*].file_search_call.search_results"],
)
print(response.model_dump_json(indent=2))

# --------------------------------------------------------------
# Similarity search
# ----------------------§---------------------------------------


results = client.vector_stores.search(
    vector_store_id=vector_store.id,
    query="What is deep research by OpenAI?",
)

print(results.model_dump_json(indent=2))
