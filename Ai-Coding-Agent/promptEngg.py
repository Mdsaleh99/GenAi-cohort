from dotenv import load_dotenv
import json
from openai import OpenAI
import requests
import os

load_dotenv()

client = OpenAI()

def search_google(query, num_results=5):
    search_api_key = os.environ.get("GOOGLE_SEARCH_KEY")
    search_engine_id = os.environ.get("GOOGLE_CX")

    print("🔨Tool called: search_google", query)

    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": search_api_key,
        "cx": search_engine_id,
        "q": query,
        "num": num_results
    }

    response = requests.get(url, params=params)
    data = response.json()

    results = []

    if "items" not in data:
        return "❌ No results found or error in API call"
    
    for item in data["items"]:
        title = item.get("title")
        snippet = item.get("snippet")
        link = item.get("link")
        results.append(f"- {title}\n  {snippet}\n  🔗 {link}")
    
    return "\n\n".join(results)


def get_weather(city):
    print("🔨Tool called: get_weather", city)
    url = f"https://wttr.in/{city}?format=%C+%t"
    response = requests.get(url)

    if response.status_code == 200:
        return f"The weather in {city} is {response.text}"
    return "Something went wrong"

def run_command(command):
    result = os.system(command=command)
    return result


available_tools = {
    "get_weather": {
        "fn": get_weather,
        "description": "Takes a city name as an input and returns the current weather for the city"
    },
    "run_command": {
        "fn": run_command,
        "description": "Takes a command to run on users system"
    },
    "search_google": {
        "fn": search_google,
        "description": "Takes a query and searches on internet and gets the results"
    }
}

system_prompt = f"""
    Hey, you are an helpful AI assistant who is specialized in resolving user queries.
    You work on start, plan, action and observe modes.
    For the given user query and available tools, plan the step by step execution based on planning,
    select a relevant tool from the available tools, and based on the tool selection you perform an action to call the tool.
    Wait for the observation and based on it from the tool cal the user query.
    If you see the query is about current events going on, trending topics in the world, or anything time-sensitive, prefer using `search_google`.


    Rules:
    - Follow the output JSON format
    - Always perform one step at a time and wait for the next input
    - Carefully analyze the user query

    Output JSON format: 
    {{
        "step": "string",
        "content": "string",
        "function": "The name of the function if the step is function",
        "input": "The input parameter for the function",
    }}

    Available tools: 
    - get_weather: Takes a city name as an input and returns the current weather for the city
    - run_command: Takes a command to run on users system
    - search_google: Takes a query and searches on internet and gets the top 5 results

    Example: 
        User query: What is the weather of chicago?
        Output: {{ "step": "plan", "content": "The user is interested in the weather of chicago" }}
        Output: {{ "step": "plan", "content": "From the available tools i should call the get_weather" }}
        Output: {{ "step": "action", "function": "get_weather", "input": "chicago" }}
        Output: {{ "step": "observe", "output": "12 degree celsius" }}
        Output: {{ "step": "output", "content": "The weather for chicago is 12 degree celsius" }}
"""


messages = [
    {"role": "system", "content": system_prompt},
]
while True: 
    user_query = input("> ")
    messages.append({"role": "user", "content": user_query})

    while True: 
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=messages
        )

        parsed_output = json.loads(response.choices[0].message.content)
        messages.append({"role": "assistant", "content": json.dumps(parsed_output)})

        if parsed_output.get("step") == "plan":
            print(f"🧠: {parsed_output.get('content')}")
            continue

        if parsed_output.get("step") == "action":
            tool_name =  parsed_output.get("function")
            tool_input = parsed_output.get("input")

            if available_tools.get(tool_name, False) != False: 
                output = available_tools[tool_name].get("fn")(tool_input)
                messages.append({ "role": "assistant", "content": json.dumps({"step": "observe", "output": output}) })
                continue

        if parsed_output.get("step") == "output":
            print(f"🤖: {parsed_output.get('content')}")
            break

