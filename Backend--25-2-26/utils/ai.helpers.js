import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import mongoose from "mongoose";
import crypto from "node:crypto";

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



const cosineSimilarity = (a = [], b = []) => {
    if (!a.length || !b.length || a.length !== b.length) return -1;

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i += 1) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }

    if (magA === 0 || magB === 0) return -1;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};
// console.log("1")


// Making collection in MongoDB
const getChunksCollection = () => mongoose.connection.collection("ai_document_chunks");

// Multiple source URLs are now supported from environment list.
const getKnowledgeSources = () => {
    const defaultSource = "https://dummyjson.com/products";
    const sourceList = String(process.env.AI_SOURCE_URLS || defaultSource)
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean);

    return [...new Set(sourceList)];
};

// All configured sources are loaded, then push doc into loadedDocs
const loadDocumentsFromSources = async (sources) => {
    const loadedDocs = [];

    for (const source of sources) {
        try {
            const loader = new CheerioWebBaseLoader(source);
            const docs = await loader.load();

            for (const doc of docs) {
                doc.pageContent = normalizeChunkText(doc.pageContent);
                doc.metadata = {
                    ...(doc.metadata || {}),
                    source,
                };
                loadedDocs.push(doc);
            }
        } catch (error) {
            console.error(`Failed to load source: ${source}`, error.message);
        }
    }

    return loadedDocs;
};

//Upsert logic so chunks are stored with hash-based identity (no duplicate inserts for same chunk).
const upsertChunksInMongo = async ({ splitDocs, embeddings }) => {
    const collection = getChunksCollection();

    // Existing chunks are skipped using hash identity, so only new chunks are embedded.
    const docsWithHash = splitDocs.map((doc, idx) => {
        const source = doc.metadata?.source || "unknown";
        const content = doc.pageContent;
        const chunkHash = crypto.createHash("sha256").update(`${source}:${idx}:${content}`).digest("hex");

        return {
            source,
            content,
            chunkIndex: idx,
            chunkHash,
        };
    });

    const hashes = docsWithHash.map((doc) => doc.chunkHash);
    const existing = await collection.find(
        { chunkHash: { $in: hashes } },
        { projection: { _id: 0, chunkHash: 1 } }
    ).toArray();

    const existingHashes = new Set(existing.map((doc) => doc.chunkHash));
    const toInsert = docsWithHash.filter((doc) => !existingHashes.has(doc.chunkHash));

    if (toInsert.length === 0) {
        return { insertedCount: 0, skippedCount: docsWithHash.length };
    }

    const vectors = await embeddings.embedDocuments(toInsert.map((doc) => doc.content));

    const bulkOps = toInsert.map((doc, idx) => {

        return {
            updateOne: {
                filter: { chunkHash: doc.chunkHash },
                update: {
                    $set: {
                        source: doc.source,
                        chunkIndex: doc.chunkIndex,
                        content: doc.content,
                        embedding: vectors[idx],
                        updatedAt: new Date(),
                    },
                },
                upsert: true,
            },
        };
    });
    console.log(bulkOps);


    if (bulkOps.length > 0) {
        await collection.bulkWrite(bulkOps, { ordered: false });
    }

    return {
        insertedCount: toInsert.length,
        skippedCount: docsWithHash.length - toInsert.length,
    };
};
// console.log(upsertChunksInMongo);


// Retrieval now reads from DB:
//First tries Atlas native vector search via $vectorSearch (if vector index exists).
//If unavailable, falls back to cosine similarity ranking in Node on stored embeddings.
const retrieveRelevantChunks = async ({ query, embeddings, k, sources = [] }) => {
    const collection = getChunksCollection();
    const queryVector = await embeddings.embedQuery(query);
    const vectorIndexName = process.env.MONGODB_VECTOR_INDEX || "ai_chunks_vector_index";
    //Retrieval now searches across all configured sources.
    const sourceFilter = sources.length ? { source: { $in: sources } } : {};

    // Prefer Atlas vector search if index exists; fallback to JS cosine ranking.
    try {
        const pipeline = [
            {
                $vectorSearch: {
                    index: vectorIndexName,
                    path: "embedding",
                    queryVector,
                    numCandidates: Math.max(20, k * 8),
                    limit: k,
                    ...(sources.length ? { filter: sourceFilter } : {}),
                },
            },
            {
                $project: {
                    _id: 0,
                    content: 1,
                    score: { $meta: "vectorSearchScore" },
                },
            },
        ];

        const results = await collection.aggregate(pipeline).toArray();
        if (results.length > 0) {
            return results.map((item) => item.content);
        }
    } catch (_error) {
        // Ignore and use fallback below.
    }

    const docs = await collection.find(
        sourceFilter,
        { projection: { _id: 0, content: 1, embedding: 1 } }
    ).toArray();

    const ranked = docs
        .map((doc) => ({
            content: doc.content,
            score: cosineSimilarity(queryVector, doc.embedding),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map((doc) => doc.content);

    return ranked;
};
// console.log(retrieveRelevantChunks);



export const createVectorStore = async () => {
    console.log("--- Initializing Persistent Vector Store (MongoDB) ---");
    const sources = getKnowledgeSources();
    const docs = await loadDocumentsFromSources(sources);

    if (!docs.length) {
        throw new Error("No documents loaded from configured AI_SOURCE_URLS");
    }

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 600, chunkOverlap: 80 });
    const splitDocs = (await splitter.splitDocuments(docs)).filter((doc) => {
        doc.pageContent = normalizeChunkText(doc.pageContent);
        return doc.pageContent.length > 0;
    });

    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        model: "gemini-embedding-001",
    });

    const collection = getChunksCollection();
    await collection.createIndex({ chunkHash: 1 }, { unique: true });
    await collection.createIndex({ source: 1, chunkIndex: 1 });

    //Rebuild still works if you want to force re-embedding.
    const shouldRebuild = String(process.env.AI_REBUILD_EMBEDDINGS || "false").toLowerCase() === "true";
    const existingCount = await collection.countDocuments({ source: { $in: sources } });

    if (shouldRebuild) {
        await collection.deleteMany({ source: { $in: sources } });
    }

    if (existingCount === 0 || shouldRebuild) {
        if (shouldRebuild) {
            console.log("--- Existing embeddings deleted for rebuild ---");
        }

        const result = await upsertChunksInMongo({ splitDocs, embeddings });
        console.log(`--- SUCCESS: Stored ${result.insertedCount} embedded chunks in MongoDB ---`);
        if (result.skippedCount > 0) {
            console.log(`--- Skipped ${result.skippedCount} existing chunks ---`);
        }
    } else {
        const result = await upsertChunksInMongo({ splitDocs, embeddings });
        console.log(`--- Reusing ${existingCount} existing embedded chunks from MongoDB ---`);
        if (result.insertedCount > 0) {
            console.log(`--- Added ${result.insertedCount} new chunks from newly configured sources ---`);
        }
    }

    return {
        embeddings,
        sources,
    };
}

export const createStreamingChain = (vectorStore) => {
    const model = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        streaming: true,
    });

    const retrievalK = Number(process.env.AI_RETRIEVAL_K || 4);

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", "You are the Masters AI Support Assistant. Use the following context to answer the user's question:\n\n{context}\n\nAlways format your responses properly using Markdown. Use bolding for emphasis, bullet points for lists, and break down complex concepts into easy-to-read headers. Be precise, professional, and helpful."],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"]
    ]);

    const rephrasePrompt = ChatPromptTemplate.fromMessages([
        ["system", `You are a search query generator. Given the conversation history and a follow-up user input, your task is to rephrase the follow-up input into a precise standalone search query.
        CRITICAL RULES:
        1. ONLY output the final rephrased query string.
        2. DO NOT add any conversational text, explanations, or greetings.
        3. If the input is just a number (like "1"), look at the history to determine what "1" refers to and generate a query for it.`],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"]
    ]);

    const standaloneQuestionChain = rephrasePrompt.pipe(model).pipe(new StringOutputParser());

    const chain = RunnableSequence.from([
        // Step 1: Rephrase the question using history
        {
            standalone_question: async (input) => {
                // If we have history, rephrase the question. If not, just use the input.
                if (input.chat_history && input.chat_history.length > 0) {
                    const rephrased = await standaloneQuestionChain.invoke({
                        input: input.input,
                        chat_history: input.chat_history,
                    });
                    console.log("Original:", input.input, "--> Rephrased:", rephrased);
                    return rephrased;
                }
                return input.input;
            },

            // pass the other variables along
            input: (input) => input.input,

            chat_history: (input) => input.chat_history,
        },
        // Step 2: Use the REPHRASED question to search the database
        {
            // A. Generate the context using the standalone question
            context: async (input) => {
                const relevantChunks = await retrieveRelevantChunks({
                    query: input.standalone_question,
                    embeddings: vectorStore.embeddings,
                    k: retrievalK,
                    sources: vectorStore.sources,
                });

                return relevantChunks.join("\n\n");
            },
            // B. CAREFUL: You MUST pass the original input forward to the prompt!
            input: (input) => input.input,
            // C. CAREFUL: You MUST pass the history forward to the prompt!
            chat_history: (input) => input.chat_history,
        },
        // Step 3: Now generate the final answer with context, history, and original input
        prompt,
        model,
        new StringOutputParser(),
    ]);
    
    //AI says: "1. NextJS, 2. React, 3. Vue"
    //You say: "Tell me more about point 2"
    //Step 1 (Rephrase) sees history and changes it to: "Tell me more about React."
    //Step 2 (Retriever) searches the vector DB for: "Tell me more about React." (Which successfully finds the data!)
    //Step 3 (Answer) runs your prompt and streams the accurate response to your Angular app.

    return chain;
}
