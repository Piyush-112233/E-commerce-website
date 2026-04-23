import express from 'express';
import { getAiHistory, streamAiChat } from '../controllers/aiChat.controller.js';
import isAuthVerifyJwt from '../middlewares/isAuth.middleware.js';
import authorizeRoles from '../middlewares/role.middleware.js';

const aiChatRouter = express.Router();

aiChatRouter.get('/history', isAuthVerifyJwt, getAiHistory);
aiChatRouter.post('/stream', isAuthVerifyJwt, streamAiChat);

export default aiChatRouter;