import { Server } from "socket.io";
import app from "../index.js";
import http from "http";
import { ApiError } from "../validators/ApiError";
import isAuthVerifyJwt from "../middlewares/isAuth.middleware";
import ConversationModel from "../model/supportConversation.js";
import MessageModel from "../model/SupportMessage.js";
import { conversationById } from "../controllers/supportController";

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:4200",
        credentials: true
    },
});

// Socket auth (JWT via handshake.auth.token)
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) return new ApiError({ message: "Invalid token" })
        socket.user = isAuthVerifyJwt(token);
        next();
    } catch (error) {
        next(new Error("Invalid token"));
    }
});

io.on("connection", (socket) => {
    socket.on("conversation:join", async ({ conversationId }) => {
        const conv = await ConversationModel.findById(conversationId);
        if (!conv) return;

        // authorize Join
        const isCustomer = String(conv.customerId) === String(socket.user._id);
        const isAdmin = socket.user.role === "admin";
        const isAssignedAdmin = conv.adminId && String(conv.adminId) === String(socket.user._id);

        if (!isCustomer && (!isAdmin && !(socket.user.role === "admin" || isAssignedAdmin))) {
            return
        }

        socket.join(`conv:${conversationId}`);
    });

    socket.on("message:send", async ({ conversationId, text }) => {
        if (!text || !text.trim()) return;

        const conv = await ConversationModel.findById(conversationId);
        if (!conv) return;

        const isCustomer = String(conv.customerId) === String(socket.user._id);
        const isAdmin = socket.user.role === "admin";
        const isAssignedAdmin = conv.adminId && String(conv.adminId) === String(socket.user._id);

        if (!isCustomer && (!isAdmin && !(socket.user.role === "admin" || isAssignedAdmin))) {
            return
        }

        const message = await MessageModel.create({
            conversationId,
            senderId: socket.user._id,
            senderRole: isCustomer ? 'customer' : 'admin',
            type: 'text',
            text: text.trim(),
            readBy: [socket.user._id],
        });

        await ConversationModel.updateOne(
            { _id: conversationId },
            {
                $set: {
                    lastMessageAt: msg.createAt,
                    lastMessageText: msg.text,
                    status: conv.status === "closed" ? "open" : conv.status
                }
            },
        );

        io.to(`conv:${conversationId}`).emit("message:new", {
            conversationId,
            message: msg
        });
    });
});

server.listen(process.env.PORT, () => {
    console.log("Server Started");
})