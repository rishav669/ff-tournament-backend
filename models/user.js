const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    freeFireUid: {
      type: String,
      trim: true,
      default: "",
    },

    freeFireIgn: {
      type: String,
      trim: true,
      default: "",
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    walletBalance: {
      type: Number,
      default: 0,
      min: [0, "Wallet balance cannot be negative"],
    },

    totalDeposited: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalEntryFeesPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalKillRewards: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalWinnerRewards: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalWinnings: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalWithdrawn: {
      type: Number,
      default: 0,
      min: 0,
    },

    upiId: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index(
  {
    freeFireUid: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      freeFireUid: {
        $type: "string",
        $ne: "",
      },
    },
  }
);

module.exports = mongoose.model("User", userSchema);