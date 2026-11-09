import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectdb } from './config/db.js';
import authroutes from "./routes/authroutes.js";
import adminroutes from "./routes/adminroutes.js";
import eventroutes from "./routes/eventroutes.js";
import userroutes from "./routes/userroutes.js";
import passwordresetroutes from "./routes/passwordresetroutes.js";
import feedbackroutes from "./routes/feedbackroutes.js";
import forumroutes from "./routes/forumroutes.js";
import User from "./models/user.js";
import bcrypt from "bcrypt";


dotenv.config();

const app = express();

const requiredEnv = ["MONGODB_URI", "JWT_SECRET"];
for (const key of requiredEnv) {
    if (!process.env[key]) {
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

// Middleware
app.use(cors());
app.use(express.json());

// Connect to database
await connectdb();
// Ensure admin exists (seed from env) — useful for demos
const ensureAdmin = async () => {
    try {
        const existing = await User.findOne({ role: "admin" });
        if (existing) return;

        const email = (process.env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
        const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
        const firstName = process.env.ADMIN_FIRSTNAME || "Admin";
        const lastName = process.env.ADMIN_LASTNAME || "User";

        const hashed = await bcrypt.hash(password, 10);
        const admin = new User({
            firstName,
            lastName,
            email,
            password: hashed,
            role: "admin",
            isActive: true,
        });
        await admin.save();
        console.log("Admin seeded:", email);
    } catch (err) {
        console.error("Failed to seed admin:", err.message);
    }
};
await ensureAdmin();
// routes
app.use("/api/auth", authroutes);
app.use("/api/admin", adminroutes);
app.use("/api/events", eventroutes);
app.use("/api/users", userroutes);
app.use("/api/password-reset", passwordresetroutes);
app.use("/api/feedback", feedbackroutes);
app.use("/api/forum", forumroutes);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
