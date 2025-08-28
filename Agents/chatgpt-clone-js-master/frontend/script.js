const input = document.querySelector('#input');
const chatContainer = document.querySelector('#chat-container');
const askBtn = document.querySelector('#ask');

const threadId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

input?.addEventListener('keyup', handleEnter);
askBtn?.addEventListener('click', handleAsk);

const loading = document.createElement('div');
loading.className = 'my-6 animate-pulse';
loading.textContent = 'Thinking...';

async function generate(text) {
    /**
     * 1. append message to ui
     * 2. Send it to the LLM
     * 3. Append response to the ui
     */
    const msg = document.createElement('div');
    msg.className = `my-6 bg-neutral-800 p-3 rounded-xl ml-auto max-w-fit`;
    msg.textContent = text;
    chatContainer?.appendChild(msg);
    input.value = '';

    chatContainer?.appendChild(loading);

    // Call server

    const assistantMessage = await callServer(text);

    const assistantMsgElem = document.createElement('div');
    assistantMsgElem.className = `max-w-fit`;
    assistantMsgElem.textContent = assistantMessage;

    loading.remove();

    chatContainer?.appendChild(assistantMsgElem);
}

async function callServer(inputText) {
    const response = await fetch('http://localhost:3001/chat', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({ threadId: threadId, message: inputText }),
    });

    if (!response.ok) {
        throw new Error('Error generating the response.');
    }

    const result = await response.json();
    return result.message;
}

async function handleAsk(e) {
    const text = input?.value.trim();
    if (!text) {
        return;
    }

    await generate(text);
}

async function handleEnter(e) {
    if (e.key === 'Enter') {
        const text = input?.value.trim();
        if (!text) {
            return;
        }

        await generate(text);
    }
}
