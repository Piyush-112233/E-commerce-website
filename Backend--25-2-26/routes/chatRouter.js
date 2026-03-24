import express from "express"
import { assign, closeConversation, conversation, conversationById, convStatusLimit, MessageforConversation } from "../controllers/supportController.js";
import authorizeRoles from "../middlewares/role.middleware.js";

const chatRouter = express.Router();

chatRouter.post('/conversations', authorizeRoles, conversation);
chatRouter.get('/conversations/:id', authorizeRoles, conversationById);
chatRouter.get('/conversations/:id/messages', authorizeRoles, MessageforConversation);
chatRouter.get('/admin/conversations', authorizeRoles("admin"), convStatusLimit);
chatRouter.get('/admin/conversations/:id/assign', authorizeRoles("admin"), assign);
chatRouter.get('/admin/conversations/:id/close', authorizeRoles("admin"), closeConversation);

export default chatRouter