const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../user");
const authMiddleware = require("../../middleware/authMiddleware");

const router = express.Router();

// ===============================
// USER REGISTER
// ===============================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, freeFireUid, freeFireIgn } = req.body;

    if (!name || !email || !password || !freeFireUid || !freeFireIgn) {
      return res.status(400).json({
        message:
          "Name, email, password, Free Fire UID and Free Fire IGN are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUid = String(freeFireUid).trim();
    const normalizedIgn = freeFireIgn.trim();

    const existingEmail = await User.findOne({
      email: normalizedEmail,
    });

    if (existingEmail) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const existingUid = await User.findOne({
      freeFireUid: normalizedUid,
    });

    if (existingUid) {
      return res.status(400).json({
        message: "This Free Fire UID is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      freeFireUid: normalizedUid,
      freeFireIgn: normalizedIgn,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        freeFireUid: newUser.freeFireUid,
        freeFireIgn: newUser.freeFireIgn,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];

      return res.status(400).json({
        message:
          duplicateField === "freeFireUid"
            ? "This Free Fire UID is already registered"
            : "Email already registered",
      });
    }

    return res.status(500).json({
      message: "Server error during registration",
      error: error.message,
    });
  }
});

// ===============================
// USER LOGIN
// ===============================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatched = await bcrypt.compare(password, user.password);

    if (!passwordMatched) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        freeFireUid: user.freeFireUid,
        freeFireIgn: user.freeFireIgn,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Server error during login",
      error: error.message,
    });
  }
});

// ===============================
// USER PROFILE
// ===============================
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Profile fetched successfully",
      user,
    });
  } catch (error) {
    console.error("Profile error:", error);

    return res.status(500).json({
      message: "Server error while fetching profile",
      error: error.message,
    });
  }
});

module.exports = router;