import express from 'express'
import isAuthVerifyJwt from '../middlewares/isAuth.middleware.js';
import { getCurrentUser } from '../controllers/currentUser.controller.js';

let currentUserRouter = express.Router();

currentUserRouter.get('/currentuser', isAuthVerifyJwt, getCurrentUser)

export default currentUserRouter;