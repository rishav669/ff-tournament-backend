require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const authRoutes = require("./models/Routes/authRoutes");
const tournamentRoutes = require("./models/Routes/tournamentRoutes");
const walletRoutes = require("./models/Routes/walletRoutes");
const rewardRoutes = require("./models/Routes/rewardRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI;

// ========================================
// BODY PARSERS
// ========================================
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

// ========================================
// HOME ROUTE
// ========================================
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "Free Fire Tournament API is running",
  });
});

// ========================================
// API ROUTES
// ========================================
app.use("/api/auth", authRoutes);

app.use(
  "/api/tournaments",
  tournamentRoutes
);

app.use("/api/wallet", walletRoutes);

app.use("/api/rewards", rewardRoutes);

// ========================================
// 404 ROUTE
// ========================================
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================
app.use((error, req, res, next) => {
  console.error("Global server error:", error);

  return res.status(
    error.statusCode || 500
  ).json({
    success: false,
    message:
      error.message ||
      "Internal server error",
  });
});

// ========================================
// DATABASE CONNECTION + SERVER START
// ========================================
const startServer = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error(
        "MongoDB connection URL is missing from .env"
      );
    }

    await mongoose.connect(MONGO_URI);

    console.log(
      "MongoDB connected successfully"
    );

    app.listen(PORT, () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Server startup error:",
      error.message
    );

    process.exit(1);
  }
};

startServer();