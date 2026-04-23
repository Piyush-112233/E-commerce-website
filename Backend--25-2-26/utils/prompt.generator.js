// import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
// import fs from 'fs';

// const prompt = ChatPromptTemplate.fromMessages([
//     ["system", "You are the Masters AI Support Assistant. Use the following context to answer the user's question:\n\n{context}\n\nAlways format your responses properly using Markdown. Use bolding for emphasis, bullet points for lists, and break down complex concepts into easy-to-read headers. Be precise, professional, and helpful."],
//     new MessagesPlaceholder("chat_history"),
//     ["human", "{input}"]
// ]);

// const rephrasePrompt = ChatPromptTemplate.fromMessages([
//     ["system", `You are a search query generator. Given the conversation history and a follow-up user input, your task is to rephrase the follow-up input into a precise standalone search query.
//         CRITICAL RULES:
//         1. ONLY output the final rephrased query string.
//         2. DO NOT add any conversational text, explanations, or greetings.
//         3. If the input is just a number (like "1"), look at the history to determine what "1" refers to and generate a query for it.`],
//     new MessagesPlaceholder("chat_history"),
//     ["human", "{input}"]
// ]);
// const data = {
//     prompt: prompt.messages,
//     rephrasePrompt: rephrasePrompt.messages
// };

// fs.writeFileSync('prompt.json', JSON.stringify(data, null, 2));