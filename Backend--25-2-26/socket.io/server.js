import { Server } from "socket.io";
import ConversationModel from "../model/supportConversation.js";
import MessageModel from "../model/SupportMessage.js";
import cookie from "cookie";
import verifySocketJwt from "../middlewares/verifySocketJwt.js";
import { v2 as cloudinary } from "cloudinary";
import "../config/cloudinary.js";



const ADMIN_ROOM = 'admins:online';
const conversationRoom = (id) => `conv:${id}`;

export const setupSocketIO = (server) => {
    const io = new Server(server, {
        cors: {
            origin: 'http://localhost:4200',
            credentials: true,
        },
        path: '/socket.io',
        maxHttpBufferSize: 1e7, // 10MB limit
    });

    // Socket auth (JWT via handshake.auth.token OR cookie accessToken)
    io.use(async (socket, next) => {
        try {
            const authToken = socket.handshake.auth?.token;

            const rawCookie = socket.handshake.headers.cookie || "";
            const parsed = cookie.parse(rawCookie);
            const cookieToken = parsed.accessToken;

            const token = authToken || cookieToken;
            if (!token) return next(new Error("Unauthorized: token missing"));

            const user = await verifySocketJwt(token);
            socket.data.user = user;
            socket.user = user; // keep a consistent alias for handlers below
            return next();
        } catch (error) {
            return next(new Error("Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        const user = socket.data.user; // already verified
        const userId = String(user._id);
        const role = String(user.role || (user.isAdmin ? "admin" : "user")).toLowerCase(); // take from DB/JWT and consider isAdmin

        // auto join
        socket.join(`user:${userId}`);
        if (role === 'admin') socket.join(ADMIN_ROOM);

        socket.emit("Auth:ok", { userId, role });

        socket.on("chat:join", async ({ conversationId }) => {
            const conv = await ConversationModel.findById(conversationId);
            if (!conv) return;

            // Join authorization allowed = isCustomer || isAdmin || isAssignedAdmin
            const isCustomer = String(conv.customerId) === userId;
            const isAdmin = role === "admin";
            const isAssignedAdmin = conv.adminId && String(conv.adminId) === userId;

            const allowed = isCustomer || isAdmin || isAssignedAdmin;
            if (!allowed) return;

            socket.join(conversationRoom(conversationId));
        });

        socket.on("chat:send", async ({ conversationId, text, file }, ack) => {
            try {
                if ((!text || !text.trim()) && (!file || file.length === 0)) return ack?.({ ok: false, error: 'Empty message' });

                const conv = await ConversationModel.findById(conversationId);
                if (!conv) return ack?.({ ok: false, error: 'Conversation not found' });

                // Send authorization same logic
                const isCustomer = String(conv.customerId) === userId;
                const isAdmin = role === "admin";
                const isAssignedAdmin = conv.adminId && String(conv.adminId) === userId;

                const allowed = isCustomer || isAdmin || isAssignedAdmin;
                if (!allowed) return ack?.({ ok: false, error: 'Unauthorized to send messages in this conversation' });

                let uploadedAttachments = [];
                if (file && Array.isArray(file) && file.length > 0) {
                    for (const f of file) {
                        if (f && f.data) {
                            const uploadRes = await cloudinary.uploader.upload(f.data, {
                                resource_type: "auto",
                                folder: "support_chat"
                            });
                            uploadedAttachments.push({
                                url: uploadRes.secure_url,
                                public_id: uploadRes.public_id,
                                type: 'image',
                                name: f.name,
                                size: Math.round((f.data.length * 3) / 4)
                            });
                        }
                    }
                }

                // Message created
                const message = await MessageModel.create({
                    conversationId,
                    senderId: user._id,
                    senderRole: isCustomer ? 'customer' : 'admin',
                    type: uploadedAttachments.length > 0 ? 'file' : 'text',
                    text: text ? text.trim() : '',
                    attachments: uploadedAttachments,
                    readBy: [{ userId: user._id, readAt: new Date() }],
                });

                const incField = isCustomer ? "unreadCountAdmin" : "unreadCountCustomer";

                // Conversation updated
                await ConversationModel.updateOne(
                    { _id: conversationId },
                    {
                        $set: {
                            lastMessageAt: message.createdAt,
                            lastMessageText: uploadedAttachments.length > 0 ? 'Sent an attachment' : message.text,
                            status: conv.status === "closed" ? "open" : conv.status
                        },
                        $inc: {
                            [incField]: 1
                        }
                    },
                );

                // Emit to the room and admins (deduplicates automatically)
                io.to(conversationRoom(conversationId)).to(ADMIN_ROOM).emit("chat:new", {
                    conversationId,
                    message
                });

                ack?.({ ok: true, message });

            } catch (error) {
                ack?.({ ok: false, error: error.message || 'Send failed' });
            }
        });

        socket.on("chat:markRead", async ({ conversationId }) => {
            try {
                const conv = await ConversationModel.findById(conversationId);
                if (!conv) return;

                const isCustomer = String(conv.customerId) === userId;
                const isAdmin = role === "admin";
                const isAssignedAdmin = conv.adminId && String(conv.adminId) === userId;

                const allowed = isCustomer || isAdmin || isAssignedAdmin;
                if (!allowed) return;

                if (isCustomer) {
                    await ConversationModel.updateOne({ _id: conversationId }, { $set: { unreadCountCustomer: 0 } });
                } else {
                    await ConversationModel.updateOne({ _id: conversationId }, { $set: { unreadCountAdmin: 0 } });
                }
            } catch (error) {
                console.error("markRead error:", error);
            }
        });


    });

    return io;
};