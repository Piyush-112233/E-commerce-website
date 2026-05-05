import { Queue } from "bullmq";
import connection from "./redis.connection.js";

const notificationQueue = new Queue("notificationQueue", { connection });

export default notificationQueue;
