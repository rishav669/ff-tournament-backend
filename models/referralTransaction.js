const mongoose = require("mongoose");

const referralTransactionSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    referralCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    rewardType: {
      type: String,
      enum: ["coin", "wallet"],
      required: true,
    },

    rewardAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "eligible",
        "rewarded",
        "rejected",
        "expired",
      ],
      default: "pending",
      index: true,
    },

    minimumDepositRequired: {
      type: Number,
      default: 0,
      min: 0,
    },

    minimumTournamentEntryRequired: {
      type: Number,
      default: 0,
      min: 0,
    },

    requiredCompletedMatches: {
      type: Number,
      default: 1,
      min: 0,
    },

    depositConditionMet: {
      type: Boolean,
      default: false,
    },

    tournamentEntryConditionMet: {
      type: Boolean,
      default: false,
    },

    completedMatchConditionMet: {
      type: Boolean,
      default: false,
    },

    rewardedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    expiredAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

referralTransactionSchema.index({
  referrer: 1,
  status: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "ReferralTransaction",
  referralTransactionSchema
);