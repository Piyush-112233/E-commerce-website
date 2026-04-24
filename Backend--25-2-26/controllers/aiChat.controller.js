import { AIMessage, HumanMessage } from "langchain";
import AiConversationModel from "../model/ai.model.js";

export const streamAiChat = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user._id;
        console.log("User ID:", userId);
        console.log("Message:", message);

        // 1. Get or Create AI Conversation for this user
        let conv = await AiConversationModel.findOne({ customerId: userId, status: 'active' });
        if (!conv) {
            conv = await AiConversationModel.create({ customerId: userId, history: [] });
        }
        console.log("Conversation:", conv);


        // 2. Format history for Langchain (Window Memory: (.slice(-10)) Only pass the last 6 messages!)
        // Change to allow massive history (e.g., last 50 messages, or remove slice entirely):
        // const chatHistory = conv.history.slice(-50).map(...)
        const chatHistory = conv.history.slice(-10).map(msg =>
            msg.role === 'human' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
        );
        console.log("Chat History:", chatHistory);


        // 3. Set standard HTTP streaming headers
        res.setHeader('Content-Type', "text/event-stream");
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 4. Stream response from LangChain (global.aiChain set in index.js)
        const stream = await global.aiChain.stream({
            input: message,
            chat_history: chatHistory
        });
        console.log("Stream:", stream);


        let fullAiResponse = '';
        // 5. Stream chunks to the client
        for await (const chunk of stream) {
            const token = chunk || "";
            fullAiResponse += token;

            // Artificial delay to create the ChatGPT typing effect (e.g., 15-20 milliseconds)
            await new Promise(resolve => setTimeout(resolve, 20));

            // Send SSE formatted chunk (Standard format for Server-Sent Events)
            res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
        }
        console.log("Full AI Response:", fullAiResponse);


        // 6. Save the new messages to the database
        conv.history.push({ role: 'human', content: message });
        conv.history.push({ role: 'ai', content: fullAiResponse });
        await conv.save();

        // 7. Close stream
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error("AI Stream Error:", error);
        res.status(500).end();
    }
}

export const getAiHistory = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const userId = req.user._id;
        const conv = await AiConversationModel.findOne({ customerId: userId, status: 'active' });
        res.status(200).json({ history: conv ? conv.history : [] });
    } catch (error) {
        console.error("AI history error:", error);
        res.status(500).json({ error: "Failed to fetch AI history" });
    }
}