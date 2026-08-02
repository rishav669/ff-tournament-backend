const mongoose = require("mongoose");

const coinTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
  "rewarded_ad",
  "referral_reward",
  "coupon_redeem",
  "tournament_entry",
  "tournament_refund",
  "admin_credit",
  "admin_debit",
],
      required: true,
    },

    transactionType: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: [1, "Coin amount must be at least 1"],
    },

    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },

    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    referenceId: {
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

coinTransactionSchema.index({
  user: 1,
  createdAt: -1,
});

coinTransactionSchema.index(
  {
    user: 1,
    referenceId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      type: "coupon_redeem",
    },
  }
);

module.exports = mongoose.model(
  "CoinTransaction",
  coinTransactionSchema
);