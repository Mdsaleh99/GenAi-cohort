import readline from 'node:readline/promises';
import { writeFileSync } from 'node:fs';
import { graph } from './agent';
import { Command } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';

/**
 * Print the graph (Optional)
 */

const representation = await graph.getGraphAsync();
const graphStateImage = await representation.drawMermaidPng();

const graphStateArrayBuffer = await graphStateImage.arrayBuffer();

const filePath = './graphState.png';
writeFileSync(filePath, new Uint8Array(graphStateArrayBuffer));

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

while (true) {
    const input = await rl.question('User: ');

    if (input === 'bye') {
        console.log('See you soon!');
        break;
    }

    const state = await graph.stream(
        { messages: [new HumanMessage(input)] },
        { configurable: { thread_id: '1' }, streamMode: 'updates' }
    );

    for await (const value of state) {
        console.log('---STEP---');
        console.log(value);
        console.log('---END STEP---');
    }
}

rl.close();
