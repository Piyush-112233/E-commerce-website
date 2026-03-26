import "./config/env.js";
import express from 'express';
import connectDb from './config/db.js';
import cors from 'cors'
import http from 'http';

const app = express();
const PORT = process.env.PORT || 6000;

app.use(cookieParser())
// allow Angular app
app.use(cors({
    origin: "http://localhost:4200",
    credentials: true,
    methods: ["GET","POST","PUT","DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

//router import
import userRouter from './routes/user.router.js';
import cookieParser from 'cookie-parser';
import currentUserRouter from './routes/currentUser.router.js';
import morgan from 'morgan';
import googleRouter from './routes/googleAuth.js';
import passport from "passport";
import './bullMq/worker.js/email.worker.js'
import adminRouter from "./routes/admin.router.js";
import chatRouter from "./routes/chatRouter.js";
import { setupSocketIO } from "./socket.io/server.js";


//route declaration
app.use(morgan('dev'))
app.use('/api/users',userRouter);
app.use('/api/admin',adminRouter);
app.use('/api',currentUserRouter);
app.use('/auth', googleRouter);
app.use(passport.initialize());
app.use('/api',chatRouter)

// Create a single HTTP server for both Express and Socket.IO
const server = http.createServer(app);
setupSocketIO(server);

server.listen(PORT, () => {
    try {
        connectDb();
        console.log(`server is running on port ${PORT}`)
    } catch (error) {
        console.log("MONGO db connection failed !!!", error)
    }
})

export default app;