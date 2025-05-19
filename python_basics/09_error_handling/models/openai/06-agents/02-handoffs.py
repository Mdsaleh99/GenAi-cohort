from agents import Agent, Runner
import asyncio
import nest_asyncio

nest_asyncio.apply()

tech_support_agent = Agent(
    name="Tech Support Agent",
    instructions="You handle technical issues with our product. Be concise and helpful.",
)

billing_agent = Agent(
    name="Billing Agent",
    instructions="You handle billing and payment inquiries. Be concise and helpful.",
)

triage_agent = Agent(
    name="Triage Agent",
    instructions="Analyze the customer ticket and handoff to the appropriate specialist agent.",
    handoffs=[tech_support_agent, billing_agent],
)


async def main():
    result = await Runner.run(
        triage_agent, input="My app keeps crashing when I try to open it."
    )
    print(result.final_output)


if __name__ == "__main__":
    asyncio.run(main())
