const express = require("express");

const User = require("../user");
const Tournament = require("../tournament");
const Transaction = require("../transaction");
const CoinTransaction = require("../coinTransaction");
const WithdrawRequest = require("../withdrawRequest");

const authMiddleware = require(
  "../../middleware/authMiddleware"
);
const adminMiddleware = require(
  "../../middleware/adminMiddleware"
);

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
      const last24Hours = new Date(
        now.getTime() -
          24 * 60 * 60 * 1000
      );

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
        cancelledTournaments,
        expiredTournaments,

        walletSummary,
        transactionSummary,
        todayTransactionSummary,
        coinSummary,
        todayCoinSummary,
        tournamentPaymentSummary,

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
        // TOURNAMENT STATUS STATISTICS
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

        Tournament.countDocuments({
          status: "Cancelled",
        }),

        Tournament.countDocuments({
          status: "Expired",
        }),

        // =====================================
        // USER WALLET + COIN BALANCE
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

              totalCoinBalance: {
                $sum: "$coinBalance",
              },

              totalDepositedFromUsers: {
                $sum: "$totalDeposited",
              },

              totalEntryFeesPaidFromUsers: {
                $sum:
                  "$totalEntryFeesPaid",
              },

              totalKillRewardsFromUsers: {
                $sum:
                  "$totalKillRewards",
              },

              totalWinnerRewardsFromUsers: {
                $sum:
                  "$totalWinnerRewards",
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
        // ALL-TIME WALLET TRANSACTIONS
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
                      $eq: [
                        "$transactionType",
                        "deposit",
                      ],
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
                      $eq: [
                        "$transactionType",
                        "entry_fee",
                      ],
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
                      $eq: [
                        "$transactionType",
                        "kill_reward",
                      ],
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
                      $eq: [
                        "$transactionType",
                        "winner_reward",
                      ],
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
                      $eq: [
                        "$transactionType",
                        "withdraw",
                      ],
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
                      $eq: [
                        "$transactionType",
                        "refund",
                      ],
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
                      $eq: [
                        "$transactionType",
                        "admin_credit",
                      ],
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
                      $eq: [
                        "$transactionType",
                        "admin_debit",
                      ],
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
        // TODAY'S WALLET TRANSACTIONS
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
                      $eq: [
                        "$transactionType",
                        "deposit",
                      ],
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
                      $eq: [
                        "$transactionType",
                        "entry_fee",
                      ],
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
                        [
                          "kill_reward",
                          "winner_reward",
                        ],
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
                      $eq: [
                        "$transactionType",
                        "withdraw",
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              todayRefunds: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$transactionType",
                        "refund",
                      ],
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
        // ALL-TIME COIN STATISTICS
        // =====================================
        CoinTransaction.aggregate([
          {
            $group: {
              _id: null,

              totalCoinCredits: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$transactionType",
                        "credit",
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalCoinDebits: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$transactionType",
                        "debit",
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalRewardedAdCoins: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: [
                            "$type",
                            "rewarded_ad",
                          ],
                        },
                        {
                          $eq: [
                            "$transactionType",
                            "credit",
                          ],
                        },
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalReferralRewardCoins: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: [
                            "$type",
                            "referral_reward",
                          ],
                        },
                        {
                          $eq: [
                            "$transactionType",
                            "credit",
                          ],
                        },
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalTournamentEntryCoins: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: [
                            "$type",
                            "tournament_entry",
                          ],
                        },
                        {
                          $eq: [
                            "$transactionType",
                            "debit",
                          ],
                        },
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalTournamentRefundCoins: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: [
                            "$type",
                            "tournament_refund",
                          ],
                        },
                        {
                          $eq: [
                            "$transactionType",
                            "credit",
                          ],
                        },
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalCouponRedeemCoins: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: [
                            "$type",
                            "coupon_redeem",
                          ],
                        },
                        {
                          $eq: [
                            "$transactionType",
                            "debit",
                          ],
                        },
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalAdminCoinCredits: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: [
                            "$type",
                            "admin_credit",
                          ],
                        },
                        {
                          $eq: [
                            "$transactionType",
                            "credit",
                          ],
                        },
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              totalAdminCoinDebits: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: [
                            "$type",
                            "admin_debit",
                          ],
                        },
                        {
                          $eq: [
                            "$transactionType",
                            "debit",
                          ],
                        },
                      ],
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
        // TODAY'S COIN STATISTICS
        // =====================================
        CoinTransaction.aggregate([
          {
            $match: {
              createdAt: {
                $gte: todayStart,
              },
            },
          },
          {
            $group: {
              _id: null,

              todayCoinCredits: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$transactionType",
                        "credit",
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              todayCoinDebits: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$transactionType",
                        "debit",
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              todayTournamentEntryCoins: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: [
                            "$type",
                            "tournament_entry",
                          ],
                        },
                        {
                          $eq: [
                            "$transactionType",
                            "debit",
                          ],
                        },
                      ],
                    },
                    "$amount",
                    0,
                  ],
                },
              },

              todayTournamentRefundCoins: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: [
                            "$type",
                            "tournament_refund",
                          ],
                        },
                        {
                          $eq: [
                            "$transactionType",
                            "credit",
                          ],
                        },
                      ],
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
        // WALLET / COIN JOIN SUMMARY
        // =====================================
        Tournament.aggregate([
          {
            $unwind: {
              path: "$joinedPlayers",
              preserveNullAndEmptyArrays:
                false,
            },
          },
          {
            $group: {
              _id: null,

              totalJoinedPlayers: {
                $sum: 1,
              },

              walletJoined: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$joinedPlayers.paymentMethod",
                        "wallet",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              coinJoined: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$joinedPlayers.paymentMethod",
                        "coin",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              freeJoined: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$joinedPlayers.paymentMethod",
                        "free",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              totalWalletCollected: {
                $sum:
                  "$joinedPlayers.walletAmountPaid",
              },

              totalCoinCollected: {
                $sum:
                  "$joinedPlayers.coinAmountPaid",
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
                      $eq: [
                        "$status",
                        "pending",
                      ],
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
                      $eq: [
                        "$status",
                        "approved",
                      ],
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
                      $eq: [
                        "$status",
                        "rejected",
                      ],
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
              preserveNullAndEmptyArrays:
                false,
            },
          },
          {
            $group: {
              _id: null,

              pendingRewardCount: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$results.rewardStatus",
                        "pending",
                      ],
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
                      $eq: [
                        "$results.rewardStatus",
                        "approved",
                      ],
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
                      $eq: [
                        "$results.rewardStatus",
                        "rejected",
                      ],
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
                      $eq: [
                        "$results.rewardStatus",
                        "pending",
                      ],
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
                      $eq: [
                        "$results.rewardStatus",
                        "approved",
                      ],
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
                      $eq: [
                        "$results.rewardStatus",
                        "rejected",
                      ],
                    },
                    "$results.prizeAmount",
                    0,
                  ],
                },
              },

              totalKillRewardAmount: {
                $sum:
                  "$results.killRewardAmount",
              },

              totalWinnerRewardAmount: {
                $sum:
                  "$results.winnerRewardAmount",
              },

              totalRewardAmount: {
                $sum:
                  "$results.prizeAmount",
              },

              totalPaidRewardAmount: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$results.rewardPaid",
                        true,
                      ],
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
        // TOURNAMENT MONEY / SLOT STATS
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
                      $eq: [
                        "$resultPublished",
                        true,
                      ],
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

      const walletData =
        walletSummary[0] || {};

      const transactionData =
        transactionSummary[0] || {};

      const todayTransactionData =
        todayTransactionSummary[0] || {};

      const coinData =
        coinSummary[0] || {};

      const todayCoinData =
        todayCoinSummary[0] || {};

      const tournamentPaymentData =
        tournamentPaymentSummary[0] || {};

      const withdrawalAmountData =
        withdrawalAmountSummary[0] || {};

      const rewardData =
        rewardSummary[0] || {};

      const tournamentData =
        tournamentSummary[0] || {};

      return res.status(200).json({
        success: true,

        message:
          "Admin dashboard statistics fetched successfully",

        data: {
          users: {
            totalUsers,
            totalAdmins,

            activeUsersLast24Hours:
              activeUsers,

            blockedUsers,
            newUsersToday,
          },

          tournaments: {
            totalTournaments,
            upcomingTournaments,
            liveTournaments,
            completedTournaments,
            cancelledTournaments,
            expiredTournaments,

            totalPrizePool:
              tournamentData.totalPrizePool ||
              0,

            totalAvailableSlots:
              tournamentData.totalAvailableSlots ||
              0,

            totalJoinedSlots:
              tournamentData.totalJoinedSlots ||
              0,

            totalPublishedResults:
              tournamentData.totalPublishedResults ||
              0,
          },

          tournamentPayments: {
            totalJoinedPlayers:
              tournamentPaymentData.totalJoinedPlayers ||
              0,

            walletJoined:
              tournamentPaymentData.walletJoined ||
              0,

            coinJoined:
              tournamentPaymentData.coinJoined ||
              0,

            freeJoined:
              tournamentPaymentData.freeJoined ||
              0,

            totalWalletCollected:
              tournamentPaymentData.totalWalletCollected ||
              0,

            totalCoinCollected:
              tournamentPaymentData.totalCoinCollected ||
              0,
          },

          wallet: {
            totalWalletBalance:
              walletData.totalWalletBalance ||
              0,

            totalDepositedFromUsers:
              walletData.totalDepositedFromUsers ||
              0,

            totalEntryFeesPaidFromUsers:
              walletData.totalEntryFeesPaidFromUsers ||
              0,

            totalKillRewardsFromUsers:
              walletData.totalKillRewardsFromUsers ||
              0,

            totalWinnerRewardsFromUsers:
              walletData.totalWinnerRewardsFromUsers ||
              0,

            totalWinningsFromUsers:
              walletData.totalWinningsFromUsers ||
              0,

            totalWithdrawnFromUsers:
              walletData.totalWithdrawnFromUsers ||
              0,
          },

          coins: {
            totalCoinBalance:
              walletData.totalCoinBalance ||
              0,

            totalCoinCredits:
              coinData.totalCoinCredits ||
              0,

            totalCoinDebits:
              coinData.totalCoinDebits ||
              0,

            totalRewardedAdCoins:
              coinData.totalRewardedAdCoins ||
              0,

            totalReferralRewardCoins:
              coinData.totalReferralRewardCoins ||
              0,

            totalTournamentEntryCoins:
              coinData.totalTournamentEntryCoins ||
              0,

            totalTournamentRefundCoins:
              coinData.totalTournamentRefundCoins ||
              0,

            totalCouponRedeemCoins:
              coinData.totalCouponRedeemCoins ||
              0,

            totalAdminCoinCredits:
              coinData.totalAdminCoinCredits ||
              0,

            totalAdminCoinDebits:
              coinData.totalAdminCoinDebits ||
              0,
          },

          transactions: {
            totalDeposits:
              transactionData.totalDeposits ||
              0,

            totalEntryFeeCollection:
              transactionData.totalEntryFeeCollection ||
              0,

            totalKillRewardsPaid:
              transactionData.totalKillRewardsPaid ||
              0,

            totalWinnerRewardsPaid:
              transactionData.totalWinnerRewardsPaid ||
              0,

            totalRewardsPaid:
              (transactionData.totalKillRewardsPaid ||
                0) +
              (transactionData.totalWinnerRewardsPaid ||
                0),

            totalWithdrawTransactions:
              transactionData.totalWithdrawTransactions ||
              0,

            totalRefunds:
              transactionData.totalRefunds ||
              0,

            totalAdminCredits:
              transactionData.totalAdminCredits ||
              0,

            totalAdminDebits:
              transactionData.totalAdminDebits ||
              0,
          },

          today: {
            deposits:
              todayTransactionData.todayDeposits ||
              0,

            entryFees:
              todayTransactionData.todayEntryFees ||
              0,

            rewardsPaid:
              todayTransactionData.todayRewardsPaid ||
              0,

            withdrawals:
              todayTransactionData.todayWithdrawals ||
              0,

            refunds:
              todayTransactionData.todayRefunds ||
              0,

            coinCredits:
              todayCoinData.todayCoinCredits ||
              0,

            coinDebits:
              todayCoinData.todayCoinDebits ||
              0,

            tournamentEntryCoins:
              todayCoinData.todayTournamentEntryCoins ||
              0,

            tournamentRefundCoins:
              todayCoinData.todayTournamentRefundCoins ||
              0,
          },

          withdrawals: {
            pendingCount:
              pendingWithdrawals,

            approvedCount:
              approvedWithdrawals,

            rejectedCount:
              rejectedWithdrawals,

            pendingAmount:
              withdrawalAmountData.totalPendingWithdrawalAmount ||
              0,

            approvedAmount:
              withdrawalAmountData.totalApprovedWithdrawalAmount ||
              0,

            rejectedAmount:
              withdrawalAmountData.totalRejectedWithdrawalAmount ||
              0,
          },

          rewards: {
            pendingCount:
              rewardData.pendingRewardCount ||
              0,

            approvedCount:
              rewardData.approvedRewardCount ||
              0,

            rejectedCount:
              rewardData.rejectedRewardCount ||
              0,

            pendingAmount:
              rewardData.pendingRewardAmount ||
              0,

            approvedAmount:
              rewardData.approvedRewardAmount ||
              0,

            rejectedAmount:
              rewardData.rejectedRewardAmount ||
              0,

            totalKillRewardAmount:
              rewardData.totalKillRewardAmount ||
              0,

            totalWinnerRewardAmount:
              rewardData.totalWinnerRewardAmount ||
              0,

            totalRewardAmount:
              rewardData.totalRewardAmount ||
              0,

            totalPaidRewardAmount:
              rewardData.totalPaidRewardAmount ||
              0,
          },
        },

        generatedAt: now,
      });
    } catch (error) {
      console.error(
        "Admin dashboard error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch admin dashboard statistics",

        error:
          error.message,
      });
    }
  }
);

module.exports = router;
// =====================================
// ADMIN USER LIST
// GET /api/admin/users
// =====================================
router.get(
  "/users",
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
      const search = (req.query.search || "").trim();
      const status = (req.query.status || "all").toLowerCase();
      const role = (req.query.role || "user").toLowerCase();

      const filter = {};

      if (role === "user" || role === "admin") {
        filter.role = role;
      }

      if (status === "blocked") {
        filter.isBlocked = true;
      } else if (status === "active") {
        filter.isBlocked = false;
      }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { freeFireUid: { $regex: search, $options: "i" } },
          { freeFireIgn: { $regex: search, $options: "i" } },
          { referralCode: { $regex: search, $options: "i" } },
        ];
      }

      const [users, totalUsers] = await Promise.all([
        User.find(filter)
          .select(
            "name email freeFireUid freeFireIgn role walletBalance coinBalance freeMatchCoupons referralCode totalDeposited totalEntryFeesPaid totalWinnings totalWithdrawn upiId isBlocked lastLoginAt createdAt updatedAt"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        User.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        message: "Admin user list fetched successfully",
        data: {
          users,
          pagination: {
            currentPage: page,
            limit,
            totalUsers,
            totalPages: Math.ceil(totalUsers / limit),
            hasNextPage: page * limit < totalUsers,
            hasPreviousPage: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Admin user list error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch admin user list",
        error: error.message,
      });
    }
  }
);