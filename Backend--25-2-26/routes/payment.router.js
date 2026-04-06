import express from 'express';
import isAuthVerifyJwt from '../middlewares/isAuth.middleware.js';
import { createOrder, verifypayment } from '../controllers/payment.controller.js';

const paymentRouter = express.Router();

// protected routes (require authentication)
paymentRouter.post('/create-order', isAuthVerifyJwt, createOrder);
paymentRouter.post('/verify-payment', isAuthVerifyJwt, verifypayment);

export default paymentRouter;