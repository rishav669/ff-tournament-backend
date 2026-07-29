const express = require("express");

const Settings = require("../settings");

const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const router = express.Router();

// =====================================
// GET PUBLIC APP SETTINGS
// GET /api/settings
// =====================================
router.get("/", async (req, res) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({});
    }

    return res.status(200).json({
      success: true,
      message: "Settings fetched successfully",
      data: {
        appName: settings.appName,
        maintenanceMode: settings.maintenanceMode,
        registrationEnabled: settings.registrationEnabled,

        depositEnabled: settings.depositEnabled,
        minimumDeposit: settings.minimumDeposit,

        withdrawalEnabled: settings.withdrawalEnabled,
        minimumWithdrawal: settings.minimumWithdrawal,
        withdrawalFee: settings.withdrawalFee,
        withdrawalTimeHours: settings.withdrawalTimeHours,

        joinTournamentEnabled: settings.joinTournamentEnabled,
        defaultEntryFee: settings.defaultEntryFee,
        defaultPrizePool: settings.defaultPrizePool,
        perKillReward: settings.perKillReward,
        maxPlayers: settings.maxPlayers,

        rewardedAdsEnabled: settings.rewardedAdsEnabled,
        coinPerAd: settings.coinPerAd,
        dailyAdLimit: settings.dailyAdLimit,
        coinRequiredForCoupon: settings.coinRequiredForCoupon,
        couponValue: settings.couponValue,

        activityBannerEnabled: settings.activityBannerEnabled,
      },
    });
  } catch (error) {
    console.error("Get settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
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
      let settings = await Settings.findOne();

      if (!settings) {
        settings = await Settings.create({});
      }

      return res.status(200).json({
        success: true,
        message: "Admin settings fetched successfully",
        data: settings,
      });
    } catch (error) {
      console.error("Get admin settings error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch admin settings",
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
      const allowedFields = [
        "appName",
        "maintenanceMode",
        "registrationEnabled",

        "depositEnabled",
        "minimumDeposit",

        "withdrawalEnabled",
        "minimumWithdrawal",
        "withdrawalFee",
        "withdrawalTimeHours",

        "joinTournamentEnabled",
        "defaultEntryFee",
        "defaultPrizePool",
        "perKillReward",
        "maxPlayers",

        "rewardedAdsEnabled",
        "coinPerAd",
        "dailyAdLimit",
        "coinRequiredForCoupon",
        "couponValue",

        "activityBannerEnabled",
      ];

      const updateData = {};

      for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
          updateData[field] = req.body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid settings field provided",
        });
      }

      const nonNegativeNumberFields = [
        "minimumDeposit",
        "minimumWithdrawal",
        "withdrawalFee",
        "withdrawalTimeHours",
        "defaultEntryFee",
        "defaultPrizePool",
        "perKillReward",
        "maxPlayers",
        "coinPerAd",
        "dailyAdLimit",
        "coinRequiredForCoupon",
        "couponValue",
      ];

      for (const field of nonNegativeNumberFields) {
        if (
          Object.prototype.hasOwnProperty.call(updateData, field) &&
          (typeof updateData[field] !== "number" ||
            Number.isNaN(updateData[field]) ||
            updateData[field] < 0)
        ) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a non-negative number`,
          });
        }
      }

      if (
        Object.prototype.hasOwnProperty.call(updateData, "maxPlayers") &&
        updateData.maxPlayers < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "maxPlayers must be at least 1",
        });
      }

      if (
        Object.prototype.hasOwnProperty.call(
          updateData,
          "coinRequiredForCoupon"
        ) &&
        updateData.coinRequiredForCoupon < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "coinRequiredForCoupon must be at least 1",
        });
      }

      let settings = await Settings.findOne();

      if (!settings) {
        settings = await Settings.create(updateData);
      } else {
        Object.assign(settings, updateData);
        await settings.save();
      }

      return res.status(200).json({
        success: true,
        message: "Settings updated successfully",
        data: settings,
      });
    } catch (error) {
      console.error("Update settings error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update settings",
        error: error.message,
      });
    }
  }
);

module.exports = router;