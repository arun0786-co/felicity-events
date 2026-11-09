import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { connectdb } from "./config/db.js";
import { createApp } from "./app.js";
import User from "./models/user.js";

dotenv.config();

const requiredEnv = ["MONGODB_URI", "JWT_SECRET"];
for (const key of requiredEnv) {
    if (!process.env[key]) {
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

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

const app = createApp();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
