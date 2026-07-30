const mongoose = require("mongoose");

const activityEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    eventType: {
      type: String,
      enum: [
        "deposit",
        "tournament_join",
        "tournament_reward",
        "withdrawal",
      ],
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: [
        0,
        "Activity amount cannot be negative",
      ],
    },

    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
    },

    maskedName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    eventKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      immutable: true,
    },

    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      default: null,
    },

    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },

    withdrawRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WithdrawRequest",
      default: null,
    },

    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },

    occurredAt: {
      type: Date,
      default: Date.now,
      index: true,
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

activityEventSchema.index({
  isVisible: 1,
  occurredAt: -1,
});

const ActivityEvent =
  mongoose.models.ActivityEvent ||
  mongoose.model(
    "ActivityEvent",
    activityEventSchema
  );

module.exports = ActivityEvent;