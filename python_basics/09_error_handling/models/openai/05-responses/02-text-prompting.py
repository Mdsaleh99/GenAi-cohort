from openai import OpenAI

client = OpenAI()

"""
Model spec: https://model-spec.openai.com/2025-02-12.html
Dashboard: https://platform.openai.com/logs?api=responses
"""

# --------------------------------------------------------------
# Introducing instructions
# --------------------------------------------------------------

"""
Inputs can now be a single string or a list of messages.

The list of roles can now be:
- system
- developer
- user
- assistant
"""

response = client.responses.create(
    model="gpt-4o",
    instructions="Talk like a pirate.",
    input="Are semicolons optional in JavaScript?",
)

print(response.output_text)


# --------------------------------------------------------------
# Which would be similar to:
# --------------------------------------------------------------

response = client.responses.create(
    model="gpt-4o",
    input=[
        {"role": "developer", "content": "Talk like a pirate."},
        {"role": "user", "content": "Are semicolons optional in JavaScript?"},
    ],
)

print(response.output_text)

# --------------------------------------------------------------
# The chain of command (hierarchical instructions)
# --------------------------------------------------------------

"""
https://model-spec.openai.com/2025-02-12.html#chain_of_command
"""

response = client.responses.create(
    model="gpt-4o",
    input=[
        {"role": "system", "content": "Talk like a pirate."},
        {"role": "developer", "content": "don't talk like a pirate."},
        {"role": "user", "content": "Are semicolons optional in JavaScript?"},
    ],
)

print(response.output_text)  # talks like a pirate

response = client.responses.create(
    model="gpt-4o",
    input=[
        {"role": "system", "content": "Don't talk like a pirate."},
        {"role": "developer", "content": "Talk like a pirate."},
        {"role": "user", "content": "Are semicolons optional in JavaScript?"},
    ],
)

print(response.output_text)  # doesn't talk like a pirate
