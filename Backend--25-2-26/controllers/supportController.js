import { canAdminAccessConversation, canCustomerAccessConversation, isValidObjectid } from "../middlewares/chatAuthz.js";
import ConversationModel from "../model/supportConversation.js";
import MessageModel from "../model/SupportMessage.js";
import { ApiError } from "../validators/ApiError.js";
import { ApiResponse } from "../validators/ApiResponse.js";


/**
 * CUSTOMER: Create or get open conversation
 * POST /api/conversations
 */
export const conversation = async (req, res) => {
    try {
        const user = req.user;

        // (Socket senderRole is derived from conversation.customerId, not the JWT role string.)
        if (user.role === "admin") {
            return res.status(403).json({ message: "Admins cannot create new customer conversations" });
        }

        // One-open-conversation-per-customer approach:
        let conv = await ConversationModel.findOne({
            customerId: user._id,
            status: { $in: ['open', 'assigned', 'pending'] }
        });

        if (!conv) {
            conv = await ConversationModel.create({
                customerId: user._id,
                status: 'open',
                lastMessageAt: new Date(),
            })
        }

        return res.status(200).json(new ApiResponse(200, { conv }));

    } catch (error) {
        return res.status(500).json(
            new ApiError(500,
                {
                    message: "Server error",
                    error: String(error.message || error)
                }
            )
        );
    }
}


/**
 * CUSTOMER/AGENT/ADMIN: Get conversation by id (with authorization)
 * GET /api/conversations/:id
 */
export const conversationById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectid(id)) {
            return res.status(400).json(new ApiError(400, { message: "Invalid conversation Id" }));
        };

        const conv = await ConversationModel.findById(id);

        if (!conv) {
            return res.status(404).json(new ApiError(404, { message: "Conversation not found" }));
        }

        const user = req.user
        const allowed = canCustomerAccessConversation(conv, user._id) || canAdminAccessConversation(conv, user);

        if (!allowed) {
            return res.status(403).json(
                new ApiError(403, {
                    message: "Forbidden"
                })
            )
        }

        return res.status(200).json(new ApiResponse(200, { conv }));
    } catch (error) {
        return res.status(500).json(
            new ApiError(500,
                {
                    message: "Server error",
                    error: String(error.message || error)
                }
            )
        );
    }
}


/**
 * CUSTOMER/AGENT/ADMIN: Get messages for a conversation (pagination)
 * GET /api/conversations/:id/messages?limit=30&before=ISO_DATE
 */
export const MessageforConversation = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectid(id)) {
            return res.status(400).json(
                new ApiError(400,
                    { message: "Invalid Conversation Id" }
                )
            );
        }

        const conv = await ConversationModel.findById(id);

        if (!conv) {
            return res.status(404).json(new ApiError(404, { message: "Conversation not found" }));
        }

        const user = req.user
        const allowed = canCustomerAccessConversation(conv, user._id) || canAdminAccessConversation(conv, user);

        if (!allowed) {
            return res.status(403).json(
                new ApiError(403, {
                    message: "Forbidden"
                })
            )
        }

        const limit = Math.min(parseInt(req.query.limit || "8", 10), 100);

        const before = req.query.before ? new Date(req.query.before) : new Date();

        const messages = await MessageModel.find({
            conversationId: id,
            createdAt: { $lt: before }
        }).sort({ createdAt: -1 }).limit(limit)

        return res.status(200).json(
            new ApiResponse(200, {
                messages: messages.reverse()
            })
        )
    } catch (error) {
        return res.status(500).json(
            new ApiError(500,
                {
                    message: "Server error",
                    error: String(error.message || error)
                }
            )
        );
    }
}



/**
 * ADMIN/AGENT: list conversations (queue)
 * GET /api/admin/conversations?status=open&limit=50
 */
export const convStatusLimit = async (req, res) => {
    try {
        const status = req.query.status || "open";
        const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);

        const query = {}
        if (status) query.status = status;

        // If agent (not admin), show only assigned to them (recommended)
        const userRole = String(req.user.role || (req.user.isAdmin ? "admin" : "user")).toLowerCase();
        if (userRole !== "admin") {
            query.adminId = req.user._id
        }

        const conversation = await ConversationModel.find(query).sort({ lastMessageAt: -1 }).limit(limit);

        return res.status(200).json(new ApiResponse(200, { conversation }));
    } catch (error) {
        return res.status(500).json(
            new ApiError(500,
                {
                    message: "Server error",
                    error: String(error.message || error)
                }
            )
        );
    }
}

/**
 * AGENT/ADMIN: assign conversation to current agent
 * POST /api/admin/conversations/:id/assign
 */
export const assign = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectid(id)) {
            return res.status(400).json(
                new ApiError(400,
                    { message: "Invalid conversation Id" }
                )
            );
        }

        const conv = await ConversationModel.findById(id);

        if (!conv) return res.status(404).json(new ApiError(404, { message: "Conversation not found" }));

        if (conv.status === "closed") {
            return res.status(400).json(
                new ApiError(400,
                    { message: "Conversation is Closed" }
                )
            );
        }

        if (conv.adminId && String(conv.adminId) !== String(req.user._id) && req.user.role !== "admin") {
            return res.status(409).json(
                new ApiError(409, { message: "Conversation already assigned" })
            )
        }

        conv.adminId = req.user._id;
        conv.status = "assigned";
        await conv.save();

        return res.status(200).json(new ApiResponse(200, { conv }));
    } catch (error) {
        res.status(500).json(
            new ApiError(500,
                {
                    message: "Server error",
                    error: String(error.message || error)
                }
            )
        )
    }
}


/**
 * AGENT/ADMIN: close conversation
 * POST /api/admin/conversations/:id/close
 */
export const closeConversation = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectid(id)) {
            return res.status(400).json(
                new ApiError(400,
                    { message: "Invalid conversation Id" }
                )
            );
        }

        const conv = await ConversationModel.findById(id);

        if (!conv) return res.status(404).json(new ApiError(404, { message: "Conversation not found" }));

        if (req.user.role === "admin") {
            if (!conv.adminId || String(conv.adminId) !== String(req.user._id)) {
                return res.status(403).json(new ApiError(403, { message: "Only assigned admin can close it" }));
            }
        }

        conv.status = "closed";
        conv.closedAt = new Date();
        await conv.save();

        return res.status(200).json(new ApiResponse(200, { conv }));
    } catch (error) {
        res.status(500).json(
            new ApiError(500,
                {
                    message: "Server error",
                    error: String(error.message || error)
                }
            )
        )
    }
}