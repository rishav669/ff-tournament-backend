const express = require("express");
const mongoose = require("mongoose");

const Tournament = require("../tournament");
const User = require("../user");
const Transaction = require("../transaction");

const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const router = express.Router();

// ========================================
// HELPER: VALIDATE MONGODB ID
// ========================================
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ========================================
// HELPER: ROUND MONEY
// ========================================
const roundMoney = (amount) => {
  return Math.round(Number(amount || 0) * 100) / 100;
};

// ========================================
// HELPER: VALIDATE REWARD AMOUNT
// EMPTY AMOUNT WILL BE TREATED AS ZERO
// ========================================
const getValidRewardAmount = (amount) => {
  const numericAmount = Number(amount ?? 0);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount < 0
  ) {
    return null;
  }

  return roundMoney(numericAmount);
};

// ========================================
// HELPER: CREATE ROUTE ERROR
// ========================================
const createRouteError = (
  statusCode,
  message,
  extraData = {}
) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.extraData = extraData;

  return error;
};

// ========================================
// ADMIN GET TOURNAMENT REWARD LIST
// GET /api/rewards/tournament/:tournamentId
//
// Optional:
// ?status=pending
// ?status=approved
// ?status=rejected
// ========================================
router.get(
  "/tournament/:tournamentId",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { status } = req.query;

      if (!isValidObjectId(tournamentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid tournament ID",
        });
      }

      const allowedStatuses = [
        "pending",
        "approved",
        "rejected",
      ];

      if (
        status &&
        !allowedStatuses.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Status must be pending, approved or rejected",
        });
      }

      const tournament =
        await Tournament.findById(
          tournamentId
        ).populate(
          "results.verifiedBy",
          "name email role"
        );

      if (!tournament) {
        return res.status(404).json({
          success: false,
          message: "Tournament not found",
        });
      }

      if (!tournament.resultPublished) {
        return res.status(400).json({
          success: false,
          message:
            "Tournament results have not been published yet",
        });
      }

      const rewards = status
        ? tournament.results.filter(
            (result) =>
              (result.rewardStatus ||
                "pending") === status
          )
        : tournament.results;

      return res.status(200).json({
        success: true,
        message:
          "Tournament reward list fetched successfully",

        tournament: {
          id: tournament._id,
          title: tournament.title,
          status: tournament.status,
          prizePool: roundMoney(
            tournament.prizePool
          ),
        },

        count: rewards.length,
        rewards,
      });
    } catch (error) {
      console.error(
        "Get tournament rewards error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch tournament rewards",
        error: error.message,
      });
    }
  }
);

// ========================================
// ADMIN APPROVE PLAYER REWARD
// PUT /api/rewards/:tournamentId/:userId/approve
//
// Body:
// {
//   "killRewardAmount": 90,
//   "winnerRewardAmount": 910,
//   "rewardNote": "Gameplay checked and verified"
// }
//
// ADMIN APPROVE না করলে wallet-এ reward যাবে না.
// Automatic withdrawal হবে না.
// ========================================
router.put(
  "/:tournamentId/:userId/approve",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    let session = null;

    try {
      session = await mongoose.startSession();

      let responseData = null;

      await session.withTransaction(
        async () => {
          const { tournamentId, userId } =
            req.params;

          const {
            killRewardAmount,
            winnerRewardAmount,
            rewardNote,
          } = req.body || {};

          if (
            !isValidObjectId(tournamentId)
          ) {
            throw createRouteError(
              400,
              "Invalid tournament ID"
            );
          }

          if (!isValidObjectId(userId)) {
            throw createRouteError(
              400,
              "Invalid user ID"
            );
          }

          const validKillReward =
            getValidRewardAmount(
              killRewardAmount
            );

          const validWinnerReward =
            getValidRewardAmount(
              winnerRewardAmount
            );

          if (validKillReward === null) {
            throw createRouteError(
              400,
              "Kill reward must be zero or greater"
            );
          }

          if (
            validWinnerReward === null
          ) {
            throw createRouteError(
              400,
              "Winner reward must be zero or greater"
            );
          }

          const totalReward = roundMoney(
            validKillReward +
              validWinnerReward
          );

          if (totalReward <= 0) {
            throw createRouteError(
              400,
              "Total reward must be greater than zero"
            );
          }

          const tournament =
            await Tournament.findById(
              tournamentId
            ).session(session);

          if (!tournament) {
            throw createRouteError(
              404,
              "Tournament not found"
            );
          }

          if (
            !tournament.resultPublished
          ) {
            throw createRouteError(
              400,
              "Tournament results have not been published yet"
            );
          }

          const result =
            tournament.results.find(
              (item) =>
                item.userId.toString() ===
                userId.toString()
            );

          if (!result) {
            throw createRouteError(
              404,
              "Player result not found in this tournament"
            );
          }

          const currentRewardStatus =
            result.rewardStatus ||
            "pending";

          if (result.isDisqualified) {
            throw createRouteError(
              400,
              "Disqualified player cannot receive reward"
            );
          }

          if (
            result.rewardPaid ||
            currentRewardStatus ===
              "approved"
          ) {
            throw createRouteError(
              400,
              "Reward has already been approved"
            );
          }

          if (
            currentRewardStatus ===
            "rejected"
          ) {
            throw createRouteError(
              400,
              "Rejected reward cannot be approved"
            );
          }

          if (
            validWinnerReward > 0 &&
            Number(result.rank) !== 1 &&
            !result.isWinner
          ) {
            throw createRouteError(
              400,
              "Only the rank 1 player can receive winner reward"
            );
          }

          const alreadyApprovedTotal =
            tournament.results.reduce(
              (total, item) => {
                if (
                  item.userId.toString() ===
                  userId.toString()
                ) {
                  return total;
                }

                if (
                  item.rewardStatus !==
                    "approved" ||
                  !item.rewardPaid
                ) {
                  return total;
                }

                return roundMoney(
                  total +
                    Number(
                      item.prizeAmount || 0
                    )
                );
              },
              0
            );

          const prizePool = roundMoney(
            tournament.prizePool
          );

          const newApprovedTotal =
            roundMoney(
              alreadyApprovedTotal +
                totalReward
            );

          if (
            newApprovedTotal > prizePool
          ) {
            throw createRouteError(
              400,
              "Approved rewards cannot exceed tournament prize pool",
              {
                prizePool,
                alreadyApproved:
                  alreadyApprovedTotal,
                requestedReward:
                  totalReward,
                newApprovedTotal,
              }
            );
          }

          const user = await User.findById(
            userId
          ).session(session);

          if (!user) {
            throw createRouteError(
              404,
              "Reward user not found"
            );
          }

          if (user.isBlocked) {
            throw createRouteError(
              403,
              "Blocked user cannot receive reward"
            );
          }

          const balanceBefore =
            roundMoney(
              user.walletBalance
            );

          let runningBalance =
            balanceBefore;

          const transactionData = [];

          // ========================================
          // KILL REWARD TRANSACTION
          // ========================================
          if (validKillReward > 0) {
            const killBalanceBefore =
              runningBalance;

            runningBalance = roundMoney(
              runningBalance +
                validKillReward
            );

            transactionData.push({
              userId: user._id,

              tournamentId:
                tournament._id,

              transactionType:
                "kill_reward",

              amount: validKillReward,

              balanceBefore:
                killBalanceBefore,

              balanceAfter:
                runningBalance,

              status: "success",

              description: `Kill reward approved for ${tournament.title}`,

              processedBy:
                req.user.userId,
            });
          }

          // ========================================
          // WINNER REWARD TRANSACTION
          // ========================================
          if (
            validWinnerReward > 0
          ) {
            const winnerBalanceBefore =
              runningBalance;

            runningBalance = roundMoney(
              runningBalance +
                validWinnerReward
            );

            transactionData.push({
              userId: user._id,

              tournamentId:
                tournament._id,

              transactionType:
                "winner_reward",

              amount:
                validWinnerReward,

              balanceBefore:
                winnerBalanceBefore,

              balanceAfter:
                runningBalance,

              status: "success",

              description: `Winner reward approved for ${tournament.title}`,

              processedBy:
                req.user.userId,
            });
          }

          // ========================================
          // CREATE REWARD TRANSACTIONS
          // ordered: true FIXES MULTIPLE DOC SESSION ERROR
          // ========================================
          const createdTransactions =
            await Transaction.create(
              transactionData,
              {
                session,
                ordered: true,
              }
            );

          const killTransaction =
            createdTransactions.find(
              (transaction) =>
                transaction.transactionType ===
                "kill_reward"
            );

          const winnerTransaction =
            createdTransactions.find(
              (transaction) =>
                transaction.transactionType ===
                "winner_reward"
            );

          // ========================================
          // UPDATE USER WALLET
          // ========================================
          user.walletBalance =
            runningBalance;

          user.totalKillRewards =
            roundMoney(
              Number(
                user.totalKillRewards || 0
              ) + validKillReward
            );

          user.totalWinnerRewards =
            roundMoney(
              Number(
                user.totalWinnerRewards ||
                  0
              ) + validWinnerReward
            );

          user.totalWinnings =
            roundMoney(
              Number(
                user.totalWinnings || 0
              ) + totalReward
            );

          await user.save({ session });

          // ========================================
          // UPDATE RESULT VERIFICATION
          // ========================================
          result.killRewardAmount =
            validKillReward;

          result.winnerRewardAmount =
            validWinnerReward;

          result.prizeAmount =
            totalReward;

          result.rewardStatus =
            "approved";

          result.rewardPaid = true;

          result.isDisqualified = false;

          result.rewardNote =
            rewardNote &&
            String(rewardNote).trim()
              ? String(rewardNote).trim()
              : "Gameplay verified and reward approved";

          result.verifiedBy =
            req.user.userId;

          result.verifiedAt =
            new Date();

          result.killRewardTransactionId =
            killTransaction
              ? killTransaction._id
              : null;

          result.winnerRewardTransactionId =
            winnerTransaction
              ? winnerTransaction._id
              : null;

          await tournament.save({
            session,
          });

          responseData = {
            success: true,

            message:
              "Player reward approved and added to wallet",

            tournament: {
              id: tournament._id,
              title: tournament.title,
            },

            player: {
              userId: user._id,
              name: user.name,

              freeFireUid:
                result.freeFireUid,

              freeFireIgn:
                result.freeFireIgn,

              rank: result.rank,
              kills: result.kills,
            },

            reward: {
              killRewardAmount:
                validKillReward,

              winnerRewardAmount:
                validWinnerReward,

              totalReward,

              status:
                result.rewardStatus,

              rewardPaid:
                result.rewardPaid,

              note:
                result.rewardNote,
            },

            wallet: {
              previousBalance:
                balanceBefore,

              creditedAmount:
                totalReward,

              currentBalance:
                runningBalance,
            },

            transactions:
              createdTransactions,
          };
        }
      );

      return res
        .status(200)
        .json(responseData);
    } catch (error) {
      if (error.statusCode) {
        return res
          .status(error.statusCode)
          .json({
            success: false,
            message: error.message,
            ...(error.extraData || {}),
          });
      }

      console.error(
        "Approve reward error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to approve player reward",
        error: error.message,
      });
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }
);

// ========================================
// ADMIN REJECT PLAYER REWARD
// PUT /api/rewards/:tournamentId/:userId/reject
//
// Body:
// {
//   "rewardNote": "Hacker detected",
//   "isDisqualified": true
// }
//
// REJECT করলে wallet-এ কোনো টাকা যাবে না.
// ========================================
router.put(
  "/:tournamentId/:userId/reject",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { tournamentId, userId } =
        req.params;

      const {
        rewardNote,
        isDisqualified = true,
      } = req.body || {};

      if (!isValidObjectId(tournamentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid tournament ID",
        });
      }

      if (!isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }

      if (
        typeof isDisqualified !==
        "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "isDisqualified must be true or false",
        });
      }

      const tournament =
        await Tournament.findById(
          tournamentId
        );

      if (!tournament) {
        return res.status(404).json({
          success: false,
          message: "Tournament not found",
        });
      }

      if (!tournament.resultPublished) {
        return res.status(400).json({
          success: false,
          message:
            "Tournament results have not been published yet",
        });
      }

      const result =
        tournament.results.find(
          (item) =>
            item.userId.toString() ===
            userId.toString()
        );

      if (!result) {
        return res.status(404).json({
          success: false,
          message:
            "Player result not found in this tournament",
        });
      }

      const currentRewardStatus =
        result.rewardStatus || "pending";

      if (
        result.rewardPaid ||
        currentRewardStatus === "approved"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Paid reward cannot be rejected",
        });
      }

      if (
        currentRewardStatus ===
        "rejected"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Reward has already been rejected",
        });
      }

      result.killRewardAmount = 0;
      result.winnerRewardAmount = 0;
      result.prizeAmount = 0;

      result.rewardStatus =
        "rejected";

      result.rewardPaid = false;

      result.isDisqualified =
        isDisqualified;

      result.rewardNote =
        rewardNote &&
        String(rewardNote).trim()
          ? String(rewardNote).trim()
          : "Reward rejected by admin";

      result.verifiedBy =
        req.user.userId;

      result.verifiedAt = new Date();

      result.killRewardTransactionId =
        null;

      result.winnerRewardTransactionId =
        null;

      await tournament.save();

      return res.status(200).json({
        success: true,

        message:
          "Player reward rejected. No money was added to wallet.",

        tournament: {
          id: tournament._id,
          title: tournament.title,
        },

        player: {
          userId: result.userId,

          freeFireUid:
            result.freeFireUid,

          freeFireIgn:
            result.freeFireIgn,

          rank: result.rank,
          kills: result.kills,
        },

        reward: {
          killRewardAmount:
            result.killRewardAmount,

          winnerRewardAmount:
            result.winnerRewardAmount,

          totalReward:
            result.prizeAmount,

          status:
            result.rewardStatus,

          rewardPaid:
            result.rewardPaid,

          isDisqualified:
            result.isDisqualified,

          note: result.rewardNote,
        },
      });
    } catch (error) {
      console.error(
        "Reject reward error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to reject player reward",
        error: error.message,
      });
    }
  }
);

module.exports = router;