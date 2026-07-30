const mongoose = require("mongoose");

const withdrawRequestSchema =
  new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      // Wallet থেকে মোট যত টাকা কাটা হবে
      amount: {
        type: Number,
        required: true,
        min: 1,
      },

      // Request করার সময় Admin-এর fee percentage
      feePercentageApplied: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      // Percentage হিসাব করে মোট fee
      feeAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      // User-এর UPI-তে পাঠানোর আসল amount
      payoutAmount: {
        type: Number,
        min: 0,
        default: function () {
          return Math.max(
            Number(this.amount || 0) -
              Number(this.feeAmount || 0),
            0
          );
        },
      },

      // Request করার সময় minimum withdrawal
      minimumWithdrawalApplied: {
        type: Number,
        default: 0,
        min: 0,
      },

      upiId: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "approved",
          "rejected",
        ],
        default: "pending",
        index: true,
      },

      adminNote: {
        type: String,
        default: "",
        trim: true,
      },

      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      processedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

withdrawRequestSchema.index({
  userId: 1,
  createdAt: -1,
});

const WithdrawRequest =
  mongoose.models.WithdrawRequest ||
  mongoose.model(
    "WithdrawRequest",
    withdrawRequestSchema
  );

module.exports = WithdrawRequest;