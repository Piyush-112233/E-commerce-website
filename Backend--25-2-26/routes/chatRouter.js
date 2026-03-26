import express from "express"
import { assign, closeConversation, conversation, conversationById, convStatusLimit, MessageforConversation } from "../controllers/supportController.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import isAuthVerifyJwt from "../middlewares/isAuth.middleware.js";

const chatRouter = express.Router();

// "Customer side" creates conversation (DB will treat them as conversation.customerId).
// Allow both `customer` and `user` roles to create/read their own conversation.
chatRouter.post('/conversations', isAuthVerifyJwt, authorizeRoles('customer', 'user'), conversation);
chatRouter.get('/conversations/:id', isAuthVerifyJwt, authorizeRoles('customer', 'user', 'admin'), conversationById);
chatRouter.get('/conversations/:id/messages', isAuthVerifyJwt, authorizeRoles('customer', 'user', 'admin'), MessageforConversation);
chatRouter.get('/admin/conversations', isAuthVerifyJwt, authorizeRoles("admin"), convStatusLimit);
chatRouter.post('/admin/conversations/:id/assign', isAuthVerifyJwt, authorizeRoles("admin"), assign);
chatRouter.post('/admin/conversations/:id/close', isAuthVerifyJwt, authorizeRoles("admin"), closeConversation);

export default chatRouter