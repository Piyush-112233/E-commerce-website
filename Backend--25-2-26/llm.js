import dotenv from 'dotenv';
dotenv.config();
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChatGroq } from '@langchain/groq';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StringOutputParser, CommaSeparatedListOutputParser, StructuredOutputParser } from '@langchain/core/output_parsers';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

const normalizeChunkText = (text) => {
    if (typeof text !== "string") return "";

    return text
        .replace(/\r\n/g, "\n")
        .replace(/\u00a0/g, " ")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s{2,}/g, " ")
        .trim();
};

// Create prompt Template
// const myprompt = new PromptTemplate({
//     template: "You are a branding expert. Suggest a catchy company name for {product1} and {product2}.",
//     inputVariables: ["product1", "product2"],
// });

// const formattedPrompt = await myprompt.format({
//     'product1': 'socks',
//     'product2': 'shoes',
// });

// console.log(myprompt);
// console.log("--- 1. PROMPT PREPARED ---");
// console.log(formattedPrompt);



// Create Model
// const model = new ChatGroq({
//     apiKey: process.env.GROQ_API_KEY,
//     model: 'llama-3.1-8b-instant', // Correct lowercase ID
//     temperature: 0.7,
// });


// console.log("\n--- 2. SENDING TO AI ---");

// try {
//     const res = await model.invoke(formattedPrompt);
//     console.log("--- 3. AI RESPONSE ---");
//     console.log(res.content);
// } catch (error) {
//     console.error("--- ERROR ---");
//     console.error(error.message);
// }


//Ai and human
// const initialConversations = [
//     new AIMessage("You are a teacher But answer in a funny way ?"),
//     new HumanMessage("My name is Piyush")
// ];

// const res = await model.invoke(initialConversations);
// console.log(">AI:", res.content);

// const initialConversations2 = [new HumanMessage("Tell me What's my name ?")]

// const res2 = await model.invoke(initialConversations2);
// console.log(res2.content);


// Setup Initial Prompt with context support
// const chatPrompt = ChatPromptTemplate.fromMessages([
//     ["system", "You are a helpful assistant. Use the following context to answer the user's question:\n\n{context}"],
//     ["human", "{input}"]
// ]);


// Create Conversation Chain
// const chain = chatPrompt.pipe(model);


// load data from wenpage
// const loader = new CheerioWebBaseLoader(
//     "https://blog.langchain.com/langchain-expression-language/"
// );
// const docs = await loader.load();


// // Text Splitter
// const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
// const splitDocuments = await splitter.splitDocuments(docs);
// console.log(splitDocuments)


// const embeddings = new GoogleGenerativeAIEmbeddings({
//     apiKey: process.env.GOOGLE_API_KEY, // Use the key from your .env file
//     model: "gemini-embedding-001",    // Verified correct model name
// });


// // MemoryVectorStore.fromDocuments is a static async method
// const vectorStore = await MemoryVectorStore.fromDocuments(
//     splitDocuments,
//     embeddings
// );



// const retriever = vectorStore.asRetriever({
//     k: 4, // Increased from 2 to 4 for better quality
// });

// // Implementation using LCEL (LangChain Expression Language)
// const retrievalChain = RunnableSequence.from([
//     {
//         context: async (input) => {
//             const relevantDocs = await retriever.invoke(input.input);
//             const contextText = relevantDocs.map(d => d.pageContent).join("\n\n");

//             console.log("Number of chunks found:", relevantDocs.length);
//             // DEBUG LOG: See what the AI is actually receiving
//             console.log("\n--- RETRIEVED CONTEXT ---");
//             console.log(contextText || "NO RELEVANT CONTEXT FOUND");
//             console.log("--------------------------\n");

//             return contextText;
//         },
//         input: (input) => input.input,
//     },
//     // DEBUG STEP: Log the prompt inputs (context + question)
//     (input) => {
//         console.log("\n--- 2. PROMPT INPUTS ---", input);
//         return input;
//     },
//     chain,
//     // DEBUG STEP: Log the model's raw output
//     (output) => {
//         console.log("\n--- 3. RAW MODEL OUTPUT ---", output?.content || output);
//         return output;
//     },
//     new StringOutputParser(),
//     // DEBUG STEP: Log the model's final output
//     (output) => {
//         console.log("\n--- 4. FINAL OUTPUT ---", output);
//         return output;
//     },
//     new CommaSeparatedListOutputParser(),
//     (output) => {
//         console.log("\n--- 5. FINAL OUTPUT ---", output);
//         return output;
//     },
// ]);





// Load Data and Create vectorStore
const createVectorStore = async () => {
    const loader = new CheerioWebBaseLoader(
        "https://blog.langchain.com/langchain-expression-language/"
    );
    const docs = await loader.load();
    docs.forEach((doc) => {
        doc.pageContent = normalizeChunkText(doc.pageContent);
    });


    // Text Splitter
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 600, chunkOverlap: 80 });
    let splitDocuments = await splitter.splitDocuments(docs);
    splitDocuments.forEach((doc) => {
        doc.pageContent = normalizeChunkText(doc.pageContent);
    });
    splitDocuments = splitDocuments.filter((doc) => doc.pageContent.length > 0);

    const chunksText = splitDocuments.map((doc) => doc.pageContent);
    console.log(chunksText);


    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY, // Use the key from your .env file
        model: "gemini-embedding-001",    // Verified correct model name
    });
    console.log("--- Starting to embed documents... ---");

    // MemoryVectorStore.fromDocuments is a static async method
    const vectorStore = await MemoryVectorStore.fromDocuments(
        splitDocuments,
        embeddings
    );
    console.log("--- SUCCESS: Documents embedded and stored! ---", vectorStore.memoryVectors[0].embedding);

    return vectorStore
}


// Create Retrieval Chain
const createChain = async (vectorStore) => {
    const model = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama-3.1-8b-instant', // Correct lowercase ID
        temperature: 0.7,
    });

    const chatPrompt = ChatPromptTemplate.fromMessages([
        ["system", "You are a helpful assistant. Use the following context to answer the user's question:\n\n{context}"],
        new MessagesPlaceholder("chat_History"),
        ["human", "{input}"],
        // ["chatHistory", "{chat_History}"]
    ]);

    const chain = chatPrompt.pipe(model);

    const retriever = vectorStore.asRetriever({
        k: 4, // Increased from 2 to 4 for better quality
    });

    // 1. Rephrase Logic (The "History-Aware" part)
    const rephrasePrompt = ChatPromptTemplate.fromMessages([
        new MessagesPlaceholder("chat_History"),
        ["human", "{input}"],
        ["human", "Based on the conversation above, generate a concise search query to find relevant info for the question. Only output the query."],
    ]);

    const rephraseChain = rephrasePrompt.pipe(model).pipe(new StringOutputParser());

    // 2. The Retrieval Chain
    const retrievalChain = RunnableSequence.from([

        // Step 1: Rephrase question if history exists
        {
            standalone_question: async (input) => {
                if (input.chat_History && input.chat_History.length > 0) {
                    return rephraseChain.invoke(input);
                }
                return input.input;
            },
            input: (input) => input.input,
            chat_History: (input) => input.chat_History,
        },

        // Step 2: Retrieve Context + Preserve Input/History
        RunnablePassthrough.assign({
            context: async (input) => {
                const query = input.standalone_question;
                console.log(`\n--- REPHRASED SEARCH QUERY: "${query}" ---`);
                const relevantDocs = await retriever.invoke(query);
                return relevantDocs.map(d => d.pageContent).join("\n\n");
            },
        }),

        // Step 3: Final Prompt + Model
        chain.pipe(new StringOutputParser()),
        // (output) => {
        //     console.log("\n--- FINAL AI RESPONSE ---", output);
        //     return output;
        // },
    ]);

    return retrievalChain;

}

const vectorStore = await createVectorStore();
const chain = await createChain(vectorStore);

const chatHistory = [
    new HumanMessage("Hello"),
    new AIMessage("Hi, how can I help you ?"),
    new HumanMessage("My name is Piyush"),
    new AIMessage("Hi Piyush, how can I help you"),
    new HumanMessage("What is LCEL"),
    new AIMessage("LCEL stands for Langchain Expression Language"),
]

// Start Chatting
try {
    const response = await chain.invoke({
        input: "What is LCEL?",
        chat_History: chatHistory,
        // context: splitDocuments.slice(0, 5).map(d => d.pageContent).join("\n")
    });

    console.log("> AI:", response);
} catch (error) {
    console.error("Error:", error.message);
}
