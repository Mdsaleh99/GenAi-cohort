import { ChatTogetherAI } from '@langchain/community/chat_models/togetherai';

import {
    Annotation,
    interrupt,
    MemorySaver,
    MessagesAnnotation,
    NodeInterrupt,
    StateGraph,
} from '@langchain/langgraph';
import zodToJsonSchema from 'zod-to-json-schema';
import z from 'zod';

// import { ChatGroq } from '@langchain/groq';

const llm = new ChatTogetherAI({
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    temperature: 0,
});

// const llm = new ChatGroq({
//     apiKey: process.env.GROQ_API_KEY!,
//     model: 'llama-3.1-8b-instant',
//     temperature: 0,
// });

// const llm = new ChatOpenAI({ temperature: 0, model: 'gpt-4o' });

/**
 * Define root state type (StateAnnotation)
 */
const StateAnnotation = Annotation.Root({
    ...MessagesAnnotation.spec,
    nextRepresentative: Annotation<string>,
    refundAuthorized: Annotation<boolean>,
});

/**
 * Initial support person like secretary who handles first all incoming messages
 */
async function initialSupport(state: typeof StateAnnotation.State) {
    const SYSTEM_TEMPLATE = `You are frontline support staff for Coder's Gyan, a company that sells Web development courses.
Be concise in your responses.
You can chat with customers and help them with basic questions, but if the customer is having a billing or technical problem,
do not try to answer the question directly or gather information.
Instead, immediately transfer them to the billing or technical team by asking the user to hold for a moment.
Otherwise, just respond conversationally.`;

    const supportResponse = await llm.invoke([
        { role: 'system', content: SYSTEM_TEMPLATE },
        ...state.messages,
    ]);

    /**
     * Routing template
     */
    const CATEGORIZATION_SYSTEM_TEMPLATE = `You are an expert customer support routing system.
Your job is to detect whether a customer support representative is routing a user to a billing team or a technical team, or if they are just responding conversationally.`;

    const CATEGORIZATION_HUMAN_TEMPLATE = `The previous conversation is an interaction between a customer support representative and a user.
Extract whether the representative is routing the user to a billing or technical team, or whether they are just responding conversationally.
Respond with a JSON object containing a single key called "nextRepresentative" with one of the following values:

If they want to route the user to the billing team, respond only with the word "BILLING".
If they want to route the user to the technical team, respond only with the word "TECHNICAL".
Otherwise, respond only with the word "RESPOND".`;

    // Bind the schema to the model
    const modelWithStructure = llm.withStructuredOutput(
        zodToJsonSchema(
            z.object({
                nextRepresentative: z.enum(['BILLING', 'TECHNICAL', 'RESPOND']),
            })
        )
    );

    const response = await modelWithStructure.invoke([
        {
            role: 'system',
            content: CATEGORIZATION_SYSTEM_TEMPLATE,
        },
        ...state.messages,
        {
            role: 'user',
            content: CATEGORIZATION_HUMAN_TEMPLATE,
        },
    ]);

    // Note: no parsing required since using modelwithstructure...
    // const result = JSON.parse(response.content as string)

    return { messages: [supportResponse], nextRepresentative: response.nextRepresentative };
}

/**
 * Billing support node
 */
async function billingSupport(state: typeof StateAnnotation.State) {
    const SYSTEM_TEMPLATE = `You are an expert billing support specialist for Coder's Gyan, a company that sells Web development courses.
Help the user to the best of your ability, but be concise in your responses.
You have the ability to authorize refunds, which you can do by transferring the user to another agent who will collect the required information.
If you do, assume the other agent has all necessary information about the customer and their order.
You do not need to ask the user for more information.

Help the user to the best of your ability, but be concise in your responses.`;

    let trimmedHistory = state.messages;

    // Make the user's question the most recent message in the history.
    // This helps small models stay focused.
    if (trimmedHistory.at(-1)?.getType() === 'ai') {
        trimmedHistory = trimmedHistory.slice(0, -1);
    }

    const billingResponse = await llm.invoke([
        {
            role: 'system',
            content: SYSTEM_TEMPLATE,
        },
        ...trimmedHistory,
    ]);

    const CATEGORIZATION_SYSTEM_TEMPLATE = `Your job is to detect whether a billing support representative wants to refund the user.`;
    const CATEGORIZATION_HUMAN_TEMPLATE = `The following text is a response from a customer support representative.
Extract whether they want to refund the user or not.
Respond with a JSON object containing a single key called "nextRepresentative" with one of the following values:

If they want to refund the user, respond only with the word "REFUND".
Otherwise, respond only with the word "RESPOND".

Here is the text:

<text>
${billingResponse.content}
</text>.`;

    // Bind the schema to the model
    const modelWithStructure = llm.withStructuredOutput(
        zodToJsonSchema(
            z.object({
                nextRepresentative: z.enum(['REFUND', 'RESPOND']),
            })
        )
    );

    const categorizationalResponse = await modelWithStructure.invoke([
        {
            role: 'system',
            content: CATEGORIZATION_SYSTEM_TEMPLATE,
        },
        {
            role: 'user',
            content: CATEGORIZATION_HUMAN_TEMPLATE,
        },
    ]);

    // const result = JSON.parse(categorizationalResponse.content as string)

    return {
        messages: billingResponse,
        nextRepresentative: categorizationalResponse.nextRepresentative,
    };
}

/**
 * Technical support node
 */
async function technicalSupoort(state: typeof StateAnnotation.State) {
    const SYSTEM_TEMPLATE = `You are an expert at diagnosing technical computer issues. You work for a company called Coder's Gyan that sells Web development courses.
Help the user to the best of your ability, but be concise in your responses.`;

    let trimmedHistory = state.messages;

    if (trimmedHistory.at(-1)?.getType() === 'ai') {
        trimmedHistory = trimmedHistory.slice(0, -1);
    }

    const response = await llm.invoke([
        {
            role: 'system',
            content: SYSTEM_TEMPLATE,
        },
        ...trimmedHistory,
    ]);

    return { messages: response };
}

/**
 * Refund handling node
 */
async function handleRefund(state: typeof StateAnnotation.State) {
    let canRefund = state.refundAuthorized;

    if (!canRefund) {
        const answer = interrupt(`Human authorization required.`);
        console.log(`--- HUMAN AUTHORIZATION IS REQUIRED FOR REFUND ---`);
        // throw new NodeInterrupt('Human authorization required.');
        if (answer === 'yes') {
            canRefund = true;
        }
    }

    /**
     * Stubbed for now...
     * later we can call llm and tool to call refund api
     */
    return {
        messages: {
            role: 'assistant',
            content: 'Refund processed!',
        },
    };
}

/**
 * Build graph
 */
let builder = new StateGraph(StateAnnotation)
    .addNode('initial_support', initialSupport)
    .addNode('billing_support', billingSupport)
    .addNode('technical_support', technicalSupoort)
    .addNode('handle_refund', handleRefund)
    .addEdge('__start__', 'initial_support');

/**
 * Add edges
 */

builder = builder.addConditionalEdges(
    'initial_support',
    async (state: typeof StateAnnotation.State) => {
        if (state.nextRepresentative?.includes('BILLING')) {
            return 'billing';
        } else if (state.nextRepresentative?.includes('TECHNICAL')) {
            return 'technical';
        } else {
            return 'conversational';
        }
    },
    {
        billing: 'billing_support',
        technical: 'technical_support',
        conversational: '__end__',
    }
);

builder = builder.addEdge('handle_refund', '__end__');

/**
 * Add edge for technical support to always end
 */
builder = builder.addEdge('technical_support', '__end__');

/**
 * Add Conditional edge for billing support
 */

builder = builder.addConditionalEdges(
    'billing_support',
    async (state: typeof StateAnnotation.State) => {
        if (state.nextRepresentative.includes('REFUND')) {
            return 'refund';
        } else {
            return '__end__';
        }
    },
    {
        refund: 'handle_refund',
        __end__: '__end__',
    }
);

const checkpointer = new MemorySaver();

export const graph = builder.compile({ checkpointer });
