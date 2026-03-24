import express from "express";
import jwt from "jsonwebtoken";
import isAuthVerifyJwt from "../middlewares/isAuth.middleware.js";
import passport from "../config/passport.js";
import emailQueue from "../bullMq/queue.js/email.queue.js";

const googleRouter = express.Router();

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
            const token = jwt.sign({ id: req.user._id, email: req.user.email },
                process.env.SECRET_KEY,
                { expiresIn: "7d" }
            )

            // Add job to BullMQ
            await emailQueue.add("WelcomeEmail",
                {
                    email: req.user.email,
                    name: req.user.name,

                })
                // console.log("------1",job.data)

            // redirect to frontend with token
            res.redirect(`http://localhost:4200/home-success?token=${token}`)
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