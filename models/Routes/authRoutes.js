const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../user");
const authMiddleware = require("../../middleware/authMiddleware");

const router = express.Router();

// =====================================
// GENERATE UNIQUE REFERRAL CODE
// =====================================
async function generateReferralCode(name) {
  let referralCode;
  let codeExists = true;

  while (codeExists) {
    const prefix =
      String(name)
        .replace(/[^A-Za-z]/g, "")
        .toUpperCase()
        .substring(0, 4) || "USER";

    const randomNumber = Math.floor(
      1000 + Math.random() * 9000
    );

    referralCode = `${prefix}${randomNumber}`;

    codeExists = await User.exists({
      referralCode,
    });
  }

  return referralCode;
}

// ===============================
// USER REGISTER
// ===============================
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      freeFireUid,
      freeFireIgn,
      referralCode,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !freeFireUid ||
      !freeFireIgn
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password, Free Fire UID and Free Fire IGN are required",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    const normalizedName = String(name).trim();

    const normalizedEmail = String(email)
      .toLowerCase()
      .trim();

    const normalizedUid = String(
      freeFireUid
    ).trim();

    const normalizedIgn = String(
      freeFireIgn
    ).trim();

    const existingEmail = await User.findOne({
      email: normalizedEmail,
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const existingUid = await User.findOne({
      freeFireUid: normalizedUid,
    });

    if (existingUid) {
      return res.status(400).json({
        success: false,
        message:
          "This Free Fire UID is already registered",
      });
    }

    let referredBy = null;
    let usedReferralCode = null;

    if (
      referralCode &&
      String(referralCode).trim()
    ) {
      usedReferralCode = String(referralCode)
        .trim()
        .toUpperCase();

      const referrer = await User.findOne({
        referralCode: usedReferralCode,
      });

      if (!referrer) {
        return res.status(400).json({
          success: false,
          message: "Invalid referral code",
        });
      }

      if (referrer.email === normalizedEmail) {
        return res.status(400).json({
          success: false,
          message:
            "You cannot use your own referral code",
        });
      }

      if (referrer.isBlocked) {
        return res.status(400).json({
          success: false,
          message:
            "This referral code is unavailable",
        });
      }

      referredBy = referrer._id;
    }

    const hashedPassword = await bcrypt.hash(
      String(password),
      10
    );

    const myReferralCode =
      await generateReferralCode(normalizedName);

    const newUser = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      freeFireUid: normalizedUid,
      freeFireIgn: normalizedIgn,
      referralCode: myReferralCode,
      referredBy,
      referralRewardGiven: false,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        freeFireUid: newUser.freeFireUid,
        freeFireIgn: newUser.freeFireIgn,
        role: newUser.role,
        walletBalance: newUser.walletBalance,
        coinBalance: newUser.coinBalance,
        referralCode: newUser.referralCode,
        referredBy: newUser.referredBy,
        usedReferralCode,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    if (error.code === 11000) {
      const duplicateField = Object.keys(
        error.keyPattern || {}
      )[0];

      let message =
        "Duplicate account information detected";

      if (duplicateField === "freeFireUid") {
        message =
          "This Free Fire UID is already registered";
      }

      if (duplicateField === "email") {
        message = "Email already registered";
      }

      if (duplicateField === "referralCode") {
        message =
          "Referral code generation conflict. Please try again";
      }

      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Server error during registration",
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
        success: false,
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail = String(email)
      .toLowerCase()
      .trim();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    if (!user.password) {
      return res.status(500).json({
        success: false,
        message:
          "User password data is unavailable",
      });
    }

    const passwordMatched =
      await bcrypt.compare(
        String(password),
        user.password
      );

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message:
          "JWT secret is missing from server environment",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        freeFireUid: user.freeFireUid,
        freeFireIgn: user.freeFireIgn,
        role: user.role,
        walletBalance: user.walletBalance,
        coinBalance: user.coinBalance,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        referralRewardGiven:
          user.referralRewardGiven,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Server error during login",
      error: error.message,
    });
  }
});

// ===============================
// USER PROFILE
// ===============================
router.get(
  "/profile",
  authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(
        req.user.userId
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Profile fetched successfully",
        user,
      });
    } catch (error) {
      console.error(
        "Profile error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while fetching profile",
        error: error.message,
      });
    }
  }
);

module.exports = router;