from agents import Agent, Runner
import nest_asyncio

nest_asyncio.apply()

agent = Agent(name="Assistant", instructions="You are a helpful assistant")

result = Runner.run_sync(agent, "Write a haiku about recursion in programming.")
print(result.final_output)
