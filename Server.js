const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./models/Routes/authRoutes");
const tournamentRoutes = require("./models/Routes/tournamentRoutes");
const walletRoutes = require("./models/Routes/walletRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// GLOBAL MIDDLEWARE
// ========================================
app.use(express.json());

// ========================================
// API ROUTES
// ========================================
app.use("/api/auth", authRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/wallet", walletRoutes);

// ========================================
// HOME ROUTE
// ========================================
app.get("/", (req, res) => {
  res.status(200).send("Free Fire Tournament API Running 🚀");
});

// ========================================
// 404 ROUTE
// ========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================
app.use((error, req, res, next) => {
  console.error("Global server error:", error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

// ========================================
// DATABASE CONNECTION AND SERVER START
// ========================================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    process.exit(1);
  });