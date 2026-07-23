const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./models/Routes/authRoutes");
const tournamentRoutes = require("./models/Routes/tournamentRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/tournaments", tournamentRoutes);

app.get("/", (req, res) => {
  res.send("Free Fire Tournament API Running 🚀");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed:", err.message);
  });