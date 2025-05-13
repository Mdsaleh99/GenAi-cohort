import { eq, ilike } from "drizzle-orm";
import { db } from "./db/index.js";
import { todosTable } from "./db/schema.js";
import OpenAI from "openai";
import dotenv from "dotenv";
import readlineSync  from "readline-sync"
dotenv.config();

const client = new OpenAI();

// Tools
async function getAllTodos() {
    const todos = db.select().from(todosTable);
    return todos;
}

async function createTodo(todo) {
    const [result] = await db.insert(todosTable).values({ todo }).returning({
        id: todosTable.id,
    });

    return result.id;
}

async function searchTodo(search) {
    const todos = await db
        .select()
        .from(todosTable)
        .where(ilike(todosTable.todo, `%${search}%`));
    return todos;
}

// searchTodo('video').then(console.log)

async function deleteTodoById(id) {
    await db.delete(todosTable).where(eq(todosTable.id, id));
}


const tools = {
    getAllTodos: getAllTodos,
    createTodo: createTodo,
    deleteTodoById: deleteTodoById,
    searchTodo: searchTodo
}


const SYSTEM_PROMPT = `
    You are an AI To-Do List Assistant with START, PLAN, ACTION, Obeservation and Output State. Wait for the user prompt and first PLAN using available tools.
    After Planning, Take the action with appropriate tools and wait for Observation based on Action. Once you get the observations, Return the AI response based on START propmt and observations

    You can manage tasks by adding, viewing, updating, and deleting
    You must strictly follow the JSON output format.

    Todo DB Schema:
    id: Int and primary key
    todo: String
    created_at: Date Time
    updated_at: Date Time

    Available Tools:
    - getAllTodos(): Return all the todos from the database
    - createTodo(todo: string): Creates a new Todo in the database and takes todo as a string and returns the ID of created todo
    - deleteTodoById(id: string): Deletes the todo by ID given in the db
    - searchTodo(query: string): Searches for all todos matching the query string using ilike operator

    Example:
    START
    { "type": "user", "user": "Add a task for shopping groceries." }
    { "type": "plan", "plan": "I will try to get more context on what user needs to shop." }
    { "type": "output", "output": "Can you tell me what all items you want to shop for?" }
    { "type": "user", "user": "I want to shop for milk, kurkure, layes and choco" }
    { "type": "plan", "plan": "I will use createTodo to create a new Todo in DB." }
    { "type": "action", "function": "createTodo", "input": "Shopping for milk, kurkure, layes and choco" }
    { "type": "observation", "observation": "2" }
    { "type": "output", "output": "your todo has been added successfully" }
`;

const messages = [{ role: "system", content: SYSTEM_PROMPT }]

while (true) {
    const query = readlineSync.question(">> ")
    const userMessage = {
        type: 'user',
        user: query
    }
    messages.push({ role: "user", content: JSON.stringify(userMessage) })
    
    while (true) {
        const chat = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            response_format: { type: 'json_object' }
        })
        const result = chat.choices[0].message.content
        messages.push({ role: "assistant", content: result })

        console.log(`\n\n ------------- START AI -------------`);
        console.log(result)
        console.log(`------------- END AI ------------- \n\n`);
        
        
        const action = JSON.parse(result)
        if (action.type === 'output') {
            console.log(`🤖: ${action.output}`);
            break
        } else if (action.type === 'action') {
            const fn = tools[action.function]
            if (!fn) throw new Error("Invalid Tool call")
            const observation = await fn(action.input)
            const observationMessage = {
                type: 'observation',
                observation: observation
            }
            messages.push({role: "developer", content: JSON.stringify(observationMessage)})
        }
    }

}