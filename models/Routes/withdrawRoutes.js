const express = require("express");
const mongoose = require("mongoose");

const User = require("../user");
const Transaction = require("../transaction");
const WithdrawRequest = require("../withdrawRequest");

const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const router = express.Router();

// =====================================
// CUSTOM ROUTE ERROR
// =====================================
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

// =====================================
// ROUND MONEY TO 2 DECIMAL PLACES
// =====================================
const roundMoney = (amount) => {
  return (
    Math.round(
      (Number(amount) + Number.EPSILON) *
        100
    ) / 100
  );
};

// =====================================
// NEXT CODE WILL START BELOW THIS LINE
// =====================================
// =====================================
// CREATE WITHDRAW REQUEST
// POST /api/withdrawals/request
// =====================================
router.post("/request", authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { amount, upiId } = req.body;

    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !Number.isFinite(Number(amount))
    ) {
      throw createRouteError(
        400,
        "A valid withdrawal amount is required"
      );
    }

    const withdrawalAmount = roundMoney(amount);
    const normalizedUpiId = String(upiId || "")
      .trim()
      .toLowerCase();

    if (withdrawalAmount <= 0) {
      throw createRouteError(
        400,
        "Withdrawal amount must be greater than zero"
      );
    }

    if (!normalizedUpiId) {
      throw createRouteError(
        400,
        "UPI ID is required"
      );
    }

    const upiIdPattern =
      /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/;

    if (!upiIdPattern.test(normalizedUpiId)) {
      throw createRouteError(
        400,
        "Please enter a valid UPI ID"
      );
    }

    let responseData = null;

    await session.withTransaction(async () => {
      const user = await User.findById(
        req.user.userId
      ).session(session);

      if (!user) {
        throw createRouteError(
          404,
          "User not found"
        );
      }

      if (user.isBlocked) {
        throw createRouteError(
          403,
          "Your account is blocked. Withdrawal is not allowed."
        );
      }

      const existingPendingRequest =
        await WithdrawRequest.findOne({
          userId: user._id,
          status: "pending",
        }).session(session);

      if (existingPendingRequest) {
        throw createRouteError(
          409,
          "You already have a pending withdrawal request",
          {
            pendingRequestId:
              existingPendingRequest._id,
          }
        );
      }

      const balanceBefore = roundMoney(
        user.walletBalance || 0
      );

      if (withdrawalAmount > balanceBefore) {
        throw createRouteError(
          400,
          "Insufficient wallet balance",
          {
            walletBalance: balanceBefore,
          }
        );
      }

      const balanceAfter = roundMoney(
        balanceBefore - withdrawalAmount
      );

      user.walletBalance = balanceAfter;
      user.upiId = normalizedUpiId;

      await user.save({
        session,
      });

      const createdRequests =
        await WithdrawRequest.create(
          [
            {
              userId: user._id,
              amount: withdrawalAmount,
              upiId: normalizedUpiId,
              status: "pending",
            },
          ],
          {
            session,
          }
        );

      const withdrawRequest =
        createdRequests[0];

      const createdTransactions =
        await Transaction.create(
          [
            {
              userId: user._id,
              withdrawRequestId:
                withdrawRequest._id,
              transactionType: "withdraw",
              amount: withdrawalAmount,
              balanceBefore,
              balanceAfter,
              status: "pending",
              description:
                "Withdrawal request submitted and awaiting admin approval",
            },
          ],
          {
            session,
          }
        );

      const transaction =
        createdTransactions[0];

      responseData = {
        withdrawRequest: {
          id: withdrawRequest._id,
          amount: withdrawRequest.amount,
          upiId: withdrawRequest.upiId,
          status: withdrawRequest.status,
          createdAt:
            withdrawRequest.createdAt,
        },

        wallet: {
          balanceBefore,
          deductedAmount: withdrawalAmount,
          walletBalance: balanceAfter,
        },

        transactionId: transaction._id,
      };
    });

    return res.status(201).json({
      message:
        "Withdrawal request submitted successfully",
      processingMessage:
        "Your withdrawal is pending and may take up to 24 hours",
      ...responseData,
    });
  } catch (error) {
    console.error(
      "Create withdrawal request error:",
      error
    );

    const statusCode =
      error.statusCode || 500;

    const errorResponse = {
      message:
        error.statusCode
          ? error.message
          : "Server error while creating withdrawal request",
    };

    if (error.extraData) {
      Object.assign(
        errorResponse,
        error.extraData
      );
    }

    if (
      !error.statusCode &&
      process.env.NODE_ENV !== "production"
    ) {
      errorResponse.error = error.message;
    }

    return res
      .status(statusCode)
      .json(errorResponse);
  } finally {
    await session.endSession();
  }
});

// =====================================
// NEXT CODE WILL START BELOW THIS LINE
// =====================================
// =====================================
// GET MY WITHDRAWAL HISTORY
// GET /api/withdrawals/my-history
// =====================================
router.get("/my-history", authMiddleware, async (req, res) => {
  try {
    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      50
    );

    const skip = (page - 1) * limit;

    const allowedStatuses = [
      "pending",
      "approved",
      "rejected",
    ];

    const filter = {
      userId: req.user.userId,
    };

    if (req.query.status) {
      const requestedStatus = String(req.query.status)
        .trim()
        .toLowerCase();

      if (!allowedStatuses.includes(requestedStatus)) {
        return res.status(400).json({
          message:
            "Status must be pending, approved or rejected",
        });
      }

      filter.status = requestedStatus;
    }

    const [withdrawals, totalWithdrawals] =
      await Promise.all([
        WithdrawRequest.find(filter)
          .populate(
            "processedBy",
            "name email role"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        WithdrawRequest.countDocuments(filter),
      ]);

    const formattedWithdrawals = withdrawals.map(
      (withdrawal) => ({
        id: withdrawal._id,
        amount: withdrawal.amount,
        upiId: withdrawal.upiId,
        status: withdrawal.status,
        adminNote: withdrawal.adminNote,
        processedBy: withdrawal.processedBy,
        processedAt: withdrawal.processedAt,
        createdAt: withdrawal.createdAt,
        updatedAt: withdrawal.updatedAt,
        processingMessage:
          withdrawal.status === "pending"
            ? "Processing may take up to 24 hours"
            : null,
      })
    );

    const totalPages = Math.ceil(
      totalWithdrawals / limit
    );

    return res.status(200).json({
      message:
        "Withdrawal history fetched successfully",
      withdrawals: formattedWithdrawals,
      pagination: {
        currentPage: page,
        totalPages,
        totalWithdrawals,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error(
      "Get withdrawal history error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while fetching withdrawal history",
      error:
        process.env.NODE_ENV !== "production"
          ? error.message
          : undefined,
    });
  }
});

// =====================================
// CHECK MY PENDING WITHDRAWAL
// GET /api/withdrawals/pending
// =====================================
router.get("/pending", authMiddleware, async (req, res) => {
  try {
    const pendingWithdrawal =
      await WithdrawRequest.findOne({
        userId: req.user.userId,
        status: "pending",
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    if (!pendingWithdrawal) {
      return res.status(200).json({
        message:
          "No pending withdrawal request found",
        hasPendingWithdrawal: false,
        withdrawal: null,
      });
    }

    const pendingTransaction =
      await Transaction.findOne({
        userId: req.user.userId,
        withdrawRequestId:
          pendingWithdrawal._id,
        transactionType: "withdraw",
      })
        .select(
          "_id amount balanceBefore balanceAfter status createdAt"
        )
        .lean();

    return res.status(200).json({
      message:
        "Pending withdrawal request found",
      hasPendingWithdrawal: true,
      processingMessage:
        "Your withdrawal is pending and may take up to 24 hours",
      withdrawal: {
        id: pendingWithdrawal._id,
        amount: pendingWithdrawal.amount,
        upiId: pendingWithdrawal.upiId,
        status: pendingWithdrawal.status,
        createdAt: pendingWithdrawal.createdAt,
        updatedAt: pendingWithdrawal.updatedAt,
      },
      transaction: pendingTransaction
        ? {
            id: pendingTransaction._id,
            amount: pendingTransaction.amount,
            balanceBefore:
              pendingTransaction.balanceBefore,
            balanceAfter:
              pendingTransaction.balanceAfter,
            status: pendingTransaction.status,
            createdAt:
              pendingTransaction.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error(
      "Check pending withdrawal error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while checking pending withdrawal",
      error:
        process.env.NODE_ENV !== "production"
          ? error.message
          : undefined,
    });
  }
});

// =====================================
// NEXT CODE WILL START BELOW THIS LINE
// =====================================
// =====================================
// GET ALL PENDING WITHDRAWALS
// GET /api/withdrawals/admin/pending
// =====================================
router.get(
  "/admin/pending",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const page = Math.max(
        parseInt(req.query.page, 10) || 1,
        1
      );

      const limit = Math.min(
        Math.max(parseInt(req.query.limit, 10) || 20, 1),
        100
      );

      const skip = (page - 1) * limit;

      const [withdrawals, totalPendingWithdrawals] =
        await Promise.all([
          WithdrawRequest.find({
            status: "pending",
          })
            .populate(
              "userId",
              "name email freeFireUid freeFireIgn walletBalance upiId isBlocked"
            )
            .sort({
              createdAt: 1,
            })
            .skip(skip)
            .limit(limit)
            .lean(),

          WithdrawRequest.countDocuments({
            status: "pending",
          }),
        ]);

      const formattedWithdrawals = withdrawals.map(
        (withdrawal) => ({
          id: withdrawal._id,
          amount: withdrawal.amount,
          upiId: withdrawal.upiId,
          status: withdrawal.status,
          adminNote: withdrawal.adminNote,
          createdAt: withdrawal.createdAt,
          updatedAt: withdrawal.updatedAt,
          user: withdrawal.userId
            ? {
                id: withdrawal.userId._id,
                name: withdrawal.userId.name,
                email: withdrawal.userId.email,
                freeFireUid:
                  withdrawal.userId.freeFireUid,
                freeFireIgn:
                  withdrawal.userId.freeFireIgn,
                walletBalance:
                  withdrawal.userId.walletBalance,
                savedUpiId:
                  withdrawal.userId.upiId,
                isBlocked:
                  withdrawal.userId.isBlocked,
              }
            : null,
        })
      );

      const totalPages = Math.ceil(
        totalPendingWithdrawals / limit
      );

      return res.status(200).json({
        message:
          "Pending withdrawals fetched successfully",
        withdrawals: formattedWithdrawals,
        pagination: {
          currentPage: page,
          totalPages,
          totalPendingWithdrawals,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      });
    } catch (error) {
      console.error(
        "Get pending withdrawals error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error while fetching pending withdrawals",
        error:
          process.env.NODE_ENV !== "production"
            ? error.message
            : undefined,
      });
    }
  }
);

// =====================================
// APPROVE WITHDRAWAL REQUEST
// PATCH /api/withdrawals/admin/:withdrawRequestId/approve
// =====================================
router.patch(
  "/admin/:withdrawRequestId/approve",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      const { withdrawRequestId } = req.params;
      const adminNote = String(
        req.body.adminNote || ""
      ).trim();

      if (
        !mongoose.isValidObjectId(withdrawRequestId)
      ) {
        throw createRouteError(
          400,
          "Invalid withdrawal request ID"
        );
      }

      let responseData = null;

      await session.withTransaction(async () => {
        const withdrawRequest =
          await WithdrawRequest.findById(
            withdrawRequestId
          ).session(session);

        if (!withdrawRequest) {
          throw createRouteError(
            404,
            "Withdrawal request not found"
          );
        }

        if (withdrawRequest.status !== "pending") {
          throw createRouteError(
            409,
            `This withdrawal request is already ${withdrawRequest.status}`
          );
        }

        const user = await User.findById(
          withdrawRequest.userId
        ).session(session);

        if (!user) {
          throw createRouteError(
            404,
            "Withdrawal user not found"
          );
        }

        const withdrawTransaction =
          await Transaction.findOne({
            userId: user._id,
            withdrawRequestId:
              withdrawRequest._id,
            transactionType: "withdraw",
          }).session(session);

        if (!withdrawTransaction) {
          throw createRouteError(
            404,
            "Withdrawal transaction not found"
          );
        }

        if (withdrawTransaction.status !== "pending") {
          throw createRouteError(
            409,
            `Withdrawal transaction is already ${withdrawTransaction.status}`
          );
        }

        withdrawRequest.status = "approved";
        withdrawRequest.adminNote = adminNote;
        withdrawRequest.processedBy =
          req.user.userId;
        withdrawRequest.processedAt =
          new Date();

        await withdrawRequest.save({
          session,
        });

        user.totalWithdrawn = roundMoney(
          Number(user.totalWithdrawn || 0) +
            Number(withdrawRequest.amount)
        );

        await user.save({
          session,
        });

        withdrawTransaction.status = "success";
        withdrawTransaction.processedBy =
          req.user.userId;
        withdrawTransaction.description =
          adminNote
            ? `Withdrawal approved by admin. Note: ${adminNote}`
            : "Withdrawal approved by admin";

        await withdrawTransaction.save({
          session,
        });

        responseData = {
          withdrawal: {
            id: withdrawRequest._id,
            userId: withdrawRequest.userId,
            amount: withdrawRequest.amount,
            upiId: withdrawRequest.upiId,
            status: withdrawRequest.status,
            adminNote:
              withdrawRequest.adminNote,
            processedBy:
              withdrawRequest.processedBy,
            processedAt:
              withdrawRequest.processedAt,
            createdAt:
              withdrawRequest.createdAt,
            updatedAt:
              withdrawRequest.updatedAt,
          },

          transaction: {
            id: withdrawTransaction._id,
            status:
              withdrawTransaction.status,
            transactionType:
              withdrawTransaction.transactionType,
            amount:
              withdrawTransaction.amount,
          },

          userStats: {
            totalWithdrawn:
              user.totalWithdrawn,
            walletBalance:
              user.walletBalance,
          },
        };
      });

      return res.status(200).json({
        message:
          "Withdrawal request approved successfully",
        ...responseData,
      });
    } catch (error) {
      console.error(
        "Approve withdrawal error:",
        error
      );

      const statusCode =
        error.statusCode || 500;

      return res.status(statusCode).json({
        message:
          error.statusCode
            ? error.message
            : "Server error while approving withdrawal request",
        error:
          !error.statusCode &&
          process.env.NODE_ENV !== "production"
            ? error.message
            : undefined,
      });
    } finally {
      await session.endSession();
    }
  }
);

// =====================================
// NEXT CODE WILL START BELOW THIS LINE
// =====================================
// =====================================
// REJECT WITHDRAWAL REQUEST AND REFUND
// PATCH /api/withdrawals/admin/:withdrawRequestId/reject
// =====================================
router.patch(
  "/admin/:withdrawRequestId/reject",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      const { withdrawRequestId } = req.params;

      const adminNote = String(
        req.body.adminNote || ""
      ).trim();

      if (
        !mongoose.isValidObjectId(
          withdrawRequestId
        )
      ) {
        throw createRouteError(
          400,
          "Invalid withdrawal request ID"
        );
      }

      if (!adminNote) {
        throw createRouteError(
          400,
          "Admin note is required when rejecting a withdrawal"
        );
      }

      if (adminNote.length > 500) {
        throw createRouteError(
          400,
          "Admin note cannot exceed 500 characters"
        );
      }

      let responseData = null;

      await session.withTransaction(async () => {
        const withdrawRequest =
          await WithdrawRequest.findById(
            withdrawRequestId
          ).session(session);

        if (!withdrawRequest) {
          throw createRouteError(
            404,
            "Withdrawal request not found"
          );
        }

        if (
          withdrawRequest.status !== "pending"
        ) {
          throw createRouteError(
            409,
            `This withdrawal request is already ${withdrawRequest.status}`
          );
        }

        const user = await User.findById(
          withdrawRequest.userId
        ).session(session);

        if (!user) {
          throw createRouteError(
            404,
            "Withdrawal user not found"
          );
        }

        const withdrawTransaction =
          await Transaction.findOne({
            userId: user._id,
            withdrawRequestId:
              withdrawRequest._id,
            transactionType: "withdraw",
          }).session(session);

        if (!withdrawTransaction) {
          throw createRouteError(
            404,
            "Withdrawal transaction not found"
          );
        }

        if (
          withdrawTransaction.status !==
          "pending"
        ) {
          throw createRouteError(
            409,
            `Withdrawal transaction is already ${withdrawTransaction.status}`
          );
        }

        const refundAmount = roundMoney(
          withdrawRequest.amount
        );

        const balanceBefore = roundMoney(
          user.walletBalance || 0
        );

        const balanceAfter = roundMoney(
          balanceBefore + refundAmount
        );

        user.walletBalance = balanceAfter;

        await user.save({
          session,
        });

        withdrawRequest.status = "rejected";
        withdrawRequest.adminNote = adminNote;
        withdrawRequest.processedBy =
          req.user.userId;
        withdrawRequest.processedAt =
          new Date();

        await withdrawRequest.save({
          session,
        });

        withdrawTransaction.status = "failed";
        withdrawTransaction.processedBy =
          req.user.userId;
        withdrawTransaction.description =
          `Withdrawal rejected by admin. Reason: ${adminNote}`;

        await withdrawTransaction.save({
          session,
        });

        const createdRefundTransactions =
          await Transaction.create(
            [
              {
                userId: user._id,
                withdrawRequestId:
                  withdrawRequest._id,
                transactionType: "refund",
                amount: refundAmount,
                balanceBefore,
                balanceAfter,
                status: "success",
                description:
                  `Withdrawal refund credited. Reason: ${adminNote}`,
                processedBy:
                  req.user.userId,
              },
            ],
            {
              session,
            }
          );

        const refundTransaction =
          createdRefundTransactions[0];

        responseData = {
          withdrawal: {
            id: withdrawRequest._id,
            userId: withdrawRequest.userId,
            amount: withdrawRequest.amount,
            upiId: withdrawRequest.upiId,
            status: withdrawRequest.status,
            adminNote:
              withdrawRequest.adminNote,
            processedBy:
              withdrawRequest.processedBy,
            processedAt:
              withdrawRequest.processedAt,
            createdAt:
              withdrawRequest.createdAt,
            updatedAt:
              withdrawRequest.updatedAt,
          },

          wallet: {
            balanceBefore,
            refundedAmount: refundAmount,
            walletBalance: balanceAfter,
          },

          withdrawTransaction: {
            id: withdrawTransaction._id,
            transactionType:
              withdrawTransaction.transactionType,
            amount:
              withdrawTransaction.amount,
            status:
              withdrawTransaction.status,
          },

          refundTransaction: {
            id: refundTransaction._id,
            transactionType:
              refundTransaction.transactionType,
            amount:
              refundTransaction.amount,
            balanceBefore:
              refundTransaction.balanceBefore,
            balanceAfter:
              refundTransaction.balanceAfter,
            status:
              refundTransaction.status,
          },
        };
      });

      return res.status(200).json({
        message:
          "Withdrawal request rejected and amount refunded successfully",
        ...responseData,
      });
    } catch (error) {
      console.error(
        "Reject withdrawal error:",
        error
      );

      const statusCode =
        error.statusCode || 500;

      const errorResponse = {
        message:
          error.statusCode
            ? error.message
            : "Server error while rejecting withdrawal request",
      };

      if (error.extraData) {
        Object.assign(
          errorResponse,
          error.extraData
        );
      }

      if (
        !error.statusCode &&
        process.env.NODE_ENV !== "production"
      ) {
        errorResponse.error =
          error.message;
      }

      return res
        .status(statusCode)
        .json(errorResponse);
    } finally {
      await session.endSession();
    }
  }
);

// =====================================
// EXPORT ROUTER
// =====================================
module.exports = router;