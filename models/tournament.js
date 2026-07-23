const mongoose = require("mongoose");

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

const resultSchema = new mongoose.Schema(
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
  },
  {
    _id: false,
  }
);

const tournamentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    game: {
      type: String,
      required: true,
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
    },

    prizePool: {
      type: Number,
      required: true,
      min: 0,
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

    joinedPlayers: {
      type: [joinedPlayerSchema],
      default: [],
    },

    results: {
      type: [resultSchema],
      default: [],
    },

    resultPublished: {
      type: Boolean,
      default: false,
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

    status: {
      type: String,
      enum: ["Upcoming", "Live", "Completed"],
      default: "Upcoming",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Tournament", tournamentSchema);