const express = require("express");
const bodyParser = require("body-parser");
const redis = require("redis");
const Queue = require("bull");
const nodemailer = require("nodemailer");

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;

const redisClient = redis.createClient({
  url: "redis://localhost:6379",
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});
(async () => {
  await redisClient.connect();
  console.log("redis is connected.");
})();

const emailQueue = new Queue("emailQueue", {
  redis: { url: "redis://localhost:6379" },
});

emailQueue.process(async (job) => {
  console.log("Processing email job:", job.id, job.data);
  try {
    let transporter = nodemailer.createTransport({
      service: "outlook",
      auth: {
        user: "email",
        pass: "password",
      },
    });

    // ข้อมูลอีเมล
    let mailOptions = {
      from: '"Your App" <email>',
      to: job.data.email,
      subject: "Welcome to Our Service",
      text: `Hello ${job.data.username}, welcome to our service!`,
      html: `<b>Hello ${job.data.username}</b>, <br> Welcome to our service!`,
    };

    // ส่งอีเมล
    let info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error processing email job:", error);
  }
});

app.post("/register", async (req, res) => {
  const { username, email } = req.body;
  try {
    await emailQueue.add({ username, email });

    res.json({ username, email });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Redis Queue Server is running on port ${PORT}`);
});
