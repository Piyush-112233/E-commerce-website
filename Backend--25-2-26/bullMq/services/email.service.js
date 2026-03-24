import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

async function sendEmail(options) {

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: `"My App" <${process.env.EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.html
  });

}

export default sendEmail;