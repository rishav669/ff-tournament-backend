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

// Tournament save হওয়ার আগে joinedSlots ঠিক রাখা হবে
tournamentSchema.pre("save", function (next) {
  if (Array.isArray(this.joinedPlayers)) {
    this.joinedSlots = this.joinedPlayers.length;
  }

  next();
});

const Tournament =
  mongoose.models.Tournament ||
  mongoose.model("Tournament", tournamentSchema);

module.exports = Tournament;