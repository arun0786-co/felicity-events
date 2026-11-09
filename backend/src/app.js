import express from "express";
import cors from "cors";
import authroutes from "./routes/authroutes.js";
import adminroutes from "./routes/adminroutes.js";
import eventroutes from "./routes/eventroutes.js";
import userroutes from "./routes/userroutes.js";
import passwordresetroutes from "./routes/passwordresetroutes.js";
import feedbackroutes from "./routes/feedbackroutes.js";
import forumroutes from "./routes/forumroutes.js";

// the express app without a database connection or a listening socket,
// so tests can mount it on their own server
export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api/auth", authroutes);
  app.use("/api/admin", adminroutes);
  app.use("/api/events", eventroutes);
  app.use("/api/users", userroutes);
  app.use("/api/password-reset", passwordresetroutes);
  app.use("/api/feedback", feedbackroutes);
  app.use("/api/forum", forumroutes);
  return app;
}
