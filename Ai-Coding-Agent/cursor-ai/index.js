import { OpenAI } from "openai";
import dotenv from "dotenv";
import {exec} from "node:child_process"

dotenv.config();

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

function getWeatherInfo(cityName) {
    return `${cityName} has 43 degree C`;
}

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, function (error, stdout, stderr) {
            if (error) {
                return reject(error)
            }

            resolve(`stdout: ${stdout}\n${stderr}`)
        })
    })
}

const TOOLS_MAP = {
    getWeatherInfo: getWeatherInfo,
    executeCommand: executeCommand
}

const SYSTEM_PROMPT = `
    You are an helfull AI Assistant who is designed to resolve user query.
    You work on START, THINK, ACTION, OBSERVE and OUTPUT Mode.

    In the start phase, user gives a query to you.
    Then, you THINK how to resolve that query atleast 3-4 times and make sure that all is clear. If there is a need to call a tool, you call an ACTION event with tool and input parameters. If there is an action call, wait for the OBSERVE that is output of the tool.
    Based on the OBSERVE from prev step, you either output or repeat the loop.

    Rules:
    - Always wait for next step.
    - Always output a single step and wait for the next step.
    - Output must be strictly JSON
    - Only call tool action from Available tools only.
    - Strictly follow the output format in JSON
    
    Available Tools:
    - executeCommand(command): string Executes a given linux command on user's device and returns the STDOUT and STDERR
    - getWeatherInfo(city: string): string

    Example:
    START: What is weather of Patiala?
    THINK: The user is asking for the weather of Patiala.
    THINK: From the available tools, I must call getWeatherInfo tool for patiala as input
    ACTION: Call Tool getWeatherInfo (patiala)
    OBSERVE: 32 Degree C
    THINK: The output of getWeatherInfo for patiala is 32 Degree C
    OUTPUT: Hey, The weather of Patiala is 32 Degree C which is quite hot

    Output Example:
    { "role": "user", "content": "What is weather of Patiala?" }
    { "step": "think": "content": "The user is asking for the weather of Patiala." }
    { "step": "think": "content": "From the available tools, I must call getWeatherInfo tool for patiala as input }
    { "step": "action": "tool": "getWeatherInfo", "input": "Patiala" }
    { "step": "observe": "content": "32 Degree C" }
    { "step": "think": "content": "The output of getWeatherInfo for patiala is 32 Degree C" }
    { "step": "output": "content": "Hey, The weather of Patiala is 32 Degree C which is quite hot" }

    Output Format:
    { "step": "string", "tool": "string", "input": "string", "content": "string" }
`;

// here we use LLM as brain which give a signal for which tool should use (function), execution of that tool is our responsibility


async function init() {
    const messages = [{ role: "system", content: SYSTEM_PROMPT }];

    const userQuery = "create a new folder todo";
    messages.push({ role: "user", content: userQuery });

    while (true) {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: messages,
        });

        messages.push({
            role: "assistant",
            content: response.choices[0].message.content,
        });

        const parsedResponse = JSON.parse(response.choices[0].message.content);

        if (parsedResponse.step && parsedResponse.step === "think") {
            console.log(`🧠: ${parsedResponse.content}`);
            continue;
        }

        if (parsedResponse.step && parsedResponse.step === "output") {
            console.log(`🤖: ${parsedResponse.content}`);
            break;
        }

        if (parsedResponse.step && parsedResponse.step === "action") {
            const tool = parsedResponse.tool;
            const input = parsedResponse.input;

            const value = await TOOLS_MAP[tool](input); // tools map se tool ko leke aao and usko call karo for that particular input, and jo return hoga uss tool function se oh value varible me aajayega

            console.log(`🛠: Tool Call ${tool}: (${input}): ${value}`);

            messages.push({
                role: "assistant",
                content: JSON.stringify({ step: "observe", content: value }),
            });

            continue;
        }
    }
}

init();














// async function init() {
//     const response = await client.chat.completions.create({
//         model: "gpt-4o-mini",
//         response_format: {type: 'json_object'},
//         messages: [
//             {role: "system", content: SYSTEM_PROMPT},
//             {role: "user", content: "what is weather of goa?"}
//         ]
//     })
//     console.log(response.choices[0].message.content);
//     // console.log(response.choices);
//     // console.log(response.choices[0].message);
    
// }

