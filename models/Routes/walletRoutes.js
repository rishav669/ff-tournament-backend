const express = require("express");
const mongoose = require("mongoose");

const User = require("../user");
const Transaction = require("../transaction");
const WithdrawRequest = require("../withdrawRequest");
const Settings = require("../settings");

const {
  processReferralReward,
} = require("../referralRewardService");

const {
  createActivityEvent,
} = require("../activityEventService");
const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const router = express.Router();


// ========================================
// HELPER: VALIDATE MONGODB OBJECT ID
// ========================================
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ========================================
// HELPER: VALIDATE AND FORMAT AMOUNT
// ========================================
const getValidAmount = (amount) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return null;
  }

  return Math.round(numericAmount * 100) / 100;
};

// ========================================
// HELPER: VALIDATE UPI ID
// ========================================
const isValidUpiId = (upiId) => {
  const upiPattern = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/;

  return upiPattern.test(String(upiId).trim());
};

// ========================================
// HELPER: FETCH LOGGED-IN USER WALLET
// ========================================
const getWalletData = async (userId) => {
  return User.findById(userId).select(
    "name email freeFireUid freeFireIgn walletBalance totalDeposited totalEntryFeesPaid totalKillRewards totalWinnerRewards totalWinnings totalWithdrawn upiId role isBlocked"
  );
};

// ========================================
// GET WALLET BALANCE
// GET /api/wallet/balance
// ========================================
router.get("/balance", authMiddleware, async (req, res) => {
  try {
    const user = await getWalletData(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Wallet balance fetched successfully",
      walletBalance: Number(user.walletBalance || 0),
    });
  } catch (error) {
    console.error("Get wallet balance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch wallet balance",
      error: error.message,
    });
  }
});

// ========================================
// GET COMPLETE WALLET DETAILS
// GET /api/wallet/my-wallet
// ========================================
router.get("/my-wallet", authMiddleware, async (req, res) => {
  try {
    const user = await getWalletData(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Wallet fetched successfully",

      wallet: {
        userId: user._id,
        name: user.name,
        email: user.email,
        freeFireUid: user.freeFireUid,
        freeFireIgn: user.freeFireIgn,
        role: user.role,

        balance: Number(user.walletBalance || 0),

        totalDeposited: Number(user.totalDeposited || 0),

        totalEntryFeesPaid: Number(
          user.totalEntryFeesPaid || 0
        ),

        totalKillRewards: Number(
          user.totalKillRewards || 0
        ),

        totalWinnerRewards: Number(
          user.totalWinnerRewards || 0
        ),

        totalWinnings: Number(user.totalWinnings || 0),

        totalWithdrawn: Number(user.totalWithdrawn || 0),

        upiId: user.upiId || "",

        isBlocked: Boolean(user.isBlocked),
      },
    });
  } catch (error) {
    console.error("Get wallet error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch wallet",
      error: error.message,
    });
  }
});

// ========================================
// GET MY TRANSACTION HISTORY
// GET /api/wallet/transactions
// ========================================
router.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100
    );

    const skip = (page - 1) * limit;

    const filter = {
      userId: req.user.userId,
    };

    if (req.query.type) {
      filter.transactionType = req.query.type;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [transactions, totalTransactions] = await Promise.all([
      Transaction.find(filter)
        .populate(
          "tournamentId",
          "title tournamentType entryFee status"
        )
        .populate("processedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Transaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Transaction history fetched successfully",

      pagination: {
        currentPage: page,
        limit,
        totalTransactions,
        totalPages: Math.ceil(totalTransactions / limit),
      },

      transactions,
    });
  } catch (error) {
    console.error("Transaction history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch transaction history",
      error: error.message,
    });
  }
});

// ========================================
// SAVE OR UPDATE MY UPI ID
// PUT /api/wallet/update-upi
// ========================================
router.put("/update-upi", authMiddleware, async (req, res) => {
  try {
    const { upiId } = req.body;

    if (!upiId || !String(upiId).trim()) {
      return res.status(400).json({
        success: false,
        message: "UPI ID is required",
      });
    }

    const cleanUpiId = String(upiId)
      .trim()
      .toLowerCase();

    if (!isValidUpiId(cleanUpiId)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid UPI ID",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        upiId: cleanUpiId,
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).select("name email upiId walletBalance");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "UPI ID updated successfully",

      user: {
        name: user.name,
        email: user.email,
        upiId: user.upiId,
        walletBalance: Number(user.walletBalance || 0),
      },
    });
  } catch (error) {
    console.error("Update UPI error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update UPI ID",
      error: error.message,
    });
  }
});
// ========================================
// ADMIN CONFIRM REAL USER DEPOSIT
// POST /api/wallet/admin/deposit
// ========================================
router.post(
  "/admin/deposit",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const session =
      await mongoose.startSession();

    let responseData = null;
    let referralUserId = null;
    let depositActivityEventData = null;

    try {
      const {
        userId,
        amount,
        description,
        paymentReference,
      } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      if (!isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }

      const depositAmount =
        getValidAmount(amount);

      if (!depositAmount) {
        return res.status(400).json({
          success: false,
          message:
            "Deposit amount must be greater than zero",
        });
      }

      const cleanPaymentReference =
        paymentReference &&
        String(paymentReference).trim()
          ? String(paymentReference).trim()
          : "";

      const settings =
        await Settings.findOne();

      if (
        settings &&
        settings.depositEnabled === false
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Deposits are currently disabled",
        });
      }

      const minimumDeposit = Number(
        settings?.minimumDeposit || 0
      );

      if (
        depositAmount < minimumDeposit
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Minimum deposit amount is ₹${minimumDeposit}`,
          minimumDeposit,
        });
      }

      await session.withTransaction(
        async () => {
          const user = await User.findById(
            userId
          ).session(session);

          if (!user) {
            const error = new Error(
              "User not found"
            );

            error.statusCode = 404;
            throw error;
          }

          if (user.isBlocked) {
            const error = new Error(
              "Blocked user wallet cannot receive a deposit"
            );

            error.statusCode = 403;
            throw error;
          }

          const balanceBefore = Number(
            user.walletBalance || 0
          );

          const balanceAfter =
            balanceBefore + depositAmount;

          const totalDepositedBefore =
            Number(
              user.totalDeposited || 0
            );

          const totalDepositedAfter =
            totalDepositedBefore +
            depositAmount;

          user.walletBalance =
            balanceAfter;

          user.totalDeposited =
            totalDepositedAfter;

          await user.save({
            session,
          });

          const [transaction] =
            await Transaction.create(
              [
                {
                  userId: user._id,
                  transactionType:
                    "deposit",
                  amount: depositAmount,
                  balanceBefore,
                  balanceAfter,
                  status: "success",
                  description:
                    description &&
                    String(
                      description
                    ).trim()
                      ? String(
                          description
                        ).trim()
                      : "Deposit verified by admin",
                  processedBy:
                    req.user.userId,
                },
              ],
              {
                session,
              }
            );

          referralUserId = user._id;

          depositActivityEventData = {
            user: {
              _id: user._id,
              name: user.name,
            },
            eventType: "deposit",
            amount: depositAmount,
            eventKey:
              `deposit:${transaction._id}`,
            transactionId:
              transaction._id,
            metadata: {
              paymentReference:
                cleanPaymentReference,
              totalDepositedBefore,
              totalDepositedAfter,
            },
          };

          responseData = {
            success: true,
            message:
              "Deposit confirmed and added to wallet successfully",

            wallet: {
              userId: user._id,
              name: user.name,
              previousBalance:
                balanceBefore,
              depositedAmount:
                depositAmount,
              currentBalance:
                balanceAfter,
              totalDeposited:
                totalDepositedAfter,
            },

            paymentReference:
              cleanPaymentReference ||
              null,

            transaction,
          };
        }
      );

      if (referralUserId) {
        await processReferralReward(
          referralUserId
        );
      }

      if (
        depositActivityEventData
      ) {
        try {
          await createActivityEvent(
            depositActivityEventData
          );
        } catch (activityError) {
          console.error(
            "Deposit activity event error:",
            activityError
          );
        }
      }

      return res
        .status(200)
        .json(responseData);
    } catch (error) {
      console.error(
        "Admin deposit error:",
        error
      );

      if (error.statusCode) {
        return res
          .status(error.statusCode)
          .json({
            success: false,
            message: error.message,
          });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to confirm deposit",
        error: error.message,
      });
    } finally {
      await session.endSession();
    }
  }
);
// ========================================
// ADMIN ADD MONEY TO USER WALLET
// POST /api/wallet/admin/credit
// ========================================
router.post(
  "/admin/credit",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const session =
      await mongoose.startSession();

    let responseData = null;

    try {
      const {
        userId,
        amount,
        description,
      } = req.body || {};

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      if (!isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }

      const creditAmount =
        getValidAmount(amount);

      if (!creditAmount) {
        return res.status(400).json({
          success: false,
          message:
            "Amount must be greater than zero",
        });
      }

      await session.withTransaction(
        async () => {
          const user =
            await User.findById(
              userId
            ).session(session);

          if (!user) {
            const error =
              new Error("User not found");

            error.statusCode = 404;
            throw error;
          }

          if (user.isBlocked) {
            const error =
              new Error(
                "Blocked user wallet cannot be credited"
              );

            error.statusCode = 403;
            throw error;
          }

          const balanceBefore =
            Math.round(
              Number(
                user.walletBalance || 0
              ) * 100
            ) / 100;

          const balanceAfter =
            Math.round(
              (balanceBefore +
                creditAmount) *
                100
            ) / 100;

          user.walletBalance =
            balanceAfter;

          await user.save({
            session,
          });

          const [transaction] =
            await Transaction.create(
              [
                {
                  userId: user._id,

                  transactionType:
                    "admin_credit",

                  amount:
                    creditAmount,

                  balanceBefore,

                  balanceAfter,

                  status:
                    "success",

                  description:
                    description &&
                    String(
                      description
                    ).trim()
                      ? String(
                          description
                        ).trim()
                      : "Money added by admin",

                  processedBy:
                    req.user.userId,
                },
              ],
              {
                session,
              }
            );

          responseData = {
            success: true,

            message:
              "Money added to wallet successfully",

            wallet: {
              userId:
                user._id,

              name:
                user.name,

              previousBalance:
                balanceBefore,

              creditedAmount:
                creditAmount,

              currentBalance:
                balanceAfter,
            },

            transaction,
          };
        }
      );

      return res
        .status(200)
        .json(responseData);
    } catch (error) {
      console.error(
        "Admin credit error:",
        error
      );

      if (error.statusCode) {
        return res
          .status(error.statusCode)
          .json({
            success: false,
            message:
              error.message,
          });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to add money to wallet",
        error:
          error.message,
      });
    } finally {
      await session.endSession();
    }
  }
);

// ========================================
// ADMIN DEBIT MONEY FROM USER WALLET
// POST /api/wallet/admin/debit
// ========================================
router.post(
  "/admin/debit",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { userId, amount, description } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      if (!isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }

      const debitAmount = getValidAmount(amount);

      if (!debitAmount) {
        return res.status(400).json({
          success: false,
          message: "Amount must be greater than zero",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const balanceBefore = Number(user.walletBalance || 0);

      if (balanceBefore < debitAmount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance",
          walletBalance: balanceBefore,
          requestedAmount: debitAmount,
        });
      }

      const balanceAfter = balanceBefore - debitAmount;

      user.walletBalance = balanceAfter;

      await user.save();

      const transaction = await Transaction.create({
        userId: user._id,
        transactionType: "admin_debit",
        amount: debitAmount,
        balanceBefore,
        balanceAfter,
        status: "success",
        description:
          description && String(description).trim()
            ? String(description).trim()
            : "Money deducted by admin",
        processedBy: req.user.userId,
      });

      return res.status(200).json({
        success: true,
        message: "Money deducted from wallet successfully",

        wallet: {
          userId: user._id,
          name: user.name,
          previousBalance: balanceBefore,
          debitedAmount: debitAmount,
          currentBalance: balanceAfter,
        },

        transaction,
      });
    } catch (error) {
      console.error("Admin debit error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to deduct money from wallet",
        error: error.message,
      });
    }
  }
);



// ========================================
// GET MY WITHDRAW REQUESTS
// GET /api/wallet/my-withdrawals
// ========================================
router.get("/my-withdrawals", authMiddleware, async (req, res) => {
  try {
    const withdrawals = await WithdrawRequest.find({
      userId: req.user.userId,
    })
      .populate("processedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Withdrawal requests fetched successfully",
      count: withdrawals.length,
      withdrawals,
    });
  } catch (error) {
    console.error("My withdrawal history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch withdrawal requests",
      error: error.message,
    });
  }
});

// ========================================
// ADMIN GET ALL WITHDRAW REQUESTS
// GET /api/wallet/admin/withdrawals
// ========================================
router.get(
  "/admin/withdrawals",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const filter = {};

      if (req.query.status) {
        filter.status = req.query.status;
      }

      const withdrawals = await WithdrawRequest.find(filter)
        .populate(
          "userId",
          "name email freeFireUid freeFireIgn walletBalance upiId"
        )
        .populate("processedBy", "name email role")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        message: "All withdrawal requests fetched successfully",
        count: withdrawals.length,
        withdrawals,
      });
    } catch (error) {
      console.error("Admin withdrawals error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch withdrawal requests",
        error: error.message,
      });
    }
  }
);





module.exports = router;