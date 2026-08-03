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

    paymentMethod: {
      type: String,
      enum: ["wallet", "coin", "free"],
      default: "wallet",
    },

    walletAmountPaid: {
      type: Number,
      min: 0,
      default: 0,
    },

    coinAmountPaid: {
      type: Number,
      min: 0,
      default: 0,
    },

    walletTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },

    coinTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoinTransaction",
      default: null,
    },

    rulesAccepted: {
      type: Boolean,
      default: false,
    },

    rulesVersionAccepted: {
      type: Number,
      min: 0,
      default: 0,
    },

    rulesLanguageAccepted: {
      type: String,
      enum: ["english", "hindi"],
      default: "english",
    },

    rulesAcceptedAt: {
      type: Date,
      default: null,
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

// Full Map / CS 1v1 / CS 2v2 / CS 4v4
matchType: {
  type: String,
  enum: [
    "full_map",
    "cs_1v1",
    "cs_2v2",
    "cs_4v4",
  ],
  default: "full_map",
},

// Tournament card image
cardImage: {
  type: String,
  trim: true,
  default: "",
},

// Card border/theme colour
themeColor: {
  type: String,
  trim: true,
  default: "#FACC15",
},

// Card-এর উপরে দেখানো mode label
modeLabel: {
  type: String,
  trim: true,
  default: "",
},

// Join button-এর লেখা
joinButtonText: {
  type: String,
  trim: true,
  default: "JOIN NOW",
},

// Details button-এর লেখা
detailsButtonText: {
  type: String,
  trim: true,
  default: "VIEW DETAILS",
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

    coinEntryFee: {
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

// Card-এ Prize Pool নাকি Winning Point দেখাবে
prizeDisplayType: {
  type: String,
  enum: ["prize_pool", "winning_point"],
  default: "prize_pool",
},

// Clash Squad-এর Winning Point
winningPoint: {
  type: Number,
  min: 0,
  default: 0,
},

// প্রতি kill-এর reward
perKillReward: {
  type: Number,
  min: 0,
  default: 0,
},

// Per Kill Reward টাকা নাকি point
perKillRewardUnit: {
  type: String,
  enum: ["rupee", "point"],
  default: "rupee",
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
  enum: [
    "Upcoming",
    "Live",
    "Completed",
    "Cancelled",
    "Expired",
  ],
  default: "Upcoming",
},

cancelReason: {
  type: String,
  trim: true,
  default: "",
},

cancelledAt: {
  type: Date,
  default: null,
},

cancelledBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
},

expireReason: {
  type: String,
  trim: true,
  default: "",
},

expiredAt: {
  type: Date,
  default: null,
},

expiredBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
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