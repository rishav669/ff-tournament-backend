const express = require("express");
const router = express.Router();

const User = require("../user");
const Settings = require("../settings");
const CoinTransaction = require("../coinTransaction");

const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

// ========================================
// IST DAY START + END
// ========================================
const getISTDayRange = () => {
  const now = new Date();

  const istNow = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    })
  );

  const startIST = new Date(istNow);
  startIST.setHours(0, 0, 0, 0);

  const endIST = new Date(istNow);
  endIST.setHours(23, 59, 59, 999);

  const offset = 5.5 * 60 * 60 * 1000;

  return {
    start: new Date(startIST.getTime() - offset),
    end: new Date(endIST.getTime() - offset),
  };
};

// ========================================
// GET MY COIN BALANCE
// GET /api/coins/balance
// ========================================
router.get("/balance", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "name coinBalance"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const settings = await Settings.findOne();

    const { start, end } = getISTDayRange();

    const adsWatchedToday = await CoinTransaction.countDocuments({
      user: req.user.userId,
      type: "rewarded_ad",
      transactionType: "credit",
      createdAt: {
        $gte: start,
        $lte: end,
      },
    });

    const dailyAdLimit = settings?.dailyAdLimit ?? 10;

    return res.status(200).json({
      success: true,
      coinBalance: user.coinBalance || 0,
      rewardedAdsEnabled:
        settings?.rewardedAdsEnabled ?? true,
      coinPerAd: settings?.coinPerAd ?? 1,
      dailyAdLimit,
      adsWatchedToday,
      adsRemainingToday: Math.max(
        dailyAdLimit - adsWatchedToday,
        0
      ),
      couponRedeemEnabled:
        settings?.couponRedeemEnabled ?? false,
      redeemStatus:
        settings?.couponRedeemEnabled === true
          ? "available"
          : "upcoming",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========================================
// GET MY COIN HISTORY
// GET /api/coins/history
// ========================================
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const history = await CoinTransaction.find({
      user: req.user.userId,
    })
      .sort({
        createdAt: -1,
      })
      .limit(100);

    return res.status(200).json({
      success: true,
      total: history.length,
      history,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========================================
// CLAIM REWARDED AD COIN
// POST /api/coins/rewarded-ad
// ========================================
router.post(
  "/rewarded-ad",
  authMiddleware,
  async (req, res) => {
    try {
      const { adSessionId } = req.body;

      if (!adSessionId || !String(adSessionId).trim()) {
        return res.status(400).json({
          success: false,
          message: "Ad session ID is required",
        });
      }

      const settings = await Settings.findOne();

      if (!settings) {
        return res.status(404).json({
          success: false,
          message: "App settings not found",
        });
      }

      if (settings.maintenanceMode) {
        return res.status(503).json({
          success: false,
          message: "App is currently under maintenance",
        });
      }

      if (!settings.rewardedAdsEnabled) {
        return res.status(403).json({
          success: false,
          message: "Rewarded ads are currently disabled",
        });
      }

      const duplicateClaim =
        await CoinTransaction.findOne({
          user: req.user.userId,
          type: "rewarded_ad",
          referenceId: String(adSessionId).trim(),
        });

      if (duplicateClaim) {
        return res.status(409).json({
          success: false,
          message: "This ad reward was already claimed",
        });
      }

      const { start, end } = getISTDayRange();

      const adsWatchedToday =
        await CoinTransaction.countDocuments({
          user: req.user.userId,
          type: "rewarded_ad",
          transactionType: "credit",
          createdAt: {
            $gte: start,
            $lte: end,
          },
        });

      const dailyAdLimit = settings.dailyAdLimit ?? 10;

      if (adsWatchedToday >= dailyAdLimit) {
        return res.status(403).json({
          success: false,
          message: "Today's rewarded ad limit is finished",
          dailyAdLimit,
          adsWatchedToday,
          adsRemainingToday: 0,
        });
      }

      const coinReward = settings.coinPerAd ?? 1;

      if (coinReward < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid coin reward setting",
        });
      }

      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.isBlocked) {
        return res.status(403).json({
          success: false,
          message: "Your account is blocked",
        });
      }

      const balanceBefore = user.coinBalance || 0;
      const balanceAfter = balanceBefore + coinReward;

      user.coinBalance = balanceAfter;
      await user.save();

      await CoinTransaction.create({
        user: user._id,
        type: "rewarded_ad",
        transactionType: "credit",
        amount: coinReward,
        balanceBefore,
        balanceAfter,
        description: "Rewarded ad coin received",
        referenceId: String(adSessionId).trim(),
        metadata: {
          adNumberToday: adsWatchedToday + 1,
          dailyAdLimit,
        },
      });

      return res.status(200).json({
        success: true,
        message: `${coinReward} coin earned successfully`,
        earnedCoins: coinReward,
        coinBalance: balanceAfter,
        adsWatchedToday: adsWatchedToday + 1,
        dailyAdLimit,
        adsRemainingToday: Math.max(
          dailyAdLimit - (adsWatchedToday + 1),
          0
        ),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ========================================
// ADMIN - GET USER COIN BALANCE
// GET /api/coins/admin/:userId
// ========================================
router.get(
  "/admin/:userId",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(
        req.params.userId
      ).select("name email coinBalance");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);
// ========================================
// ADMIN CREDIT COINS
// POST /api/coins/admin/credit
// ========================================
router.post(
  "/admin/credit",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { userId, amount, reason } = req.body;

      if (!userId || !amount) {
        return res.status(400).json({
          success: false,
          message: "User ID and amount are required",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const balanceBefore = user.coinBalance || 0;
      const balanceAfter = balanceBefore + Number(amount);

      user.coinBalance = balanceAfter;
      await user.save();

      await CoinTransaction.create({
        user: user._id,
        type: "admin_credit",
        transactionType: "credit",
        amount: Number(amount),
        balanceBefore,
        balanceAfter,
        description: reason || "Admin Coin Credit",
      });

      return res.status(200).json({
        success: true,
        message: "Coin credited successfully",
        coinBalance: balanceAfter,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);
// ========================================
// ADMIN DEBIT COINS
// POST /api/coins/admin/debit
// ========================================
router.post(
  "/admin/debit",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { userId, amount, reason } = req.body;

      if (!userId || !amount) {
        return res.status(400).json({
          success: false,
          message: "User ID and amount are required",
        });
      }

      const debitAmount = Number(amount);

      if (!Number.isFinite(debitAmount) || debitAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be greater than 0",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const balanceBefore = user.coinBalance || 0;

      if (balanceBefore < debitAmount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient coin balance",
          coinBalance: balanceBefore,
        });
      }

      const balanceAfter = balanceBefore - debitAmount;

      user.coinBalance = balanceAfter;
      await user.save();

      await CoinTransaction.create({
        user: user._id,
        type: "admin_debit",
        transactionType: "debit",
        amount: debitAmount,
        balanceBefore,
        balanceAfter,
        description: reason || "Admin Coin Debit",
      });

      return res.status(200).json({
        success: true,
        message: "Coin debited successfully",
        debitedCoins: debitAmount,
        coinBalance: balanceAfter,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);
module.exports = router;