from openai import OpenAI

client = OpenAI()

"""
https://platform.openai.com/docs/api-reference/responses
"""

# --------------------------------------------------------------
# Basic text example with the Chat Completions API
# --------------------------------------------------------------

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "user",
            "content": "Write a one-sentence bedtime story about a unicorn.",
        }
    ],
)

print(response.choices[0].message.content)


# --------------------------------------------------------------
# Basic text example with the Responses API
# --------------------------------------------------------------

response = client.responses.create(
    model="gpt-4o", input="Write a one-sentence bedtime story about a unicorn."
)

print(response.output_text)

# --------------------------------------------------------------
# Image example
# --------------------------------------------------------------

response = client.responses.create(
    model="gpt-4o",
    input=[
        {"role": "user", "content": "what teams are playing in this image?"},
        {
            "role": "user",
            "content": [
                {
                    "type": "input_image",
                    "image_url": "https://upload.wikimedia.org/wikipedia/commons/3/3b/LeBron_James_Layup_%28Cleveland_vs_Brooklyn_2018%29.jpg",
                }
            ],
        },
    ],
)

print(response.output_text)

# --------------------------------------------------------------
# Streaming
# --------------------------------------------------------------

stream = client.responses.create(
    model="gpt-4o",
    input="Say 'double bubble bath' ten times fast.",
    stream=True,
)

# Store chunks in a list
text_chunks = []

for event in stream:
    if hasattr(event, "type") and "text.delta" in event.type:
        text_chunks.append(event.delta)
        print(event.delta, end="", flush=True)
