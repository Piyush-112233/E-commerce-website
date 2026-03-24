import { Worker } from "bullmq";
import connection from "../queue.js/redis.connection.js";
import sendEmail from "../services/email.service.js";


const emailWorker = new Worker(
  "emailQueue",
  async (job) => {

    // console.log("Worker received job:", job.data);

    if (job.name === "WelcomeEmail") {

      const { email, name } = job.data;

      await sendEmail({
        email: email,
        subject: "Welcome to our platform 🎉",
        html: `Hello ${name} <${process.env.EMAIL}>
               Your account was Created successfully.
              `
      });
    };


    if (job.name === "ResetPasswordEmail") {

      const { email, name, link } = job.data;

      await sendEmail(
        {
          email: email,
          subject: "Reset your password",
          html: `
                <h2>Hello ${name}</h2>
                <p>Click the link below to reset your password</p>
                <a href="${link}">Reset Password</a>
          `
        }
      );
    }

    if (job.name === "EmailVerification") {
      const { email, name, link } = job.data;
      await sendEmail(
        {
          email: email,
          subject: "Email for Verification",
          html:
            `
          <h2>Hello ${name}</h2>
          <p>Click the link to verify your account:</p>
          <a href="${link}">Verify Email</a>
          `
        }
      )
      console.log("Verification email sent");
    }

  },
  { connection }
);

emailWorker.on("completed", job => {
  console.log(`Email job ${job.id} completed`)
});

emailWorker.on("failed", (job, err) => {
  console.log(`Email job ${job.id} failed`, err)
});


export default emailWorker;