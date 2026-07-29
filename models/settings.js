const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    // ==========================
    // APP
    // ==========================
    appName: {
      type: String,
      default: "FF Tournament",
      trim: true,
    },

    maintenanceMode: {
      type: Boolean,
      default: false,
    },

    registrationEnabled: {
      type: Boolean,
      default: true,
    },

    // ==========================
    // DEPOSIT
    // ==========================
    depositEnabled: {
      type: Boolean,
      default: true,
    },

    minimumDeposit: {
      type: Number,
      default: 10,
      min: 0,
    },

    // ==========================
    // WITHDRAW
    // ==========================
    withdrawalEnabled: {
      type: Boolean,
      default: true,
    },

    minimumWithdrawal: {
      type: Number,
      default: 100,
      min: 0,
    },

    withdrawalFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    withdrawalTimeHours: {
      type: Number,
      default: 24,
      min: 0,
    },

    // ==========================
    // TOURNAMENT
    // ==========================
    joinTournamentEnabled: {
      type: Boolean,
      default: true,
    },

    defaultEntryFee: {
      type: Number,
      default: 50,
      min: 0,
    },

    defaultPrizePool: {
      type: Number,
      default: 1000,
      min: 0,
    },

    perKillReward: {
      type: Number,
      default: 5,
      min: 0,
    },

    maxPlayers: {
      type: Number,
      default: 48,
      min: 1,
    },

    // ==========================
    // REWARDED ADS / COIN
    // ==========================
    rewardedAdsEnabled: {
      type: Boolean,
      default: true,
    },

    coinPerAd: {
      type: Number,
      default: 1,
      min: 1,
    },

    dailyAdLimit: {
      type: Number,
      default: 10,
      min: 0,
    },

    // ==========================
    // COUPON / REDEEM
    // ==========================
    couponRedeemEnabled: {
      type: Boolean,
      default: false,
    },

    coinRequiredForCoupon: {
      type: Number,
      default: 300,
      min: 1,
    },

    couponValue: {
      type: Number,
      default: 50,
      min: 1,
    },

    // ==========================
    // REFERRAL
    // ==========================
    referralEnabled: {
      type: Boolean,
      default: true,
    },

    referralRewardType: {
      type: String,
      enum: ["coin", "wallet"],
      default: "coin",
    },

    referralRewardAmount: {
      type: Number,
      default: 10,
      min: 0,
    },

    referralMinimumDeposit: {
      type: Number,
      default: 50,
      min: 0,
    },

    referralMinimumTournamentEntry: {
      type: Number,
      default: 50,
      min: 0,
    },

    referralRequiredCompletedMatches: {
      type: Number,
      default: 1,
      min: 1,
    },

    referralValidityDays: {
      type: Number,
      default: 30,
      min: 1,
    },

    // ==========================
    // BANNER
    // ==========================
    activityBannerEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports =
  mongoose.models.Settings ||
  mongoose.model("Settings", settingsSchema);