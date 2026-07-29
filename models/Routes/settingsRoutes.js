const express = require("express");

const Settings = require("../settings");

const authMiddleware = require(
  "../../middleware/authMiddleware"
);
const adminMiddleware = require(
  "../../middleware/adminMiddleware"
);

const router = express.Router();

// =====================================
// SETTINGS HELPERS
// =====================================
const BOOLEAN_FIELDS = [
  "maintenanceMode",
  "registrationEnabled",
  "depositEnabled",
  "withdrawalEnabled",
  "joinTournamentEnabled",
  "rewardedAdsEnabled",
  "couponRedeemEnabled",
  "referralEnabled",
  "activityBannerEnabled",
];

const NUMBER_RULES = {
  minimumDeposit: {
    minimum: 0,
    integer: false,
  },

  minimumWithdrawal: {
    minimum: 0,
    integer: false,
  },

  withdrawalFee: {
    minimum: 0,
    integer: false,
  },

  withdrawalTimeHours: {
    minimum: 0,
    integer: false,
  },

  defaultEntryFee: {
    minimum: 0,
    integer: false,
  },

  defaultPrizePool: {
    minimum: 0,
    integer: false,
  },

  perKillReward: {
    minimum: 0,
    integer: false,
  },

  maxPlayers: {
    minimum: 1,
    integer: true,
  },

  coinPerAd: {
    minimum: 1,
    integer: true,
  },

  dailyAdLimit: {
    minimum: 0,
    integer: true,
  },

  coinRequiredForCoupon: {
    minimum: 1,
    integer: true,
  },

  couponValue: {
    minimum: 1,
    integer: false,
  },

  referralRewardAmount: {
    minimum: 1,
    integer: false,
  },

  referralMinimumDeposit: {
    minimum: 0,
    integer: false,
  },

  referralMinimumTournamentEntry: {
    minimum: 0,
    integer: false,
  },

  referralRequiredCompletedMatches: {
    minimum: 1,
    integer: true,
  },

  referralValidityDays: {
    minimum: 1,
    integer: true,
  },
};

const ALLOWED_FIELDS = [
  "appName",
  ...BOOLEAN_FIELDS,
  ...Object.keys(NUMBER_RULES),
  "referralRewardType",
];

// =====================================
// GET OR CREATE SETTINGS
// =====================================
const getOrCreateSettings = async () => {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = await Settings.create({});
  }

  return settings;
};

// =====================================
// FORMAT PUBLIC SETTINGS
// =====================================
const getPublicSettings = (settings) => {
  return {
    appName: settings.appName,

    maintenanceMode:
      settings.maintenanceMode,

    registrationEnabled:
      settings.registrationEnabled,

    depositEnabled:
      settings.depositEnabled,

    minimumDeposit:
      settings.minimumDeposit,

    withdrawalEnabled:
      settings.withdrawalEnabled,

    minimumWithdrawal:
      settings.minimumWithdrawal,

    withdrawalFee:
      settings.withdrawalFee,

    withdrawalTimeHours:
      settings.withdrawalTimeHours,

    joinTournamentEnabled:
      settings.joinTournamentEnabled,

    defaultEntryFee:
      settings.defaultEntryFee,

    defaultPrizePool:
      settings.defaultPrizePool,

    perKillReward:
      settings.perKillReward,

    maxPlayers:
      settings.maxPlayers,

    rewardedAdsEnabled:
      settings.rewardedAdsEnabled,

    coinPerAd:
      settings.coinPerAd,

    dailyAdLimit:
      settings.dailyAdLimit,

    couponRedeemEnabled:
      settings.couponRedeemEnabled,

    coinRequiredForCoupon:
      settings.coinRequiredForCoupon,

    couponValue:
      settings.couponValue,

    couponStatus:
      settings.couponRedeemEnabled === true
        ? "available"
        : "upcoming",

    referralEnabled:
      settings.referralEnabled,

    referralRewardType:
      settings.referralRewardType,

    referralRewardAmount:
      settings.referralRewardAmount,

    referralMinimumDeposit:
      settings.referralMinimumDeposit,

    referralMinimumTournamentEntry:
      settings.referralMinimumTournamentEntry,

    referralRequiredCompletedMatches:
      settings.referralRequiredCompletedMatches,

    referralValidityDays:
      settings.referralValidityDays,

    activityBannerEnabled:
      settings.activityBannerEnabled,
  };
};

// =====================================
// GET PUBLIC APP SETTINGS
// GET /api/settings
// =====================================
router.get("/", async (req, res) => {
  try {
    const settings =
      await getOrCreateSettings();

    return res.status(200).json({
      success: true,

      message:
        "Settings fetched successfully",

      data: getPublicSettings(settings),
    });
  } catch (error) {
    console.error(
      "Get settings error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch settings",

      error: error.message,
    });
  }
});

// =====================================
// GET FULL SETTINGS FOR ADMIN
// GET /api/settings/admin
// =====================================
router.get(
  "/admin",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const settings =
        await getOrCreateSettings();

      return res.status(200).json({
        success: true,

        message:
          "Admin settings fetched successfully",

        data: settings,
      });
    } catch (error) {
      console.error(
        "Get admin settings error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch admin settings",

        error: error.message,
      });
    }
  }
);

// =====================================
// UPDATE SETTINGS
// PUT /api/settings/admin
// =====================================
router.put(
  "/admin",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const updateData = {};

      for (const field of ALLOWED_FIELDS) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body,
            field
          )
        ) {
          updateData[field] =
            req.body[field];
        }
      }

      if (
        Object.keys(updateData).length ===
        0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "No valid settings field provided",
        });
      }

      // =================================
      // VALIDATE APP NAME
      // =================================
      if (
        Object.prototype.hasOwnProperty.call(
          updateData,
          "appName"
        )
      ) {
        if (
          typeof updateData.appName !==
            "string" ||
          !updateData.appName.trim()
        ) {
          return res.status(400).json({
            success: false,

            message:
              "appName must be a non-empty string",
          });
        }

        updateData.appName =
          updateData.appName.trim();
      }

      // =================================
      // VALIDATE BOOLEAN SETTINGS
      // =================================
      for (const field of BOOLEAN_FIELDS) {
        if (
          Object.prototype.hasOwnProperty.call(
            updateData,
            field
          ) &&
          typeof updateData[field] !==
            "boolean"
        ) {
          return res.status(400).json({
            success: false,

            message:
              `${field} must be true or false`,
          });
        }
      }

      // =================================
      // VALIDATE NUMBER SETTINGS
      // =================================
      for (
        const [field, rule] of
        Object.entries(NUMBER_RULES)
      ) {
        if (
          !Object.prototype.hasOwnProperty.call(
            updateData,
            field
          )
        ) {
          continue;
        }

        const value =
          updateData[field];

        if (
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < rule.minimum
        ) {
          return res.status(400).json({
            success: false,

            message:
              `${field} must be a number greater than or equal to ${rule.minimum}`,
          });
        }

        if (
          rule.integer &&
          !Number.isInteger(value)
        ) {
          return res.status(400).json({
            success: false,

            message:
              `${field} must be an integer`,
          });
        }
      }

      // =================================
      // VALIDATE REFERRAL REWARD TYPE
      // =================================
      if (
        Object.prototype.hasOwnProperty.call(
          updateData,
          "referralRewardType"
        ) &&
        !["coin", "wallet"].includes(
          updateData.referralRewardType
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "referralRewardType must be coin or wallet",
        });
      }

      const settings =
        await getOrCreateSettings();

      Object.assign(
        settings,
        updateData
      );

      await settings.save();

      return res.status(200).json({
        success: true,

        message:
          "Settings updated successfully",

        data: settings,
      });
    } catch (error) {
      console.error(
        "Update settings error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to update settings",

        error: error.message,
      });
    }
  }
);

module.exports = router;