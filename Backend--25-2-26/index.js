import "./config/env.js";
import express from 'express';
import connectDb from './config/db.js';
import cors from 'cors'
import http from 'http';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import passport from "passport";

//router import
import userRouter from './routes/user.router.js';
import currentUserRouter from './routes/currentUser.router.js';
import googleRouter from './routes/googleAuth.js';
import adminRouter from "./routes/admin.router.js";
import chatRouter from "./routes/chatRouter.js";
import aiChatRouter from "./routes/aiChat.router.js";
import cartAndWishlistRouter from "./routes/CartAndWishlistRouter.js";
import paymentRouter from "./routes/payment.router.js";
import { setupSocketIO } from "./socket.io/server.js";
import { createVectorStore, createStreamingChain } from "./utils/ai.helpers.js";

import './bullMq/worker.js/email.worker.js'

const app = express();
const PORT = process.env.PORT || 6000;

app.use(cookieParser())
// allow Angular app
app.use(cors({
    origin: "http://localhost:4200",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

//route declaration
app.use(morgan('dev'))
app.use(passport.initialize());
app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api', currentUserRouter);
app.use('/auth', googleRouter);
app.use('/api', chatRouter)
app.use('/api', cartAndWishlistRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/ai', aiChatRouter);

// Create a single HTTP server for both Express and Socket.IO
const server = http.createServer(app);
setupSocketIO(server);

let aiChain;
export const initAI = async () => {
    try {
        const vectorStore = await createVectorStore();
        aiChain = createStreamingChain(vectorStore);
        global.aiChain = aiChain;
        console.log("AI system initialized successfully");
    } catch (error) {
        console.error("AI initialization failed:", error);
    }
};

connectDb()
    .then(async () => {
        await initAI();
        server.listen(PORT, () => {
            console.log(`server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MONGO db connection failed !!!", error);
        process.exit(1);
    });

export default app;
