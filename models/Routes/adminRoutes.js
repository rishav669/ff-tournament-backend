const express = require("express");

const User = require("../user");
const Tournament = require("../tournament");
const Transaction = require("../transaction");
const WithdrawRequest = require("../withdrawRequest");

const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const router = express.Router();

// =====================================
// ADMIN DASHBOARD STATISTICS
// GET /api/admin/dashboard
// =====================================
router.get(
  "/dashboard",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const now = new Date();

      // আজকের শুরু
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      // গত ২৪ ঘণ্টা
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        totalAdmins,
        activeUsers,
        blockedUsers,
        newUsersToday,

        totalTournaments,
        upcomingTournaments,
        liveTournaments,
        completedTournaments,

        walletSummary,
        transactionSummary,
        todayTransactionSummary,

        pendingWithdrawals,
        approvedWithdrawals,
        rejectedWithdrawals,
        withdrawalAmountSummary,

        rewardSummary,
        tournamentSummary,
      ] = await Promise.all([
        // =====================================
        // USER STATISTICS
        // =====================================
        User.countDocuments({
          role: "user",
        }),

        User.countDocuments({
          role: "admin",
        }),

        User.countDocuments({
          role: "user",
          isBlocked: false,
          lastLoginAt: {
            $gte: last24Hours,
          },
        }),

        User.countDocuments({
          role: "user",
          isBlocked: true,
        }),

        User.countDocuments({
          role: "user",
          createdAt: {
            $gte: todayStart,
          },
        }),

        // =====================================
        // TOURNAMENT STATISTICS
        // =====================================
        Tournament.countDocuments(),

        Tournament.countDocuments({
          status: "Upcoming",
        }),

        Tournament.countDocuments({
          status: "Live",
        }),

        Tournament.countDocuments({
          status: "Completed",
        }),

        // =====================================
        // WALLET STATISTICS
        // =====================================
        User.aggregate([
          {
            $match: {
              role: "user",
            },
          },
          {
            $group: {
              _id: null,

              totalWalletBalance: {
                $sum: "$walletBalance",
              },

              totalDepositedFromUsers: {
                $sum: "$totalDeposited",
              },

              totalEntryFeesPaidFromUsers: {
                $sum: "$totalEntryFeesPaid",
              },

              totalKillRewardsFromUsers: {
                $sum: "$totalKillRewards",
              },

              totalWinnerRewardsFromUsers: {
                $sum: "$totalWinnerRewards",
              },

              totalWinningsFromUsers: {
                $sum: "$totalWinnings",
              },

              totalWithdrawnFromUsers: {
                $sum: "$totalWithdrawn",
              },
            },
          },
        ]),

        // =====================================
        // ALL-TIME TRANSACTION STATISTICS
        // =====================================
        Transaction.aggregate([
          {
            $match: {
              status: "success",
            },
          },
          {
            $group: {
              _id: null,

              totalDeposits: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$transactionType", "deposit"],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalEntryFeeCollection: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$transactionType", "entry_fee"],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalKillRewardsPaid: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$transactionType", "kill_reward"],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalWinnerRewardsPaid: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$transactionType", "winner_reward"],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalWithdrawTransactions: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$transactionType", "withdraw"],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalRefunds: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$transactionType", "refund"],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalAdminCredits: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$transactionType", "admin_credit"],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalAdminDebits: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$transactionType", "admin_debit"],
                    },
                    "$amount",
                    0,
                  ],
                },
              },
            },
          },
        ]),

        // =====================================
        // TODAY'S TRANSACTION STATISTICS
        // =====================================
        Transaction.aggregate([
          {
            $match: {
              status: "success",
              createdAt: {
                $gte: todayStart,
              },
            },
          },
          {
            $group: {
              _id: null,

              todayDeposits: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$transactionType", "deposit"],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              todayEntryFees: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$transactionType", "entry_fee"],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              todayRewardsPaid: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        "$transactionType",
                        ["kill_reward", "winner_reward"],
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              todayWithdrawals: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$transactionType", "withdraw"],
                    },
                    "$amount",
                    0,
                  ],
                },
              },
            },
          },
        ]),

        // =====================================
        // WITHDRAW REQUEST COUNTS
        // =====================================
        WithdrawRequest.countDocuments({
          status: "pending",
        }),

        WithdrawRequest.countDocuments({
          status: "approved",
        }),

        WithdrawRequest.countDocuments({
          status: "rejected",
        }),

        // =====================================
        // WITHDRAW REQUEST AMOUNTS
        // =====================================
        WithdrawRequest.aggregate([
          {
            $group: {
              _id: null,

              totalPendingWithdrawalAmount: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$status", "pending"],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalApprovedWithdrawalAmount: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$status", "approved"],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalRejectedWithdrawalAmount: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$status", "rejected"],
                    },
                    "$amount",
                    0,
                  ],
                },
              },
            },
          },
        ]),

        // =====================================
        // TOURNAMENT REWARD STATISTICS
        // =====================================
        Tournament.aggregate([
          {
            $unwind: {
              path: "$results",
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $group: {
              _id: null,

              pendingRewardCount: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$results.rewardStatus", "pending"],
                    },
                    1,
                    0,
                  ],
                },
              },

              approvedRewardCount: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$results.rewardStatus", "approved"],
                    },
                    1,
                    0,
                  ],
                },
              },

              rejectedRewardCount: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$results.rewardStatus", "rejected"],
                    },
                    1,
                    0,
                  ],
                },
              },

              pendingRewardAmount: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$results.rewardStatus", "pending"],
                    },
                    "$results.prizeAmount",
                    0,
                  ],
                },
              },

              approvedRewardAmount: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$results.rewardStatus", "approved"],
                    },
                    "$results.prizeAmount",
                    0,
                  ],
                },
              },

              rejectedRewardAmount: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$results.rewardStatus", "rejected"],
                    },
                    "$results.prizeAmount",
                    0,
                  ],
                },
              },

              totalKillRewardAmount: {
                $sum: "$results.killRewardAmount",
              },

              totalWinnerRewardAmount: {
                $sum: "$results.winnerRewardAmount",
              },

              totalRewardAmount: {
                $sum: "$results.prizeAmount",
              },

              totalPaidRewardAmount: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$results.rewardPaid", true],
                    },
                    "$results.prizeAmount",
                    0,
                  ],
                },
              },
            },
          },
        ]),

        // =====================================
        // TOURNAMENT MONEY/SLOT STATISTICS
        // =====================================
        Tournament.aggregate([
          {
            $group: {
              _id: null,

              totalPrizePool: {
                $sum: "$prizePool",
              },

              totalAvailableSlots: {
                $sum: "$totalSlots",
              },

              totalJoinedSlots: {
                $sum: "$joinedSlots",
              },

              totalPublishedResults: {
                $sum: {
                  $cond: [
                    {
                      $eq: ["$resultPublished", true],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]),
      ]);

      const walletData = walletSummary[0] || {};
      const transactionData = transactionSummary[0] || {};
      const todayTransactionData = todayTransactionSummary[0] || {};
      const withdrawalAmountData = withdrawalAmountSummary[0] || {};
      const rewardData = rewardSummary[0] || {};
      const tournamentData = tournamentSummary[0] || {};

      return res.status(200).json({
        success: true,
        message: "Admin dashboard statistics fetched successfully",

        data: {
          users: {
            totalUsers,
            totalAdmins,
            activeUsersLast24Hours: activeUsers,
            blockedUsers,
            newUsersToday,
          },

          tournaments: {
            totalTournaments,
            upcomingTournaments,
            liveTournaments,
            completedTournaments,

            totalPrizePool: tournamentData.totalPrizePool || 0,
            totalAvailableSlots: tournamentData.totalAvailableSlots || 0,
            totalJoinedSlots: tournamentData.totalJoinedSlots || 0,
            totalPublishedResults:
              tournamentData.totalPublishedResults || 0,
          },

          wallet: {
            totalWalletBalance: walletData.totalWalletBalance || 0,
            totalDepositedFromUsers:
              walletData.totalDepositedFromUsers || 0,
            totalEntryFeesPaidFromUsers:
              walletData.totalEntryFeesPaidFromUsers || 0,
            totalKillRewardsFromUsers:
              walletData.totalKillRewardsFromUsers || 0,
            totalWinnerRewardsFromUsers:
              walletData.totalWinnerRewardsFromUsers || 0,
            totalWinningsFromUsers:
              walletData.totalWinningsFromUsers || 0,
            totalWithdrawnFromUsers:
              walletData.totalWithdrawnFromUsers || 0,
          },

          transactions: {
            totalDeposits: transactionData.totalDeposits || 0,
            totalEntryFeeCollection:
              transactionData.totalEntryFeeCollection || 0,
            totalKillRewardsPaid:
              transactionData.totalKillRewardsPaid || 0,
            totalWinnerRewardsPaid:
              transactionData.totalWinnerRewardsPaid || 0,
            totalRewardsPaid:
              (transactionData.totalKillRewardsPaid || 0) +
              (transactionData.totalWinnerRewardsPaid || 0),
            totalWithdrawTransactions:
              transactionData.totalWithdrawTransactions || 0,
            totalRefunds: transactionData.totalRefunds || 0,
            totalAdminCredits:
              transactionData.totalAdminCredits || 0,
            totalAdminDebits:
              transactionData.totalAdminDebits || 0,
          },

          today: {
            deposits: todayTransactionData.todayDeposits || 0,
            entryFees: todayTransactionData.todayEntryFees || 0,
            rewardsPaid: todayTransactionData.todayRewardsPaid || 0,
            withdrawals: todayTransactionData.todayWithdrawals || 0,
          },

          withdrawals: {
            pendingCount: pendingWithdrawals,
            approvedCount: approvedWithdrawals,
            rejectedCount: rejectedWithdrawals,

            pendingAmount:
              withdrawalAmountData.totalPendingWithdrawalAmount || 0,
            approvedAmount:
              withdrawalAmountData.totalApprovedWithdrawalAmount || 0,
            rejectedAmount:
              withdrawalAmountData.totalRejectedWithdrawalAmount || 0,
          },

          rewards: {
            pendingCount: rewardData.pendingRewardCount || 0,
            approvedCount: rewardData.approvedRewardCount || 0,
            rejectedCount: rewardData.rejectedRewardCount || 0,

            pendingAmount: rewardData.pendingRewardAmount || 0,
            approvedAmount: rewardData.approvedRewardAmount || 0,
            rejectedAmount: rewardData.rejectedRewardAmount || 0,

            totalKillRewardAmount:
              rewardData.totalKillRewardAmount || 0,
            totalWinnerRewardAmount:
              rewardData.totalWinnerRewardAmount || 0,
            totalRewardAmount: rewardData.totalRewardAmount || 0,
            totalPaidRewardAmount:
              rewardData.totalPaidRewardAmount || 0,
          },
        },

        generatedAt: now,
      });
    } catch (error) {
      console.error("Admin dashboard error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch admin dashboard statistics",
        error: error.message,
      });
    }
  }
);

module.exports = router;