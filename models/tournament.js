const mongoose = require("mongoose");

// =====================================
// JOINED PLAYER SCHEMA
// =====================================
const joinedPlayerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    freeFireUid: {
      type: String,
      required: true,
      trim: true,
    },

    freeFireIgn: {
      type: String,
      required: true,
      trim: true,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

// =====================================
// TOURNAMENT RESULT SCHEMA
// =====================================
const tournamentResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    freeFireUid: {
      type: String,
      required: true,
      trim: true,
    },

    freeFireIgn: {
      type: String,
      required: true,
      trim: true,
    },

    rank: {
      type: Number,
      required: true,
      min: 1,
    },

    kills: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // Kill-এর জন্য কত টাকা reward
    killRewardAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Rank/Winner-এর জন্য কত টাকা reward
    winnerRewardAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Kill reward + Winner reward
    prizeAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    isWinner: {
      type: Boolean,
      default: false,
    },

    // Hacker বা cheating ধরা পড়লে true হবে
    isDisqualified: {
      type: Boolean,
      default: false,
    },

    // Admin verification ছাড়া reward দেওয়া হবে না
    rewardStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    rewardPaid: {
      type: Boolean,
      default: false,
    },

    rewardNote: {
      type: String,
      trim: true,
      default: "",
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    killRewardTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },

    winnerRewardTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
  },
  {
    _id: false,
  }
);

// =====================================
// TOURNAMENT SCHEMA
// =====================================
const tournamentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    game: {
      type: String,
      default: "Free Fire",
      trim: true,
    },

    mode: {
      type: String,
      required: true,
      trim: true,
    },

    map: {
      type: String,
      required: true,
      trim: true,
    },

    entryFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    prizePool: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    totalSlots: {
      type: Number,
      required: true,
      min: 1,
    },

    joinedSlots: {
      type: Number,
      default: 0,
      min: 0,
    },

    date: {
      type: String,
      required: true,
      trim: true,
    },

    time: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["Upcoming", "Live", "Completed"],
      default: "Upcoming",
    },

    roomId: {
      type: String,
      default: "",
      trim: true,
    },

    roomPassword: {
      type: String,
      default: "",
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    joinedPlayers: {
      type: [joinedPlayerSchema],
      default: [],
    },

    results: {
      type: [tournamentResultSchema],
      default: [],
    },

    resultPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Tournament =
  mongoose.models.Tournament ||
  mongoose.model("Tournament", tournamentSchema);

module.exports = Tournament;