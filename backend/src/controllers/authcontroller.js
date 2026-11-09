import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      participantType,
      college,
      contactNumber,
    } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();

    // basic sanity check so we do not silently create weird records
    if (!firstName || !lastName || !email || !password) {
      return res
        .status(400)
        .json({ message: "first name, last name, email and password are required." });
    }

    // enforce participant type to match our enum
    const allowedTypes = ["IIIT", "NON_IIIT"];
    if (participantType && !allowedTypes.includes(participantType)) {
      return res.status(400).json({ message: "invalid participant type." });
    }

    // if user marks themselves as iiit student, email must match institute domain
    if (participantType === "IIIT" && !normalizedEmail.endsWith("iiit.ac.in")) {
      return res
        .status(400)
        .json({ message: "iiit participants must use their official @iiit.ac.in email." });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user — role locked to "participant" on self-registration
    const user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "participant",
      participantType,
      college,
      contactNumber,
    });

    // Return success (never return the password)
    res.status(201).json({
      message: "Registration successful.",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Check account is active before doing anything else
    if (!user.isActive) {
      return res.status(403).json({ message: "Account is disabled. Contact admin." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return token + role
    res.status(200).json({
      message: "Login successful.",
      token,
      role: user.role,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
