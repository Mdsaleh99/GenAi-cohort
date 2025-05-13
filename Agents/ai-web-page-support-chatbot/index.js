import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import dotenv from "dotenv";
import { ChromaClient } from "chromadb";

dotenv.config();

const client = new OpenAI();
const chromaClient = new ChromaClient({
    path: "http://localhost:8000",
});
chromaClient.heartbeat()

const WEB_COLLECTION = 'WEB-SCRAPED_DATA_COLLECTION-1'

// https://www.trychroma.com/
// https://www.npmjs.com/package/cheerio

async function scrapeWebPage(url = "") {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const pageHead = $("head").html();
    const pageBody = $("body").html();

    //   console.log({ pageHead });
    //   console.log({ pageBody });
    const externalLinks = new Set()
    const internalLinks = new Set()

    $("a").each((_, el) => {
        const link = $(el).attr("href");
        // console.log(link);
        if (link === "/") return;
        if (
            link.startsWith("http") ||
            link.startsWith("https") ||
            link.startsWith("#_top")
        ) {
            externalLinks.add(link);
        } else {
            internalLinks.add(link);
        }
    });
    // console.log(internalLinks);
    
    return { head: pageHead, body: pageBody, internalLinks: Array.from(internalLinks), externalLinks: Array.from(externalLinks) };
}

async function generateVectorEmbeddings({ text }) {
    const embeddings = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float",
    });

    return embeddings.data[0].embedding
}

async function insertIntoDB({ embedding, url, body = '', head }) {
    const collection = await chromaClient.getOrCreateCollection({
        name: WEB_COLLECTION,
    });

    await collection.add({
        ids: url,
        embeddings: [embedding],
        metadatas: [{ url, body, head }],
    });
}


async function injest(url = "") {
    // this function takes url and scrape the webpage recursively and make vector embeddings and store in to chroma DB
    console.log(`✨ Ingesting ${url}`);
    const { head, body, internalLinks } = await scrapeWebPage(url);
    const bodyChunks = chunkText(body, 1000);

    // const headEmbeddings = await generateVectorEmbeddings({ text: head });
    // await insertIntoDB({ embedding: headEmbeddings, url})
    for (const chunk of bodyChunks) {
        const bodyEmbeddings = await generateVectorEmbeddings({ text: chunk });
        await insertIntoDB({embedding: bodyEmbeddings, url, head, body: chunk})
    }

    for (const link of internalLinks) {
        const _url = `${url}${link}`
        await injest(_url)
    }

    console.log(`🚀 Ingesting Success ${url}`);
}

scrapeWebPage("https://chaidocs.vercel.app/getting-started/").then(console.log);

// injest("https://chaidocs.vercel.app");


async function chat(question = '') {
    const questionEmbedding = await generateVectorEmbeddings({ text: question })
    const collection = await chromaClient.getOrCreateCollection({
        name: WEB_COLLECTION,
    });

    const collectionResult = await collection.query({
        nResults: 3,
        queryEmbeddings: questionEmbedding
    })

    const body = collectionResult.metadatas[0].map((e) => e.body).filter((e) => e.trim() !== '' && !!e)
    const url = collectionResult.metadatas[0].map((e) => e.url).filter((e) => e.trim() !== '' && !!e)
    console.log(body);
    console.log(url);
    
    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are an AI support agent expert in providing support to users on behalf of a webpage. Given the context about page content, reply to the user accordingly.' },
            {
                role: 'user', content: `
                    Query: ${question}\n\n
                    URL: ${url.join(',')}
                    Retrived Context: ${body.join(',')}
                `
            }
        ]
    })
    console.log({
        message: `🤖: ${response.choices[0].message.content}`,
        url: url[0]
    });
    
}

function chunkText(text, chunkSize) {
    // this function helps to do chunks of text because openai embedding model can not take huge content the limit is 8191
    if (!text || chunkSize <= 0) return [];

    const words = text.split(/\s+/); // Split text into words (tokens)
    const chunks = [];

    for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(""));
    }

    return chunks;
}
