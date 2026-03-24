import { Queue } from "bullmq";
import connection from "./redis.connection.js";

// This Does not exist in BullMq --> this is never called
// const emailQueue = async () => {
//     await Queue.create("emailQueue",{
//         email:"pdidbhjbshb",
//         connection
//     });
//     console.log(emailQueue);
    
// }

const emailQueue = new Queue("emailQueue", { connection });
// console.log(emailQueue)

export default emailQueue