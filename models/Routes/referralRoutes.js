const express = require("express");
console.log("referralRoutes.js loaded");
const User = require("../user");
const Settings = require("../settings");
const ReferralTransaction = require("../referralTransaction");

const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const router = express.Router();

// ==========================================
// GET OR CREATE APPLICATION SETTINGS
// ==========================================
async function getSettings() {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = await Settings.create({});
  }

  return settings;
}

// ==========================================
// GET USER REFERRAL DASHBOARD
// GET /api/referrals/me
// ==========================================
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "name email referralCode referredBy referralRewardGiven coinBalance walletBalance totalDeposited totalEntryFeesPaid isBlocked"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const settings = await getSettings();

    const totalReferrals = await User.countDocuments({
      referredBy: user._id,
    });

    const rewardedReferrals =
      await ReferralTransaction.countDocuments({
        referrer: user._id,
        status: "rewarded",
      });

    const pendingReferrals =
      await ReferralTransaction.countDocuments({
        referrer: user._id,
        status: {
          $in: ["pending", "eligible"],
        },
      });

    const rejectedReferrals =
      await ReferralTransaction.countDocuments({
        referrer: user._id,
        status: {
          $in: ["rejected", "expired"],
        },
      });

    const rewardSummary = await ReferralTransaction.aggregate([
      {
        $match: {
          referrer: user._id,
          status: "rewarded",
        },
      },
      {
        $group: {
          _id: "$rewardType",
          totalAmount: {
            $sum: "$rewardAmount",
          },
          totalRewards: {
            $sum: 1,
          },
        },
      },
    ]);

    let totalCoinEarned = 0;
    let totalWalletEarned = 0;

    rewardSummary.forEach((item) => {
      if (item._id === "coin") {
        totalCoinEarned = item.totalAmount;
      }

      if (item._id === "wallet") {
        totalWalletEarned = item.totalAmount;
      }
    });

    let referrer = null;

    if (user.referredBy) {
      referrer = await User.findById(user.referredBy).select(
        "name referralCode"
      );
    }

    return res.status(200).json({
      success: true,
      message: "Referral dashboard fetched successfully",

      referralSettings: {
        referralEnabled: settings.referralEnabled,
        rewardType: settings.referralRewardType,
        rewardAmount: settings.referralRewardAmount,
        minimumDeposit: settings.referralMinimumDeposit,
        minimumTournamentEntry:
          settings.referralMinimumTournamentEntry,
        requiredCompletedMatches:
          settings.referralRequiredCompletedMatches,
        validityDays: settings.referralValidityDays,
      },

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
        referredBy: referrer,
        referralRewardGiven: user.referralRewardGiven,
        coinBalance: user.coinBalance,
        walletBalance: user.walletBalance,
        totalDeposited: user.totalDeposited,
        totalEntryFeesPaid: user.totalEntryFeesPaid,
      },

      stats: {
        totalReferrals,
        pendingReferrals,
        rewardedReferrals,
        rejectedReferrals,
        totalCoinEarned,
        totalWalletEarned,
      },
    });
  } catch (error) {
    console.error("Referral dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching referral dashboard",
      error: error.message,
    });
  }
});

// ==========================================
// GET USERS REFERRED BY CURRENT USER
// GET /api/referrals/referred-users
// ==========================================
router.get(
  "/referred-users",
  authMiddleware,
  async (req, res) => {
    try {
      const currentUser = await User.findById(
        req.user.userId
      ).select("_id");

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const referredUsers = await User.find({
        referredBy: currentUser._id,
      })
        .select(
          "name freeFireIgn referralRewardGiven totalDeposited totalEntryFeesPaid createdAt"
        )
        .sort({
          createdAt: -1,
        });

      return res.status(200).json({
        success: true,
        total: referredUsers.length,
        referredUsers,
      });
    } catch (error) {
      console.error("Referred users error:", error);

      return res.status(500).json({
        success: false,
        message: "Server error while fetching referred users",
        error: error.message,
      });
    }
  }
);

// ==========================================
// GET USER REFERRAL REWARD HISTORY
// GET /api/referrals/history
// ==========================================
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100
    );

    const skip = (page - 1) * limit;

    const filter = {
      referrer: req.user.userId,
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [history, total] = await Promise.all([
      ReferralTransaction.find(filter)
        .populate("referredUser", "name email freeFireIgn")
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),

      ReferralTransaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      history,
    });
  } catch (error) {
    console.error("Referral history error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching referral history",
      error: error.message,
    });
  }
});

// ==========================================
// ADMIN GET ALL REFERRALS
// GET /api/referrals/admin/all
// ==========================================
router.get(
  "/admin/all",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const page = Math.max(Number(req.query.page) || 1, 1);
      const limit = Math.min(
        Math.max(Number(req.query.limit) || 20, 1),
        100
      );

      const skip = (page - 1) * limit;

      const filter = {};

      if (req.query.status) {
        filter.status = req.query.status;
      }

      if (req.query.rewardType) {
        filter.rewardType = req.query.rewardType;
      }

      const [referrals, total] = await Promise.all([
        ReferralTransaction.find(filter)
          .populate(
            "referrer",
            "name email freeFireUid freeFireIgn referralCode"
          )
          .populate(
            "referredUser",
            "name email freeFireUid freeFireIgn totalDeposited totalEntryFeesPaid referralRewardGiven"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit),

        ReferralTransaction.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        referrals,
      });
    } catch (error) {
      console.error("Admin referral list error:", error);

      return res.status(500).json({
        success: false,
        message: "Server error while fetching referral list",
        error: error.message,
      });
    }
  }
);

// ==========================================
// ADMIN REFERRAL STATISTICS
// GET /api/referrals/admin/stats
// ==========================================
router.get(
  "/admin/stats",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const [
        totalReferredUsers,
        totalTransactions,
        pending,
        eligible,
        rewarded,
        rejected,
        expired,
        rewardSummary,
      ] = await Promise.all([
        User.countDocuments({
          referredBy: {
            $ne: null,
          },
        }),

        ReferralTransaction.countDocuments(),

        ReferralTransaction.countDocuments({
          status: "pending",
        }),

        ReferralTransaction.countDocuments({
          status: "eligible",
        }),

        ReferralTransaction.countDocuments({
          status: "rewarded",
        }),

        ReferralTransaction.countDocuments({
          status: "rejected",
        }),

        ReferralTransaction.countDocuments({
          status: "expired",
        }),

        ReferralTransaction.aggregate([
          {
            $match: {
              status: "rewarded",
            },
          },
          {
            $group: {
              _id: "$rewardType",
              totalAmount: {
                $sum: "$rewardAmount",
              },
              totalRewards: {
                $sum: 1,
              },
            },
          },
        ]),
      ]);

      let totalCoinRewards = 0;
      let totalWalletRewards = 0;

      rewardSummary.forEach((item) => {
        if (item._id === "coin") {
          totalCoinRewards = item.totalAmount;
        }

        if (item._id === "wallet") {
          totalWalletRewards = item.totalAmount;
        }
      });

      return res.status(200).json({
        success: true,
        stats: {
          totalReferredUsers,
          totalTransactions,
          pending,
          eligible,
          rewarded,
          rejected,
          expired,
          totalCoinRewards,
          totalWalletRewards,
        },
      });
    } catch (error) {
      console.error("Admin referral stats error:", error);

      return res.status(500).json({
        success: false,
        message:
          "Server error while fetching referral statistics",
        error: error.message,
      });
    }
  }
);

// ==========================================
// ADMIN GET ONE REFERRED USER DETAILS
// GET /api/referrals/admin/user/:userId
// ==========================================
router.get(
  "/admin/user/:userId",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const referredUser = await User.findById(
        req.params.userId
      )
        .select("-password")
        .populate("referredBy", "name email referralCode");

      if (!referredUser) {
        return res.status(404).json({
          success: false,
          message: "Referred user not found",
        });
      }

      const referralTransaction =
        await ReferralTransaction.findOne({
          referredUser: referredUser._id,
        })
          .populate(
            "referrer",
            "name email freeFireUid freeFireIgn referralCode"
          )
          .populate(
            "referredUser",
            "name email freeFireUid freeFireIgn"
          );

      return res.status(200).json({
        success: true,
        referredUser,
        referralTransaction,
      });
    } catch (error) {
      console.error("Admin referred user details error:", error);

      return res.status(500).json({
        success: false,
        message:
          "Server error while fetching referred user details",
        error: error.message,
      });
    }
  }
);

module.exports = router;