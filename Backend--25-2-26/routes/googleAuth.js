import express from "express";
import isAuthVerifyJwt from "../middlewares/isAuth.middleware.js";
import passport from "../config/passport.js";
import emailQueue from "../bullMq/queue.js/email.queue.js";

const googleRouter = express.Router();
const isProd = process.env.NODE_ENV === "production";
const authCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
};

// redirect to google
googleRouter.get("/google",
    passport.authenticate("google",
        {
            scope: ["profile", "email"]
        })
)

// callback from google
googleRouter.get("/google/callback",
    passport.authenticate("google", { session: false }), async (req, res) => {
        try {
            const accessToken = req.user.generateAccessToken();
            const refreshToken = req.user.generateRefreshToken();

            req.user.refreshToken = refreshToken;
            await req.user.save({ validateBeforeSave: false });

            // Add job to BullMQ
            await emailQueue.add("WelcomeEmail",
                {
                    email: req.user.email,
                    name: req.user.name,

                })
                // console.log("------1",job.data)

            res.cookie("accessToken", accessToken, authCookieOptions);
            res.cookie("refreshToken", refreshToken, authCookieOptions);

            // redirect to frontend with token
            res.redirect(`http://localhost:4200/home-success?token=${accessToken}`)
        } catch (error) {
            console.log("Google Login Error: ", error)
            res.redirect("http://localhost:4200/login?error=google_failed")
        }
    }
)

// get user
googleRouter.get("/me", isAuthVerifyJwt, (req, res) => {
    res.json({ success: true, user: req.user })
})

export default googleRouter
