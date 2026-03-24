import express from "express";
import { auth, changeCurrentPassword, forgetPassword, getUserProfile, loginUser, logoutUser, RefreshAccessToken, resetPassword, signUpUser, updateAccountDetails, verifyEmail } from "../controllers/user.controller.js";
import isAuthVerifyJwt from "../middlewares/isAuth.middleware.js";

let userRouter = express.Router();

userRouter.post('/signup', signUpUser);
userRouter.get('/verify-email/:token',verifyEmail)
userRouter.post('/login', loginUser);
userRouter.post('/forgot-password', forgetPassword);
userRouter.post('/reset-password/:token', resetPassword);
//secured routes
userRouter.post('/logout', isAuthVerifyJwt, logoutUser);
userRouter.post('/refresh-token', RefreshAccessToken);
userRouter.patch('/changePassword', changeCurrentPassword);
userRouter.patch('/updateDetails', updateAccountDetails);

userRouter.get('/profile', isAuthVerifyJwt, getUserProfile);

userRouter.get('/me', auth)
export default userRouter;