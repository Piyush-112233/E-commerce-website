import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import mongoose from "mongoose";
import crypto from "node:crypto";
import { getHardcodedKnowledgeDocuments } from "./knowledge.documents.js";

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

const normalizeType = (value) => {
    const lowered = String(value || "").toLowerCase().trim();
    if (lowered === "hardcoded") return "hardcoded";
    if (lowered === "web") return "web";
    return "unknown";
};

const inferDocTypeFromSource = (source = "") => {
    if (typeof source !== "string") return "unknown";
    if (source.startsWith("internal:")) return "hardcoded";
    if (/^https?:\/\//i.test(source)) return "web";
    return "unknown";
};

const detectRetrievalScope = (question = "") => {
    const text = String(question || "").toLowerCase();

    const asksWebsite = /\b(website|web\s?site|webpage|web\s?page|site|url|link from website|blog|article|langchain|source url|online content)\b/i.test(text);
    const asksHardcoded = /\b(hardcoded|hard\s?coded|internal|product info|policy|shipping|return|refund|support hours|lighter|cooler|marshall)\b/i.test(text);

    if (asksWebsite && !asksHardcoded) return "web";
    if (asksHardcoded && !asksWebsite) return "hardcoded";
    return "all";
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
// console.log("1",cosineSimilarity);


// Making collection in MongoDB
const getChunksCollection = () => mongoose.connection.collection("ai_document_chunks");

// Multiple source URLs are now supported from environment list.
const getKnowledgeSources = () => {
    // const defaultSource = "https://dummyjson.com/products";
    const raw = process.env.AI_SOURCE_URLS || "";
    const sourceList = raw
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
                    type: "web",
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
        const docType = normalizeType(doc.metadata?.type || inferDocTypeFromSource(source));
        const title = typeof doc.metadata?.title === "string" ? doc.metadata.title : "";
        const content = doc.pageContent;
        const chunkHash = crypto.createHash("sha256").update(`${source}:${idx}:${content}`).digest("hex");

        return {
            source,
            docType,
            title,
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
                        docType: doc.docType,
                        title: doc.title,
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
const retrieveRelevantChunks = async ({ query, embeddings, k, sources = [], docTypes = [] }) => {
    const collection = getChunksCollection();
    const queryVector = await embeddings.embedQuery(query);
    const vectorIndexName = process.env.MONGODB_VECTOR_INDEX || "ai_chunks_vector_index";
    const MIN_SIMILARITY = Number(process.env.AI_MIN_SIMILARITY || 0.35);

    const sourceFilter = sources.length ? { source: { $in: sources } } : {};
    const normalizedDocTypes = Array.isArray(docTypes)
        ? docTypes.map((item) => normalizeType(item)).filter((item) => item !== "unknown")
        : [];
    const typeFilter = normalizedDocTypes.length ? { docType: { $in: normalizedDocTypes } } : {};
    const combinedFilter = { ...sourceFilter, ...typeFilter };

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
                    ...(Object.keys(combinedFilter).length ? { filter: combinedFilter } : {}),
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
            return results
                .filter((item) => item.score >= MIN_SIMILARITY)
                .map((item) => ({ content: item.content, score: item.score }));
        }
        console.log(results)
    } catch (_error) {
        // Ignore and use fallback below.
    }

    const docs = await collection.find(
        combinedFilter,
        { projection: { _id: 0, content: 1, embedding: 1 } }
    ).toArray();

    const ranked = docs
        .map((doc) => ({
            content: doc.content,
            score: cosineSimilarity(queryVector, doc.embedding),
        }))
        .filter((doc) => doc.score >= MIN_SIMILARITY)
        .sort((a, b) => b.score - a.score)
        .slice(0, k)

    return ranked;
};
// console.log(retrieveRelevantChunks);



export const createVectorStore = async () => {
    console.log("--- Initializing Persistent Vector Store (MongoDB) ---");

    const webSources = getKnowledgeSources();
    const webDocs = await loadDocumentsFromSources(webSources);

    const hardcodedDocs = getHardcodedKnowledgeDocuments();

    const docs = [...webDocs, ...hardcodedDocs];

    const hardcodedSources = hardcodedDocs
        .map((doc) => doc.metadata?.source)
        .filter(Boolean);
    const sources = [...new Set([...webSources, ...hardcodedSources])];

    if (!docs.length) {
        throw new Error("No documents loaded from AI_SOURCE_URLS or hardcoded knowledge documents");
    }

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 600, chunkOverlap: 80 });
    // Change to much larger chunks (e.g., 4000 characters):  Large context models can read entire pages at once.
    // const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 4000, chunkOverlap: 400 });

    const splitDocs = (await splitter.splitDocuments(docs))
        .filter((doc) => {
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
    await collection.createIndex({ docType: 1, source: 1, chunkIndex: 1 });

    // Backfill type tags for older chunks created before docType was introduced.
    await collection.updateMany(
        { docType: { $exists: false }, source: /^internal:/i },
        { $set: { docType: "hardcoded", updatedAt: new Date() } }
    );
    await collection.updateMany(
        { docType: { $exists: false }, source: /^https?:\/\//i },
        { $set: { docType: "web", updatedAt: new Date() } }
    );

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
        sourceGroups: {
            web: webSources,
            hardcoded: hardcodedSources,
        },
    };
}

export const createStreamingChain = (vectorStore) => {
    // if we use Larger context window we need to switch model for massive context input
    const model = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama-3.1-8b-instant',
        temperature: 0.2,  //
        streaming: true,
    });

    // // Change to grab way more chunks:  const retrievalK = 20; // or 50!

    const retrievalK = Number(process.env.AI_RETRIEVAL_K || 4);

    const prompt = ChatPromptTemplate.fromMessages([
        // ["system", "You are the Masters AI Support Assistant. Use the following context to answer the user's question:\n\n{context}\n\nAlways format your responses properly using Markdown. Use bolding for emphasis, bullet points for lists, and break down complex concepts into easy-to-read headers. Be precise, professional, and helpful."],
        ["system", `You are the Masters AI Shopping Assistant, an advanced, highly capable, and friendly e-commerce AI designed to provide a world-class experience similar to ChatGPT. Your tone is warm, professional, engaging, and incredibly helpful.

### YOUR CORE PERSONA
- You are a natural conversationalist. You greet users warmly and engage with them smoothly.
- You format your responses beautifully using Markdown. You use **bold text** for emphasis and product names, use bullet points for easy reading, and structure your answers with clean spacing.
- You are concise but thorough. You don't overwhelm the user with massive blocks of text.
- You occasionally use relevant emojis to make the conversation feel lively and modern.

### HOW TO HANDLE KNOWLEDGE (STRICT RULES)
1. **Source of Truth:** You must base all factual information (products, prices, features, policies) STRICTLY on the provided CONTEXT below. Do NOT hallucinate, guess, or use outside knowledge.
2. **Out of Scope:** If the user asks a question that cannot be answered using the CONTEXT, decline politely and naturally.
3. **Images Only (No Links):** 
   - If an image URL is in the context, ALWAYS show it using: ![Product Name](IMAGE_URL)
   - NEVER generate or provide any "View Product" links or URLs. 
   - Do NOT tell the user to "check the website" or "click the link".

### RESPONSE GUIDELINES
- **Product Inquiries:** When showing a product, present it elegantly. Use this exact structure:
  1. The product image (if available)
  2. The **Product Name** and Price
  3. A brief catchy description and a clean bulleted list of 3-5 key features.
- **Policies:** For shipping, returns, or support, be clear, direct, and empathetic.

Your ultimate goal is to make the user feel like they are talking to a brilliant, helpful human assistant who knows the store inside and out.

----------------------------------------

CONTEXT:
{context}`],


        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"]
    ]);

    const rephrasePrompt = ChatPromptTemplate.fromMessages([
        ["system", `You are a search query generator. Given the conversation history and a follow-up user input, your task is to rephrase the follow-up input into a precise standalone search query.
        CRITICAL RULES:
        1. ONLY output the final rephrased query string.
        2. DO NOT add any conversational text, explanations, or greetings.
        3. If the input is just a number (like "1"), look at the history to determine what "1" refers to and generate a query for it.
        4. Do not broaden scope. Keep user intent unchanged.
        5. If message is already standalone, return it as-is.`],
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
                const scope = detectRetrievalScope(input.standalone_question);

                if (scope === "web") {
                    const webChunks = await retrieveRelevantChunks({
                        query: input.standalone_question,
                        embeddings: vectorStore.embeddings,
                        k: retrievalK,
                        sources: vectorStore.sourceGroups?.web || vectorStore.sources,
                        docTypes: ["web"],
                    });

                    if (!webChunks.length) {
                        return "__NO_CONTEXT__";
                    }

                    return webChunks.map((c) => c.content).join("\n\n");
                }

                if (scope === "hardcoded") {
                    const hardcodedChunks = await retrieveRelevantChunks({
                        query: input.standalone_question,
                        embeddings: vectorStore.embeddings,
                        k: retrievalK,
                        sources: vectorStore.sourceGroups?.hardcoded || vectorStore.sources,
                        docTypes: ["hardcoded"],
                    });

                    if (!hardcodedChunks.length) {
                        return "__NO_CONTEXT__";
                    }

                    return hardcodedChunks.map((c) => c.content).join("\n\n");
                }

                const [webChunks, hardcodedChunks] = await Promise.all([
                    retrieveRelevantChunks({
                        query: input.standalone_question,
                        embeddings: vectorStore.embeddings,
                        k: retrievalK,
                        sources: vectorStore.sourceGroups?.web || vectorStore.sources,
                        docTypes: ["web"],
                    }),
                    retrieveRelevantChunks({
                        query: input.standalone_question,
                        embeddings: vectorStore.embeddings,
                        k: retrievalK,
                        sources: vectorStore.sourceGroups?.hardcoded || vectorStore.sources,
                        docTypes: ["hardcoded"],
                    }),
                ]);

                const bestWebScore = webChunks[0]?.score ?? -1;
                const bestHardcodedScore = hardcodedChunks[0]?.score ?? -1;

                let relevantChunks = [];
                if (bestWebScore - bestHardcodedScore > 0.05) {
                    relevantChunks = webChunks;
                } else if (bestHardcodedScore - bestWebScore > 0.05) {
                    relevantChunks = hardcodedChunks;
                } else {
                    relevantChunks = [...webChunks, ...hardcodedChunks]
                        .sort((a, b) => b.score - a.score)
                        .slice(0, retrievalK);
                }

                if (!relevantChunks.length) {
                    return "__NO_CONTEXT__";
                }

                return relevantChunks.map((c) => c.content).join("\n\n");
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
