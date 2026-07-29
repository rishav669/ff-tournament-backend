const mongoose = require("mongoose");

// Register referenced models for populate.
require("./tournament");
require("./withdrawRequest");

const transactionSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      tournamentId: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Tournament",
        default: null,
      },

      withdrawRequestId: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "WithdrawRequest",
        default: null,
      },

      referralTransactionId: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "ReferralTransaction",
        default: null,
      },

      transactionType: {
        type: String,
        enum: [
          "deposit",
          "entry_fee",
          "kill_reward",
          "winner_reward",
          "referral_reward",
          "withdraw",
          "refund",
          "admin_credit",
          "admin_debit",
        ],
        required: true,
        index: true,
      },

      amount: {
        type: Number,
        required: true,
        min: 0,
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

      status: {
        type: String,
        enum: [
          "pending",
          "success",
          "failed",
        ],
        default: "success",
        index: true,
      },

      description: {
        type: String,
        trim: true,
        default: "",
      },

      processedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

// User transaction history index
transactionSchema.index({
  userId: 1,
  createdAt: -1,
});

// One wallet reward transaction
// for one referral transaction
transactionSchema.index(
  {
    referralTransactionId: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      referralTransactionId: {
        $type: "objectId",
      },
    },
  }
);

const Transaction =
  mongoose.models.Transaction ||
  mongoose.model(
    "Transaction",
    transactionSchema
  );

module.exports = Transaction;