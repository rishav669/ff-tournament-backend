const express = require("express");
const mongoose = require("mongoose");

const Tournament = require("../tournament");
const User = require("../user");
const Transaction = require("../transaction");
const CoinTransaction = require("../coinTransaction");
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
// PROCESS REFERRALS AFTER COMPLETION
// =====================================
const processCompletedTournamentReferrals =
  async (tournament) => {
    const summary = {
      checked: 0,
      newlyRewarded: 0,
      stillPending: 0,
      skipped: 0,
      failed: 0,
    };

    const joinedUserIds = [
      ...new Set(
        (tournament.joinedPlayers || [])
          .map((player) =>
            player.userId
              ? player.userId.toString()
              : null
          )
          .filter(Boolean)
      ),
    ];

    if (joinedUserIds.length === 0) {
      return summary;
    }

    const referredUsers = await User.find({
      _id: {
        $in: joinedUserIds,
      },
      referredBy: {
        $ne: null,
      },
    }).select("_id");

    for (const referredUser of referredUsers) {
      summary.checked += 1;

      const result =
        await processReferralReward(
          referredUser._id
        );

      if (!result || result.success === false) {
        summary.failed += 1;
        continue;
      }

      if (result.rewarded === true) {
        summary.newlyRewarded += 1;
        continue;
      }

      if (
        result.reason ===
        "Referral conditions are not completed"
      ) {
        summary.stillPending += 1;
        continue;
      }

      summary.skipped += 1;
    }

    return summary;
  };

// =====================================
// CREATE TOURNAMENT — ADMIN ONLY
// =====================================
router.post(
  "/create",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
const {
  title,
  game,
  mode,
  matchType,
  cardImage,
  themeColor,
  modeLabel,
  joinButtonText,
  detailsButtonText,
  map,
  entryFee,
  coinEntryFee,
  prizePool,
  prizeDisplayType,
  winningPoint,
  perKillReward,
  perKillRewardUnit,
  totalSlots,
  date,
  time,
} = req.body || {};

      if (
  !title ||
  !mode ||
  !map ||
  entryFee === undefined ||
  prizePool === undefined ||
  !date ||
  !time
) {
  return res.status(400).json({
    message: "All required tournament fields are required",
  });
}
      const selectedMatchType = String(
  matchType || "full_map"
)
  .trim()
  .toLowerCase();

const fixedSlotsByMatchType = {
  full_map: 48,
  cs_1v1: 2,
  cs_2v2: 4,
  cs_4v4: 8,
};

if (!fixedSlotsByMatchType[selectedMatchType]) {
  return res.status(400).json({
    message:
      "matchType must be full_map, cs_1v1, cs_2v2 or cs_4v4",
  });
}

const parsedEntryFee = Number(entryFee);
const parsedCoinEntryFee = Number(coinEntryFee || 0);
const parsedPrizePool = Number(prizePool);

const parsedWinningPoint = Number(
  winningPoint || 0
);

const parsedPerKillReward = Number(
  perKillReward || 0
);

const parsedTotalSlots =
  fixedSlotsByMatchType[selectedMatchType];

if (
  Number.isNaN(parsedEntryFee) ||
  Number.isNaN(parsedCoinEntryFee) ||
  Number.isNaN(parsedPrizePool) ||
  Number.isNaN(parsedWinningPoint) ||
  Number.isNaN(parsedPerKillReward) ||
  Number.isNaN(parsedTotalSlots)
) {
  return res.status(400).json({
    message:
      "Fees, prize, winning point and per-kill reward must be numbers",
  });
}
 

if (
  parsedEntryFee < 0 ||
  parsedCoinEntryFee < 0 ||
  parsedPrizePool < 0 ||
  parsedWinningPoint < 0 ||
  parsedPerKillReward < 0 ||
  parsedTotalSlots < 1
) {
  return res.status(400).json({
    message:
      "Fee, prize, winning point and per-kill reward cannot be negative",
  });
}

const selectedPrizeDisplayType = String(
  prizeDisplayType ||
    (selectedMatchType === "full_map"
      ? "prize_pool"
      : "winning_point")
)
  .trim()
  .toLowerCase();

if (
  !["prize_pool", "winning_point"].includes(
    selectedPrizeDisplayType
  )
) {
  return res.status(400).json({
    message:
      "prizeDisplayType must be prize_pool or winning_point",
  });
}

const selectedPerKillRewardUnit = String(
  perKillRewardUnit ||
    (selectedMatchType === "full_map"
      ? "rupee"
      : "point")
)
  .trim()
  .toLowerCase();

if (
  !["rupee", "point"].includes(
    selectedPerKillRewardUnit
  )
) {
  return res.status(400).json({
    message:
      "perKillRewardUnit must be rupee or point",
  });
}

const tournament = await Tournament.create({
  title: String(title).trim(),

  game: game
    ? String(game).trim()
    : "Free Fire",

  mode: String(mode).trim(),
  matchType: selectedMatchType,

  cardImage: cardImage
    ? String(cardImage).trim()
    : "",

  themeColor: themeColor
    ? String(themeColor).trim()
    : "#FACC15",

  modeLabel: modeLabel
    ? String(modeLabel).trim()
    : String(mode).trim(),

  joinButtonText: joinButtonText
    ? String(joinButtonText).trim()
    : "JOIN NOW",

  detailsButtonText: detailsButtonText
    ? String(detailsButtonText).trim()
    : "VIEW DETAILS",

  map: String(map).trim(),

  entryFee:
    Math.round(parsedEntryFee * 100) / 100,

  coinEntryFee:
    Math.floor(parsedCoinEntryFee),

  prizePool:
    Math.round(parsedPrizePool * 100) / 100,

  prizeDisplayType:
    selectedPrizeDisplayType,

  winningPoint:
    Math.floor(parsedWinningPoint),

  perKillReward:
    Math.round(parsedPerKillReward * 100) / 100,

  perKillRewardUnit:
    selectedPerKillRewardUnit,

  totalSlots:
    parsedTotalSlots,

  date: String(date).trim(),
  time: String(time).trim(),

  createdBy: req.user.userId,
});
      return res.status(201).json({
        message: "Tournament created successfully",
        tournament,
      });
    } catch (error) {
      console.error("Create tournament error:", error);

      return res.status(500).json({
        message:
          "Server error while creating tournament",
        error: error.message,
      });
    }
  }
);

// =====================================
// GET ALL TOURNAMENTS
// ROOM DETAILS HIDDEN
// =====================================
router.get("/", async (req, res) => {
  try {
    const tournaments = await Tournament.find()
      .select("-roomId -roomPassword -joinedPlayers -results")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Tournaments fetched successfully",
      count: tournaments.length,
      tournaments,
    });
  } catch (error) {
    console.error("Get tournaments error:", error);

    return res.status(500).json({
      message:
        "Server error while fetching tournaments",
      error: error.message,
    });
  }
});

// =====================================
// JOIN TOURNAMENT
// WALLET ENTRY FEE AUTOMATICALLY DEDUCTED
// UID + IGN AUTOMATICALLY SAVED
// =====================================
router.post(
  "/join/:id",
  authMiddleware,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      let joinResponse = null;
      let activityEventData = null;

      await session.withTransaction(async () => {
        const tournament =
          await Tournament.findById(
            req.params.id
          ).session(session);

        if (!tournament) {
          throw createRouteError(
            404,
            "Tournament not found"
          );
        }

        if (tournament.status !== "Upcoming") {
          throw createRouteError(
            400,
            "This tournament is not open for joining"
          );
        }

        if (
          tournament.createdBy &&
          tournament.createdBy.toString() ===
            req.user.userId.toString()
        ) {
          throw createRouteError(
            400,
            "Tournament creator cannot join own tournament"
          );
        }

        const alreadyJoined =
          tournament.joinedPlayers.some(
            (player) =>
              player.userId.toString() ===
              req.user.userId.toString()
          );

        if (alreadyJoined) {
          throw createRouteError(
            400,
            "You have already joined this tournament"
          );
        }

        if (
          tournament.joinedSlots >=
          tournament.totalSlots
        ) {
          throw createRouteError(
            400,
            "Tournament is full"
          );
        }

        let settings =
          await Settings.findOne().session(
            session
          );

        if (!settings) {
          const createdSettings =
            await Settings.create(
              [{}],
              {
                session,
              }
            );

          settings = createdSettings[0];
        }

 const {
  acceptRules,
  rulesLanguage,
  paymentMethod = "wallet",
} = req.body || {};

const selectedPaymentMethod = String(
  paymentMethod || "wallet"
)
  .trim()
  .toLowerCase();

if (
  !["wallet", "coin"].includes(
    selectedPaymentMethod
  )
) {
  throw createRouteError(
    400,
    "paymentMethod must be wallet or coin"
  );
}
        const selectedRulesLanguage =
          rulesLanguage === undefined ||
          rulesLanguage === null ||
          !String(rulesLanguage).trim()
            ? String(
                settings.defaultRulesLanguage ||
                  "english"
              ).toLowerCase()
            : String(rulesLanguage)
                .trim()
                .toLowerCase();

        if (
          !["english", "hindi"].includes(
            selectedRulesLanguage
          )
        ) {
          throw createRouteError(
            400,
            "rulesLanguage must be english or hindi"
          );
        }

        const rulesAccepted =
          acceptRules === true;

        if (
          settings.rulesAcceptanceRequired ===
            true &&
          !rulesAccepted
        ) {
          throw createRouteError(
            400,
            "You must accept the Tournament Rules and Fair Play Policy before joining",
            {
              rulesAcceptanceRequired:
                true,
              currentRulesVersion:
                Number(
                  settings.rulesVersion || 1
                ),
              rulesLanguage:
                selectedRulesLanguage,
              rulesEndpoint:
                `/api/settings/rules?language=${selectedRulesLanguage}`,
            }
          );
        }

        const rulesVersionAccepted =
          rulesAccepted
            ? Number(
                settings.rulesVersion || 1
              )
            : 0;

        const rulesAcceptedAt =
          rulesAccepted
            ? new Date()
            : null;

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
            "Your account is blocked. You cannot join tournaments."
          );
        }

        if (
          !user.freeFireUid ||
          !user.freeFireIgn
        ) {
          throw createRouteError(
            400,
            "Free Fire UID and IGN are required before joining"
          );
        }

       const entryFee =
  Math.round(
    Number(tournament.entryFee || 0) *
      100
  ) / 100;

const balanceBefore =
  Math.round(
    Number(user.walletBalance || 0) *
      100
  ) / 100;

let balanceAfter = balanceBefore;

const coinBalanceBefore =
  Math.floor(
    Number(user.coinBalance || 0)
  );

let coinBalanceAfter =
  coinBalanceBefore;

let coinEntryCost = 0;

const appliedPaymentMethod =
  entryFee === 0
    ? "free"
    : selectedPaymentMethod;

let transaction = null;
let coinTransaction = null;
let walletAmountPaid = 0;
let coinAmountPaid = 0;

if (entryFee > 0) {
  if (
    appliedPaymentMethod === "wallet"
  ) {
    if (balanceBefore < entryFee) {
      throw createRouteError(
        400,
        "Insufficient wallet balance",
        {
          walletBalance:
            balanceBefore,
          entryFee,
          requiredAmount:
            Math.round(
              (entryFee -
                balanceBefore) *
                100
            ) / 100,
        }
      );
    }

    balanceAfter =
      Math.round(
        (balanceBefore - entryFee) *
          100
      ) / 100;

    user.walletBalance =
      balanceAfter;

    walletAmountPaid = entryFee;
  } else {
  if (
    settings.coinTournamentPaymentEnabled !== true
  ) {
    throw createRouteError(
      403,
      "Coin tournament entry is currently upcoming",
      {
        coinPaymentEnabled: false,
        coinPaymentStatus: "upcoming",
        walletPaymentAvailable: true,
      }
    );
  }

  coinEntryCost = Math.floor(
    Number(tournament.coinEntryFee || 0)
  );

    if (
      !Number.isFinite(
        coinEntryCost
      ) ||
      !Number.isInteger(
        coinEntryCost
      ) ||
      coinEntryCost <= 0
    ) {
      throw createRouteError(
        500,
        "Invalid tournament coin cost setting"
      );
    }

    if (
      coinBalanceBefore <
      coinEntryCost
    ) {
      throw createRouteError(
        400,
        "Insufficient coin balance",
        {
          coinBalance:
            coinBalanceBefore,
          requiredCoins:
            coinEntryCost,
          missingCoins:
            coinEntryCost -
            coinBalanceBefore,
          coinPaymentStatus:
            "insufficient",
          walletPaymentAvailable:
            true,
        }
      );
    }

    coinBalanceAfter =
      coinBalanceBefore -
      coinEntryCost;

    user.coinBalance =
      coinBalanceAfter;

    coinAmountPaid =
      coinEntryCost;
  }

  user.totalEntryFeesPaid =
    Math.round(
      (Number(
        user.totalEntryFeesPaid || 0
      ) +
        entryFee) *
        100
    ) / 100;

  await user.save({
    session,
  });

  if (
    appliedPaymentMethod === "wallet"
  ) {
    const createdTransactions =
      await Transaction.create(
        [
          {
            userId: user._id,
            tournamentId:
              tournament._id,
            transactionType:
              "entry_fee",
            amount: entryFee,
            balanceBefore,
            balanceAfter,
            status: "success",
            description:
              `Entry fee paid for ${tournament.title}`,
          },
        ],
        {
          session,
        }
      );

    transaction =
      createdTransactions[0];
  } else {
   const createdCoinTransactions =
  await CoinTransaction.create(
    [
      {
        user: user._id,

        type: "tournament_entry",

        transactionType:
          "debit",

        amount:
          coinEntryCost,

        balanceBefore:
          coinBalanceBefore,

        balanceAfter:
          coinBalanceAfter,

        description:
          `Tournament entry paid with coins: ${tournament.title}`,

        referenceId:
          `tournament-join:${tournament._id}`,

        metadata: {
          tournamentId:
            tournament._id,

          tournamentTitle:
            tournament.title,

          paymentMethod: "coin",
          paymentLabel: "Coin Paid",

          walletEntryFee:
            entryFee,

          coinEntryFee:
            coinEntryCost,

          amountPaid:
            coinEntryCost,

          paymentUnit: "coin",
        },
      },
    ],
    {
      session,
    }
  );

coinTransaction =
  createdCoinTransactions[0];
    coinTransaction =
      createdCoinTransactions[0];
  }
}

tournament.joinedPlayers.push({
  userId: user._id,
  freeFireUid: user.freeFireUid,
  freeFireIgn: user.freeFireIgn,
  paymentMethod: appliedPaymentMethod,
  walletAmountPaid,
  coinAmountPaid,
  walletTransactionId:
    transaction?._id || null,
  coinTransactionId:
    coinTransaction?._id || null,
  rulesAccepted,
  rulesVersionAccepted,
  rulesLanguageAccepted:
    selectedRulesLanguage,
  rulesAcceptedAt,
  joinedAt: new Date(),
});
        tournament.joinedSlots =
          tournament.joinedPlayers.length;

        await tournament.save({ session });

        activityEventData = {
          user: {
            _id: user._id,
            name: user.name,
          },
          eventType: "tournament_join",
          amount: entryFee,
          eventKey:
            `tournament_join:${tournament._id}:${user._id}`,
          tournamentId: tournament._id,
          tournamentTitle:
            tournament.title,
          transactionId:
            transaction?._id || null,
          metadata: {
            tournamentMode:
              tournament.mode,
            tournamentMap:
              tournament.map,
            entryFee,
          },
        };

        joinResponse = {
  message:
    "Tournament joined successfully",

  tournament: {
    id: tournament._id,
    title: tournament.title,
    status: tournament.status,

    walletEntryFee:
      entryFee,

    coinEntryFee:
      Math.floor(
        Number(
          tournament.coinEntryFee || 0
        )
      ),

    joinedSlots:
      tournament.joinedSlots,

    totalSlots:
      tournament.totalSlots,
  },

  player: {
    userId: user._id,
    freeFireUid:
      user.freeFireUid,

    freeFireIgn:
      user.freeFireIgn,

    paymentMethod:
      appliedPaymentMethod,

    paymentLabel:
      appliedPaymentMethod === "coin"
        ? "Coin Paid"
        : appliedPaymentMethod === "wallet"
          ? "Wallet Paid"
          : "Free Entry",

    walletAmountPaid,
    coinAmountPaid,

    rulesAcceptance: {
      required:
        settings.rulesAcceptanceRequired ===
        true,

      accepted:
        rulesAccepted,

      version:
        rulesVersionAccepted,

      language:
        selectedRulesLanguage,

      acceptedAt:
        rulesAcceptedAt,
    },
  },

  payment: {
    paymentMethod:
      appliedPaymentMethod,

    paymentLabel:
      appliedPaymentMethod === "coin"
        ? "Coin Paid"
        : appliedPaymentMethod === "wallet"
          ? "Wallet Paid"
          : "Free Entry",

    amountPaid:
      appliedPaymentMethod === "coin"
        ? coinAmountPaid
        : appliedPaymentMethod === "wallet"
          ? walletAmountPaid
          : 0,

    paymentUnit:
      appliedPaymentMethod === "coin"
        ? "coin"
        : appliedPaymentMethod === "wallet"
          ? "rupee"
          : "free",

    walletEntryFee:
      entryFee,

    coinEntryFee:
      Math.floor(
        Number(
          tournament.coinEntryFee || 0
        )
      ),
  },

  wallet: {
    previousBalance:
      balanceBefore,

    amountDebited:
      walletAmountPaid,

    currentBalance:
      balanceAfter,
  },

  coin: {
    previousBalance:
      coinBalanceBefore,

    amountDebited:
      coinAmountPaid,

    currentBalance:
      coinBalanceAfter,
  },

  transactions: {
    walletTransaction:
      transaction,

    coinTransaction:
      coinTransaction,
  },
};
      });

      if (activityEventData) {
        try {
          await createActivityEvent(
            activityEventData
          );
        } catch (activityError) {
          console.error(
            "Tournament join activity event error:",
            activityError
          );
        }
      }

      return res.status(200).json(joinResponse);
    } catch (error) {
      console.error(
        "Join tournament error:",
        error
      );

      if (error.statusCode) {
        return res
          .status(error.statusCode)
          .json({
            message: error.message,
            ...(error.extraData || {}),
          });
      }

      return res.status(500).json({
        message:
          "Server error while joining tournament",
        error: error.message,
      });
    } finally {
      await session.endSession();
    }
  }
);

// =====================================
// UPDATE TOURNAMENT — ADMIN ONLY
// =====================================
router.put(
  "/update/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const tournament =
        await Tournament.findById(
          req.params.id
        );

      if (!tournament) {
        return res.status(404).json({
          message: "Tournament not found",
        });
      }

      if (
        tournament.status === "Completed"
      ) {
        return res.status(400).json({
          message:
            "Completed tournament cannot be updated",
        });
      }

      const body = req.body || {};
      const updates = {};

      // =====================================
      // REQUIRED TEXT FIELDS
      // =====================================
      const requiredTextFields = [
        "title",
        "mode",
        "map",
        "date",
        "time",
      ];

      for (const field of requiredTextFields) {
        if (body[field] !== undefined) {
          const value = String(
            body[field]
          ).trim();

          if (!value) {
            return res.status(400).json({
              message:
                `${field} cannot be empty`,
            });
          }

          updates[field] = value;
        }
      }

      // =====================================
      // GAME NAME
      // =====================================
      if (body.game !== undefined) {
        updates.game =
          String(body.game).trim() ||
          "Free Fire";
      }

      // =====================================
      // CARD DESIGN FIELDS
      // =====================================
      if (body.cardImage !== undefined) {
        updates.cardImage =
          String(body.cardImage).trim();
      }

      if (body.themeColor !== undefined) {
        updates.themeColor =
          String(body.themeColor).trim() ||
          "#FACC15";
      }

      if (body.modeLabel !== undefined) {
        updates.modeLabel =
          String(body.modeLabel).trim();
      }

      if (
        body.joinButtonText !== undefined
      ) {
        updates.joinButtonText =
          String(
            body.joinButtonText
          ).trim() || "JOIN NOW";
      }

      if (
        body.detailsButtonText !== undefined
      ) {
        updates.detailsButtonText =
          String(
            body.detailsButtonText
          ).trim() || "VIEW DETAILS";
      }

      // =====================================
      // MATCH TYPE + FIXED PLAYER SLOTS
      // =====================================
      if (body.matchType !== undefined) {
        const selectedMatchType = String(
          body.matchType
        )
          .trim()
          .toLowerCase();

        const fixedSlotsByMatchType = {
          full_map: 48,
          cs_1v1: 2,
          cs_2v2: 4,
          cs_4v4: 8,
        };

        if (
          !fixedSlotsByMatchType[
            selectedMatchType
          ]
        ) {
          return res.status(400).json({
            message:
              "matchType must be full_map, cs_1v1, cs_2v2 or cs_4v4",
          });
        }

        const fixedTotalSlots =
          fixedSlotsByMatchType[
            selectedMatchType
          ];

        if (
          Number(tournament.joinedSlots) >
          fixedTotalSlots
        ) {
          return res.status(400).json({
            message:
              "Match type cannot be changed because joined players exceed the new slot limit",
          });
        }

        updates.matchType =
          selectedMatchType;

        updates.totalSlots =
          fixedTotalSlots;
      }

      // =====================================
      // PRIZE DISPLAY TYPE
      // =====================================
      if (
        body.prizeDisplayType !== undefined
      ) {
        const selectedPrizeDisplayType =
          String(body.prizeDisplayType)
            .trim()
            .toLowerCase();

        if (
          ![
            "prize_pool",
            "winning_point",
          ].includes(
            selectedPrizeDisplayType
          )
        ) {
          return res.status(400).json({
            message:
              "prizeDisplayType must be prize_pool or winning_point",
          });
        }

        updates.prizeDisplayType =
          selectedPrizeDisplayType;
      }

      // =====================================
      // PER-KILL REWARD UNIT
      // =====================================
      if (
        body.perKillRewardUnit !== undefined
      ) {
        const selectedRewardUnit = String(
          body.perKillRewardUnit
        )
          .trim()
          .toLowerCase();

        if (
          !["rupee", "point"].includes(
            selectedRewardUnit
          )
        ) {
          return res.status(400).json({
            message:
              "perKillRewardUnit must be rupee or point",
          });
        }

        updates.perKillRewardUnit =
          selectedRewardUnit;
      }

      // =====================================
      // MONEY / POINT FIELDS
      // =====================================
      const numericFields = [
        "entryFee",
        "coinEntryFee",
        "prizePool",
        "winningPoint",
        "perKillReward",
      ];

      for (const field of numericFields) {
        if (body[field] !== undefined) {
          const value = Number(
            body[field]
          );

          if (
            !Number.isFinite(value) ||
            value < 0
          ) {
            return res.status(400).json({
              message:
                `${field} must be a non-negative number`,
            });
          }

          if (
            field === "coinEntryFee" ||
            field === "winningPoint"
          ) {
            updates[field] =
              Math.floor(value);
          } else {
            updates[field] =
              Math.round(value * 100) /
              100;
          }
        }
      }

      // সব validated field apply হবে
      Object.assign(
        tournament,
        updates
      );

      if (
        Number(tournament.totalSlots) <
        Number(tournament.joinedSlots)
      ) {
        return res.status(400).json({
          message:
            "Total slots cannot be less than joined slots",
        });
      }

      await tournament.save();

      return res.status(200).json({
        message:
          "Tournament updated successfully",
        tournament,
      });
    } catch (error) {
      console.error(
        "Update tournament error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error while updating tournament",
        error: error.message,
      });
    }
  }
);
// =====================================
// PUBLISH ROOM DETAILS — ADMIN ONLY
// UPCOMING → LIVE
// =====================================
router.put(
  "/publish-room/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { roomId, roomPassword } =
        req.body || {};

      if (!roomId || !roomPassword) {
        return res.status(400).json({
          message:
            "Room ID and room password are required",
        });
      }

      const tournament =
        await Tournament.findById(
          req.params.id
        );

      if (!tournament) {
        return res.status(404).json({
          message: "Tournament not found",
        });
      }

      if (
  !["Upcoming", "Live"].includes(
    tournament.status
  )
) {
  return res.status(400).json({
    message:
      `${tournament.status} tournament cannot be made live`,
  });
}

      tournament.roomId =
        String(roomId).trim();

      tournament.roomPassword =
        String(roomPassword).trim();

      tournament.status = "Live";

      await tournament.save();

      return res.status(200).json({
        message:
          "Room details published successfully",

        tournament: {
          id: tournament._id,
          title: tournament.title,
          status: tournament.status,
          roomId: tournament.roomId,
          roomPassword:
            tournament.roomPassword,
        },
      });
    } catch (error) {
      console.error(
        "Publish room error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error while publishing room details",
        error: error.message,
      });
    }
  }
);

// =====================================
// VIEW ROOM DETAILS
// JOINED PLAYER OR ADMIN ONLY
// =====================================
router.get(
  "/room/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const tournament =
        await Tournament.findById(
          req.params.id
        );

      if (!tournament) {
        return res.status(404).json({
          message: "Tournament not found",
        });
      }

const currentUser =
  await User.findById(
    req.user.userId
  ).select("role");

if (!currentUser) {
  return res.status(404).json({
    message: "User not found",
  });
}

const isAdmin =
  currentUser.role === "admin";

const isJoined =
  tournament.joinedPlayers.some(
    (player) =>
      player.userId.toString() ===
      currentUser._id.toString()
  );

      if (!isAdmin && !isJoined) {
        return res.status(403).json({
          message:
            "Only joined players can view room details",
        });
      }

      if (
        !tournament.roomId ||
        !tournament.roomPassword
      ) {
        return res.status(400).json({
          message:
            "Room details have not been published yet",
        });
      }

      return res.status(200).json({
        message:
          "Room details fetched successfully",

        tournament: {
          id: tournament._id,
          title: tournament.title,
          status: tournament.status,
          roomId: tournament.roomId,
          roomPassword:
            tournament.roomPassword,
        },
      });
    } catch (error) {
      console.error(
        "View room error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error while fetching room details",
        error: error.message,
      });
    }
  }
);

// =====================================
// ADMIN VIEW JOINED PLAYERS
// PAYMENT METHOD + COLLECTION SUMMARY
// =====================================
router.get(
  "/players/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const tournament =
        await Tournament.findById(
          req.params.id
        ).populate(
          "joinedPlayers.userId",
          "name email"
        );

      if (!tournament) {
        return res.status(404).json({
          message:
            "Tournament not found",
        });
      }

      const players =
        tournament.joinedPlayers.map(
          (player) => {
            const paymentMethod =
              String(
                player.paymentMethod ||
                  "free"
              )
                .trim()
                .toLowerCase();

            const walletAmountPaid =
              Math.round(
                Number(
                  player.walletAmountPaid ||
                    0
                ) * 100
              ) / 100;

            const coinAmountPaid =
              Math.floor(
                Number(
                  player.coinAmountPaid ||
                    0
                )
              );

            const amountPaid =
              paymentMethod === "coin"
                ? coinAmountPaid
                : paymentMethod ===
                    "wallet"
                  ? walletAmountPaid
                  : 0;

            const paymentLabel =
              paymentMethod === "coin"
                ? "Coin Paid"
                : paymentMethod ===
                    "wallet"
                  ? "Wallet Paid"
                  : "Free Entry";

            const paymentUnit =
              paymentMethod === "coin"
                ? "coin"
                : paymentMethod ===
                    "wallet"
                  ? "rupee"
                  : "free";

            const userData =
              player.userId &&
              typeof player.userId ===
                "object"
                ? player.userId
                : null;

            return {
              joinRecordId:
                player._id,

              userId:
                userData?._id ||
                player.userId,

              name:
                userData?.name || "",

              email:
                userData?.email || "",

              freeFireUid:
                player.freeFireUid,

              freeFireIgn:
                player.freeFireIgn,

              paymentMethod,
              paymentLabel,
              amountPaid,
              paymentUnit,

              walletAmountPaid,
              coinAmountPaid,

              walletTransactionId:
                player.walletTransactionId ||
                null,

              coinTransactionId:
                player.coinTransactionId ||
                null,

              rulesAcceptance: {
                accepted:
                  player.rulesAccepted ===
                  true,

                version:
                  Number(
                    player.rulesVersionAccepted ||
                      0
                  ),

                language:
                  player.rulesLanguageAccepted ||
                  "",

                acceptedAt:
                  player.rulesAcceptedAt ||
                  null,
              },

              joinedAt:
                player.joinedAt,
            };
          }
        );

      const paymentSummary = {
        totalJoined:
          players.length,

        walletJoined:
          players.filter(
            (player) =>
              player.paymentMethod ===
              "wallet"
          ).length,

        coinJoined:
          players.filter(
            (player) =>
              player.paymentMethod ===
              "coin"
          ).length,

        freeJoined:
          players.filter(
            (player) =>
              player.paymentMethod ===
              "free"
          ).length,

        totalWalletCollected:
          Math.round(
            players.reduce(
              (total, player) =>
                total +
                Number(
                  player.walletAmountPaid ||
                    0
                ),
              0
            ) * 100
          ) / 100,

        totalCoinCollected:
          players.reduce(
            (total, player) =>
              total +
              Number(
                player.coinAmountPaid ||
                  0
              ),
            0
          ),
      };

      return res.status(200).json({
        success: true,

        message:
          "Joined players fetched successfully",

        tournament: {
          id:
            tournament._id,

          title:
            tournament.title,

          status:
            tournament.status,

          walletEntryFee:
            tournament.entryFee,

          coinEntryFee:
            tournament.coinEntryFee,

          joinedSlots:
            tournament.joinedSlots,

          totalSlots:
            tournament.totalSlots,
        },

        paymentSummary,

        players,
      });
    } catch (error) {
      console.error(
        "Get players error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error while fetching joined players",

        error:
          error.message,
      });
    }
  }
);
// =====================================
// CANCEL TOURNAMENT — ADMIN ONLY
// WALLET + COIN ENTRY AUTOMATIC REFUND
// =====================================
router.put(
  "/cancel/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const session =
      await mongoose.startSession();

    let responseData = null;

    try {
      const cancelReason =
        req.body?.cancelReason
          ? String(
              req.body.cancelReason
            ).trim()
          : "";

      if (!cancelReason) {
        return res.status(400).json({
          success: false,
          message:
            "Tournament cancellation reason is required",
        });
      }

      if (cancelReason.length > 500) {
        return res.status(400).json({
          success: false,
          message:
            "Cancellation reason cannot exceed 500 characters",
        });
      }

      await session.withTransaction(
        async () => {
          const tournament =
            await Tournament.findById(
              req.params.id
            ).session(session);

          if (!tournament) {
            throw createRouteError(
              404,
              "Tournament not found"
            );
          }

          if (
            tournament.status ===
            "Cancelled"
          ) {
            throw createRouteError(
              400,
              "Tournament is already cancelled"
            );
          }

          if (
            tournament.status ===
            "Completed"
          ) {
            throw createRouteError(
              400,
              "Completed tournament cannot be cancelled"
            );
          }

          if (
            tournament.status ===
            "Expired"
          ) {
            throw createRouteError(
              400,
              "Expired tournament cannot be cancelled"
            );
          }

          if (
            ![
              "Upcoming",
              "Live",
            ].includes(
              tournament.status
            )
          ) {
            throw createRouteError(
              400,
              "This tournament cannot be cancelled"
            );
          }

          let walletRefundedPlayers = 0;
          let coinRefundedPlayers = 0;
          let freePlayers = 0;

          let totalWalletRefunded = 0;
          let totalCoinRefunded = 0;

          const refundedPlayers = [];

          for (
            const player of
            tournament.joinedPlayers
          ) {
            const user =
              await User.findById(
                player.userId
              ).session(session);

            if (!user) {
              throw createRouteError(
                404,
                `Joined user not found: ${player.userId}`
              );
            }

            const walletAmountPaid =
              Math.round(
                Number(
                  player.walletAmountPaid ||
                    0
                ) * 100
              ) / 100;

            const coinAmountPaid =
              Math.floor(
                Number(
                  player.coinAmountPaid ||
                    0
                )
              );

            const savedPaymentMethod =
              String(
                player.paymentMethod ||
                  ""
              )
                .trim()
                .toLowerCase();

            const paymentMethod =
              [
                "wallet",
                "coin",
                "free",
              ].includes(
                savedPaymentMethod
              )
                ? savedPaymentMethod
                : coinAmountPaid > 0
                  ? "coin"
                  : walletAmountPaid > 0
                    ? "wallet"
                    : "free";

            let refundTransactionId =
              null;

            if (
              paymentMethod ===
                "wallet" &&
              walletAmountPaid > 0
            ) {
              const balanceBefore =
                Math.round(
                  Number(
                    user.walletBalance ||
                      0
                  ) * 100
                ) / 100;

              const balanceAfter =
                Math.round(
                  (balanceBefore +
                    walletAmountPaid) *
                    100
                ) / 100;

              user.walletBalance =
                balanceAfter;

              await user.save({
                session,
              });

              const [refundTransaction] =
                await Transaction.create(
                  [
                    {
                      userId:
                        user._id,

                      tournamentId:
                        tournament._id,

                      transactionType:
                        "refund",

                      amount:
                        walletAmountPaid,

                      balanceBefore,

                      balanceAfter,

                      status:
                        "success",

                      description:
                        `Tournament cancellation refund: ${tournament.title}`,

                      processedBy:
                        req.user.userId,
                    },
                  ],
                  {
                    session,
                  }
                );

              refundTransactionId =
                refundTransaction._id;

              walletRefundedPlayers +=
                1;

              totalWalletRefunded =
                Math.round(
                  (totalWalletRefunded +
                    walletAmountPaid) *
                    100
                ) / 100;
            } else if (
              paymentMethod ===
                "coin" &&
              coinAmountPaid > 0
            ) {
              const coinBalanceBefore =
                Math.floor(
                  Number(
                    user.coinBalance ||
                      0
                  )
                );

              const coinBalanceAfter =
                coinBalanceBefore +
                coinAmountPaid;

              user.coinBalance =
                coinBalanceAfter;

              await user.save({
                session,
              });

              const [
                refundCoinTransaction,
              ] =
                await CoinTransaction.create(
                  [
                    {
                      user:
                        user._id,

                      type:
                        "tournament_refund",

                      transactionType:
                        "credit",

                      amount:
                        coinAmountPaid,

                      balanceBefore:
                        coinBalanceBefore,

                      balanceAfter:
                        coinBalanceAfter,

                      description:
                        `Tournament cancellation coin refund: ${tournament.title}`,

                      referenceId:
                        `tournament-refund:${tournament._id}:${user._id}`,

                      metadata: {
                        tournamentId:
                          tournament._id,

                        tournamentTitle:
                          tournament.title,

                        paymentMethod:
                          "coin",

                        refundReason:
                          cancelReason,

                        amountRefunded:
                          coinAmountPaid,

                        paymentUnit:
                          "coin",
                      },
                    },
                  ],
                  {
                    session,
                  }
                );

              refundTransactionId =
                refundCoinTransaction._id;

              coinRefundedPlayers +=
                1;

              totalCoinRefunded +=
                coinAmountPaid;
            } else {
              freePlayers += 1;
            }

            if (
              paymentMethod !== "free"
            ) {
              const entryFeeEquivalent =
                Math.round(
                  Number(
                    tournament.entryFee ||
                      0
                  ) * 100
                ) / 100;

              user.totalEntryFeesPaid =
                Math.max(
                  0,
                  Math.round(
                    (Number(
                      user.totalEntryFeesPaid ||
                        0
                    ) -
                      entryFeeEquivalent) *
                      100
                  ) / 100
                );

              await user.save({
                session,
              });
            }

            refundedPlayers.push({
              userId:
                user._id,

              freeFireUid:
                player.freeFireUid,

              freeFireIgn:
                player.freeFireIgn,

              paymentMethod,

              walletRefunded:
                paymentMethod ===
                "wallet"
                  ? walletAmountPaid
                  : 0,

              coinRefunded:
                paymentMethod ===
                "coin"
                  ? coinAmountPaid
                  : 0,

              refundTransactionId,
            });
          }

          tournament.status =
            "Cancelled";

          tournament.cancelReason =
            cancelReason;

          tournament.cancelledAt =
            new Date();

          tournament.cancelledBy =
            req.user.userId;

          tournament.roomId = "";
          tournament.roomPassword = "";

          await tournament.save({
            session,
          });

          responseData = {
            success: true,

            message:
              "Tournament cancelled and entry payments refunded successfully",

            tournament: {
              id:
                tournament._id,

              title:
                tournament.title,

              status:
                tournament.status,

              cancelReason:
                tournament.cancelReason,

              cancelledAt:
                tournament.cancelledAt,

              cancelledBy:
                tournament.cancelledBy,
            },

            refundSummary: {
              totalJoined:
                tournament.joinedPlayers
                  .length,

              walletRefundedPlayers,

              coinRefundedPlayers,

              freePlayers,

              totalWalletRefunded,

              totalCoinRefunded,
            },

            refundedPlayers,
          };
        }
      );

      return res
        .status(200)
        .json(responseData);
    } catch (error) {
      console.error(
        "Cancel tournament error:",
        error
      );

      if (error.statusCode) {
        return res
          .status(error.statusCode)
          .json({
            success: false,
            message:
              error.message,
            ...(error.extraData ||
              {}),
          });
      }

      return res.status(500).json({
        success: false,

        message:
          "Server error while cancelling tournament",

        error:
          error.message,
      });
    } finally {
      await session.endSession();
    }
  }
);
// =====================================
// EXPIRE TOURNAMENT — ADMIN ONLY
// WALLET + COIN ENTRY AUTOMATIC REFUND
// =====================================
router.put(
  "/expire/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const session =
      await mongoose.startSession();

    let responseData = null;

    try {
      const expireReason =
        req.body?.expireReason
          ? String(
              req.body.expireReason
            ).trim()
          : "";

      if (!expireReason) {
        return res.status(400).json({
          success: false,
          message:
            "Tournament expiry reason is required",
        });
      }

      if (expireReason.length > 500) {
        return res.status(400).json({
          success: false,
          message:
            "Expiry reason cannot exceed 500 characters",
        });
      }

      await session.withTransaction(
        async () => {
          const tournament =
            await Tournament.findById(
              req.params.id
            ).session(session);

          if (!tournament) {
            throw createRouteError(
              404,
              "Tournament not found"
            );
          }

          if (
            tournament.status ===
            "Expired"
          ) {
            throw createRouteError(
              400,
              "Tournament is already expired"
            );
          }

          if (
            tournament.status ===
            "Cancelled"
          ) {
            throw createRouteError(
              400,
              "Cancelled tournament cannot be expired"
            );
          }

          if (
            tournament.status ===
            "Completed"
          ) {
            throw createRouteError(
              400,
              "Completed tournament cannot be expired"
            );
          }

          if (
            tournament.status !==
            "Upcoming"
          ) {
            throw createRouteError(
              400,
              "Only an upcoming tournament can be expired"
            );
          }

          let walletRefundedPlayers = 0;
          let coinRefundedPlayers = 0;
          let freePlayers = 0;

          let totalWalletRefunded = 0;
          let totalCoinRefunded = 0;

          const refundedPlayers = [];

          for (
            const player of
            tournament.joinedPlayers || []
          ) {
            const user =
              await User.findById(
                player.userId
              ).session(session);

            if (!user) {
              throw createRouteError(
                404,
                `Joined user not found: ${player.userId}`
              );
            }

            const walletAmountPaid =
              Math.round(
                Number(
                  player.walletAmountPaid ||
                    0
                ) * 100
              ) / 100;

            const coinAmountPaid =
              Math.floor(
                Number(
                  player.coinAmountPaid ||
                    0
                )
              );

            const savedPaymentMethod =
              String(
                player.paymentMethod ||
                  ""
              )
                .trim()
                .toLowerCase();

            const paymentMethod =
              [
                "wallet",
                "coin",
                "free",
              ].includes(
                savedPaymentMethod
              )
                ? savedPaymentMethod
                : coinAmountPaid > 0
                  ? "coin"
                  : walletAmountPaid > 0
                    ? "wallet"
                    : "free";

            let walletBalanceBefore =
              Math.round(
                Number(
                  user.walletBalance || 0
                ) * 100
              ) / 100;

            let walletBalanceAfter =
              walletBalanceBefore;

            let coinBalanceBefore =
              Math.floor(
                Number(
                  user.coinBalance || 0
                )
              );

            let coinBalanceAfter =
              coinBalanceBefore;

            let refundTransactionId =
              null;

            if (
              paymentMethod ===
                "wallet" &&
              walletAmountPaid > 0
            ) {
              walletBalanceAfter =
                Math.round(
                  (walletBalanceBefore +
                    walletAmountPaid) *
                    100
                ) / 100;

              user.walletBalance =
                walletBalanceAfter;

              walletRefundedPlayers +=
                1;

              totalWalletRefunded =
                Math.round(
                  (totalWalletRefunded +
                    walletAmountPaid) *
                    100
                ) / 100;
            } else if (
              paymentMethod ===
                "coin" &&
              coinAmountPaid > 0
            ) {
              coinBalanceAfter =
                coinBalanceBefore +
                coinAmountPaid;

              user.coinBalance =
                coinBalanceAfter;

              coinRefundedPlayers +=
                1;

              totalCoinRefunded +=
                coinAmountPaid;
            } else {
              freePlayers += 1;
            }

            if (
              paymentMethod !== "free"
            ) {
              const entryFeeEquivalent =
                Math.round(
                  Number(
                    tournament.entryFee ||
                      0
                  ) * 100
                ) / 100;

              user.totalEntryFeesPaid =
                Math.max(
                  0,
                  Math.round(
                    (Number(
                      user.totalEntryFeesPaid ||
                        0
                    ) -
                      entryFeeEquivalent) *
                      100
                  ) / 100
                );
            }

            await user.save({
              session,
            });

            if (
              paymentMethod ===
                "wallet" &&
              walletAmountPaid > 0
            ) {
              const [refundTransaction] =
                await Transaction.create(
                  [
                    {
                      userId:
                        user._id,

                      tournamentId:
                        tournament._id,

                      transactionType:
                        "refund",

                      amount:
                        walletAmountPaid,

                      balanceBefore:
                        walletBalanceBefore,

                      balanceAfter:
                        walletBalanceAfter,

                      status:
                        "success",

                      description:
                        `Tournament expiry refund: ${tournament.title}`,

                      processedBy:
                        req.user.userId,
                    },
                  ],
                  {
                    session,
                  }
                );

              refundTransactionId =
                refundTransaction._id;
            } else if (
              paymentMethod ===
                "coin" &&
              coinAmountPaid > 0
            ) {
              const [
                refundCoinTransaction,
              ] =
                await CoinTransaction.create(
                  [
                    {
                      user:
                        user._id,

                      type:
                        "tournament_refund",

                      transactionType:
                        "credit",

                      amount:
                        coinAmountPaid,

                      balanceBefore:
                        coinBalanceBefore,

                      balanceAfter:
                        coinBalanceAfter,

                      description:
                        `Tournament expiry coin refund: ${tournament.title}`,

                      referenceId:
                        `tournament-expire-refund:${tournament._id}:${user._id}`,

                      metadata: {
                        tournamentId:
                          tournament._id,

                        tournamentTitle:
                          tournament.title,

                        paymentMethod:
                          "coin",

                        refundType:
                          "tournament_expired",

                        refundReason:
                          expireReason,

                        amountRefunded:
                          coinAmountPaid,

                        paymentUnit:
                          "coin",
                      },
                    },
                  ],
                  {
                    session,
                  }
                );

              refundTransactionId =
                refundCoinTransaction._id;
            }

            refundedPlayers.push({
              userId:
                user._id,

              freeFireUid:
                player.freeFireUid,

              freeFireIgn:
                player.freeFireIgn,

              paymentMethod,

              walletRefunded:
                paymentMethod ===
                "wallet"
                  ? walletAmountPaid
                  : 0,

              coinRefunded:
                paymentMethod ===
                "coin"
                  ? coinAmountPaid
                  : 0,

              refundTransactionId,
            });
          }

          tournament.status =
            "Expired";

          tournament.expireReason =
            expireReason;

          tournament.expiredAt =
            new Date();

          tournament.expiredBy =
            req.user.userId;

          tournament.roomId = "";
          tournament.roomPassword = "";

          await tournament.save({
            session,
          });

          responseData = {
            success: true,

            message:
              "Tournament expired and entry payments refunded successfully",

            tournament: {
              id:
                tournament._id,

              title:
                tournament.title,

              status:
                tournament.status,

              expireReason:
                tournament.expireReason,

              expiredAt:
                tournament.expiredAt,

              expiredBy:
                tournament.expiredBy,
            },

            refundSummary: {
              totalJoined:
                tournament.joinedPlayers
                  .length,

              walletRefundedPlayers,

              coinRefundedPlayers,

              freePlayers,

              totalWalletRefunded,

              totalCoinRefunded,
            },

            refundedPlayers,
          };
        }
      );

      return res
        .status(200)
        .json(responseData);
    } catch (error) {
      console.error(
        "Expire tournament error:",
        error
      );

      if (error.statusCode) {
        return res
          .status(error.statusCode)
          .json({
            success: false,
            message:
              error.message,
            ...(error.extraData ||
              {}),
          });
      }

      return res.status(500).json({
        success: false,

        message:
          "Server error while expiring tournament",

        error:
          error.message,
      });
    } finally {
      await session.endSession();
    }
  }
);
// =====================================
// COMPLETE TOURNAMENT — ADMIN ONLY
// LIVE → COMPLETED
// =====================================
router.put(
  "/complete/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const tournament =
        await Tournament.findById(
          req.params.id
        );

      if (!tournament) {
        return res.status(404).json({
          message: "Tournament not found",
        });
      }

      if (
        tournament.status === "Completed"
      ) {
        return res.status(400).json({
          message:
            "Tournament is already completed",
        });
      }

      if (tournament.status !== "Live") {
        return res.status(400).json({
          message:
            "Only a live tournament can be completed",
        });
      }

      tournament.status = "Completed";

      await tournament.save();

      let referralProcessing = {
        checked: 0,
        newlyRewarded: 0,
        stillPending: 0,
        skipped: 0,
        failed: 0,
      };

      try {
        referralProcessing =
          await processCompletedTournamentReferrals(
            tournament
          );
      } catch (referralError) {
        console.error(
          "Tournament referral processing error:",
          referralError
        );

        referralProcessing.failed =
          (tournament.joinedPlayers || [])
            .length;
      }

      return res.status(200).json({
        message:
          "Tournament completed successfully",

        tournament: {
          id: tournament._id,
          title: tournament.title,
          status: tournament.status,
        },

        referralProcessing,
      });
    } catch (error) {
      console.error(
        "Complete tournament error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error while completing tournament",
        error: error.message,
      });
    }
  }
);

// =====================================
// PUBLISH MATCH RESULTS — ADMIN ONLY
// REWARDS WILL REMAIN PENDING
// =====================================
router.put(
  "/publish-results/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const {
        killRewardPerKill,
        rankRewards,
        results,
      } = req.body || {};

      if (!Array.isArray(results) || results.length === 0) {
        return res.status(400).json({
          message: "Results must be a non-empty array",
        });
      }

      const parsedKillRewardPerKill = Number(
        killRewardPerKill || 0
      );

      if (
        Number.isNaN(parsedKillRewardPerKill) ||
        parsedKillRewardPerKill < 0
      ) {
        return res.status(400).json({
          message:
            "Kill reward per kill must be a non-negative number",
        });
      }

      if (
        rankRewards !== undefined &&
        (typeof rankRewards !== "object" ||
          Array.isArray(rankRewards) ||
          rankRewards === null)
      ) {
        return res.status(400).json({
          message:
            "Rank rewards must be an object",
        });
      }

      const formattedRankRewards = {};

      for (const [rankKey, rewardValue] of Object.entries(
        rankRewards || {}
      )) {
        const parsedRank = Number(rankKey);
        const parsedReward = Number(rewardValue);

        if (
          !Number.isInteger(parsedRank) ||
          parsedRank < 1
        ) {
          return res.status(400).json({
            message: `Invalid rank reward key: ${rankKey}`,
          });
        }

        if (
          Number.isNaN(parsedReward) ||
          parsedReward < 0
        ) {
          return res.status(400).json({
            message: `Invalid reward amount for rank ${rankKey}`,
          });
        }

        formattedRankRewards[parsedRank] =
          Math.round(parsedReward * 100) / 100;
      }

      const tournament = await Tournament.findById(
        req.params.id
      );

      if (!tournament) {
        return res.status(404).json({
          message: "Tournament not found",
        });
      }

      if (tournament.status !== "Completed") {
        return res.status(400).json({
          message:
            "Tournament must be completed before publishing results",
        });
      }

      if (tournament.joinedPlayers.length === 0) {
        return res.status(400).json({
          message:
            "No players joined this tournament",
        });
      }

      const existingPaidReward =
        tournament.results.some(
          (result) =>
            result.rewardPaid === true ||
            result.rewardStatus === "approved"
        );

      if (existingPaidReward) {
        return res.status(400).json({
          message:
            "Results cannot be changed because one or more rewards have already been approved",
        });
      }

      const usedUserIds = new Set();
      const usedRanks = new Set();
      const formattedResults = [];

      let totalPendingPrize = 0;

      for (const result of results) {
        if (
          !result.userId ||
          result.rank === undefined ||
          result.kills === undefined
        ) {
          return res.status(400).json({
            message:
              "Every result requires userId, rank and kills",
          });
        }

        const userId = String(result.userId).trim();
        const rank = Number(result.rank);
        const kills = Number(result.kills);

        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({
            message: `Invalid user ID: ${userId}`,
          });
        }

        if (
          !Number.isInteger(rank) ||
          rank < 1
        ) {
          return res.status(400).json({
            message:
              "Rank must be a positive whole number",
          });
        }

        if (
          !Number.isInteger(kills) ||
          kills < 0
        ) {
          return res.status(400).json({
            message:
              "Kills must be a non-negative whole number",
          });
        }

        if (usedUserIds.has(userId)) {
          return res.status(400).json({
            message: `Duplicate player found: ${userId}`,
          });
        }

        if (usedRanks.has(rank)) {
          return res.status(400).json({
            message: `Duplicate rank found: ${rank}`,
          });
        }

        const joinedPlayer =
          tournament.joinedPlayers.find(
            (player) =>
              player.userId.toString() === userId
          );

        if (!joinedPlayer) {
          return res.status(400).json({
            message: `Player ${userId} did not join this tournament`,
          });
        }

        const killRewardAmount =
          Math.round(
            kills *
              parsedKillRewardPerKill *
              100
          ) / 100;

        const winnerRewardAmount =
          formattedRankRewards[rank] || 0;

        const prizeAmount =
          Math.round(
            (killRewardAmount +
              winnerRewardAmount) *
              100
          ) / 100;

        totalPendingPrize =
          Math.round(
            (totalPendingPrize + prizeAmount) *
              100
          ) / 100;

        usedUserIds.add(userId);
        usedRanks.add(rank);

        formattedResults.push({
          userId: joinedPlayer.userId,
          freeFireUid:
            joinedPlayer.freeFireUid,
          freeFireIgn:
            joinedPlayer.freeFireIgn,

          rank,
          kills,

          killRewardAmount,
          winnerRewardAmount,
          prizeAmount,

          isWinner: rank === 1,
          isDisqualified: false,

          rewardStatus: "pending",
          rewardPaid: false,
          rewardNote: "",

          verifiedBy: null,
          verifiedAt: null,

          killRewardTransactionId: null,
          winnerRewardTransactionId: null,
        });
      }

      if (
        totalPendingPrize >
        Number(tournament.prizePool)
      ) {
        return res.status(400).json({
          message:
            "Total pending reward cannot exceed tournament prize pool",

          prizePool: tournament.prizePool,
          submittedPrizeTotal:
            totalPendingPrize,
        });
      }

      formattedResults.sort(
        (a, b) => a.rank - b.rank
      );

      tournament.results = formattedResults;
      tournament.resultPublished = true;

      await tournament.save();

      return res.status(200).json({
        success: true,

        message:
          "Tournament results published. All rewards are pending admin verification.",

        tournament: {
          id: tournament._id,
          title: tournament.title,
          status: tournament.status,
          prizePool: tournament.prizePool,
          resultPublished:
            tournament.resultPublished,
          killRewardPerKill:
            parsedKillRewardPerKill,
          totalPendingPrize,
        },

        rankRewards: formattedRankRewards,
        results: tournament.results,
      });
    } catch (error) {
      console.error(
        "Publish results error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while publishing tournament results",
        error: error.message,
      });
    }
  }
);
// =====================================
// GET ALL TOURNAMENT RESULTS
// =====================================
router.get(
  "/results/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const tournament =
        await Tournament.findById(
          req.params.id
        );

      if (!tournament) {
        return res.status(404).json({
          message: "Tournament not found",
        });
      }

      if (
        !tournament.resultPublished
      ) {
        return res.status(400).json({
          message:
            "Tournament results have not been published yet",
        });
      }

      const sortedResults = [
        ...tournament.results,
      ].sort((a, b) => a.rank - b.rank);

      return res.status(200).json({
        message:
          "Tournament results fetched successfully",

        tournament: {
          id: tournament._id,
          title: tournament.title,
          game: tournament.game,
          mode: tournament.mode,
          map: tournament.map,
          status: tournament.status,
          prizePool:
            tournament.prizePool,

          resultPublished:
            tournament.resultPublished,
        },

        count: sortedResults.length,
        results: sortedResults,
      });
    } catch (error) {
      console.error(
        "Get results error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error while fetching tournament results",
        error: error.message,
      });
    }
  }
);
// =====================================
// GET SINGLE TOURNAMENT DETAILS
// PUBLIC — ROOM DETAILS HIDDEN
// =====================================
router.get(
  "/details/:id",
  async (req, res) => {
    try {
      const tournament =
        await Tournament.findById(
          req.params.id
        ).select(
          "-roomId -roomPassword -joinedPlayers -results -createdBy -cancelledBy -expiredBy"
        );

      if (!tournament) {
        return res.status(404).json({
          message:
            "Tournament not found",
        });
      }

      const settings =
        await Settings.findOne().select(
          "joinTournamentEnabled coinTournamentPaymentEnabled coinPaymentUpcomingText"
        );

      const globalJoinEnabled =
        settings
          ? settings.joinTournamentEnabled !==
            false
          : true;

      const coinPaymentEnabled =
        settings
          ? settings
              .coinTournamentPaymentEnabled ===
            true
          : false;

      const tournamentData =
        tournament.toObject();

      const availableSlots =
        Math.max(
          Number(
            tournament.totalSlots || 0
          ) -
            Number(
              tournament.joinedSlots || 0
            ),
          0
        );

      const isFull =
        availableSlots === 0;

      const isUpcoming =
        tournament.status ===
        "Upcoming";

      const canJoin =
        globalJoinEnabled &&
        isUpcoming &&
        !isFull;

      let joinDisabledReason = "";

      if (!globalJoinEnabled) {
        joinDisabledReason =
          "Tournament joining is currently disabled";
      } else if (!isUpcoming) {
        joinDisabledReason =
          `Tournament status is ${tournament.status}`;
      } else if (isFull) {
        joinDisabledReason =
          "Tournament is full";
      }

      return res.status(200).json({
        message:
          "Tournament details fetched successfully",

        tournament: {
          ...tournamentData,

          availableSlots,
          isFull,
          canJoin,
          joinDisabledReason,

          paymentOptions: {
            wallet: {
              enabled: true,
              status: canJoin
                ? "available"
                : "unavailable",
              amount:
                Number(
                  tournament.entryFee || 0
                ),
            },

            coin: {
              enabled:
                coinPaymentEnabled,

              status:
                coinPaymentEnabled
                  ? canJoin
                    ? "available"
                    : "unavailable"
                  : "upcoming",

              amount:
                Number(
                  tournament.coinEntryFee ||
                    0
                ),

              upcomingText:
                settings
                  ?.coinPaymentUpcomingText ||
                "UPCOMING",
            },
          },
        },
      });
    } catch (error) {
      if (
        error.name === "CastError"
      ) {
        return res.status(400).json({
          message:
            "Invalid tournament ID",
        });
      }

      console.error(
        "Get tournament details error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error while fetching tournament details",
        error: error.message,
      });
    }
  }
);
// =====================================
// GET LOGGED-IN PLAYER'S RESULT
// =====================================
router.get(
  "/my-result/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const tournament =
        await Tournament.findById(
          req.params.id
        );

      if (!tournament) {
        return res.status(404).json({
          message: "Tournament not found",
        });
      }

      if (
        !tournament.resultPublished
      ) {
        return res.status(400).json({
          message:
            "Tournament results have not been published yet",
        });
      }

      const playerResult =
        tournament.results.find(
          (result) =>
            result.userId.toString() ===
            req.user.userId.toString()
        );

      if (!playerResult) {
        return res.status(404).json({
          message:
            "Your result was not found in this tournament",
        });
      }

      return res.status(200).json({
        message:
          "Your tournament result fetched successfully",

        tournament: {
          id: tournament._id,
          title: tournament.title,
          status: tournament.status,
        },

        result: playerResult,
      });
    } catch (error) {
      console.error(
        "Get my result error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error while fetching your tournament result",
        error: error.message,
      });
    }
  }
);

// =====================================
// TOURNAMENT LEADERBOARD
// TOP PLAYERS SORTED BY RANK
// =====================================
router.get(
  "/leaderboard/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const tournament =
        await Tournament.findById(
          req.params.id
        );

      if (!tournament) {
        return res.status(404).json({
          message: "Tournament not found",
        });
      }

      if (
        !tournament.resultPublished
      ) {
        return res.status(400).json({
          message:
            "Tournament results have not been published yet",
        });
      }

      const limitValue =
        Number(req.query.limit) || 10;

      const safeLimit = Math.min(
        Math.max(limitValue, 1),
        100
      );

      const leaderboard = [
        ...tournament.results,
      ]
        .sort((a, b) => {
          if (a.rank !== b.rank) {
            return a.rank - b.rank;
          }

          return b.kills - a.kills;
        })
        .slice(0, safeLimit);

      const highestKillsPlayer = [
        ...tournament.results,
      ].sort(
        (a, b) => b.kills - a.kills
      )[0];

      const winner =
        tournament.results.find(
          (result) => result.rank === 1
        );

      return res.status(200).json({
        message:
          "Tournament leaderboard fetched successfully",

        tournament: {
          id: tournament._id,
          title: tournament.title,
          status: tournament.status,
        },

        winner: winner || null,

        highestKillsPlayer:
          highestKillsPlayer || null,

        count: leaderboard.length,
        leaderboard,
      });
    } catch (error) {
      console.error(
        "Get leaderboard error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error while fetching leaderboard",
        error: error.message,
      });
    }
  }
);

// pending reward route code
// =====================================
// ADMIN GET ALL PENDING REWARDS
// =====================================
router.get(
  "/admin/pending-rewards",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const tournaments = await Tournament.find({
        results: {
          $elemMatch: {
            rewardStatus: "pending",
          },
        },
      })
        .select(
          "title game mode map date time status prizePool results"
        )
        .sort({ updatedAt: -1 });

      const pendingRewards = [];

      tournaments.forEach((tournament) => {
        tournament.results.forEach((result) => {
          if (result.rewardStatus === "pending") {
            pendingRewards.push({
              tournamentId: tournament._id,
              tournamentTitle: tournament.title,
              game: tournament.game,
              mode: tournament.mode,
              map: tournament.map,
              date: tournament.date,
              time: tournament.time,
              tournamentStatus: tournament.status,
              prizePool: tournament.prizePool,

              userId: result.userId,
              freeFireUid: result.freeFireUid,
              freeFireIgn: result.freeFireIgn,

              rank: result.rank,
              kills: result.kills,
              isWinner: result.isWinner,

              killRewardAmount:
                result.killRewardAmount || 0,

              winnerRewardAmount:
                result.winnerRewardAmount || 0,

              prizeAmount:
                result.prizeAmount || 0,

              rewardStatus:
                result.rewardStatus,

              rewardPaid:
                result.rewardPaid,

              isDisqualified:
                result.isDisqualified,

              rewardNote:
                result.rewardNote || "",
            });
          }
        });
      });

      return res.status(200).json({
        success: true,
        message:
          "Pending rewards fetched successfully",
        count: pendingRewards.length,
        pendingRewards,
      });
    } catch (error) {
      console.error(
        "Get pending rewards error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while fetching pending rewards",
        error: error.message,
      });
    }
  }
);
// =====================================
// ADMIN APPROVE PLAYER REWARD
// WALLET CREDIT AFTER VERIFICATION
// =====================================
router.put(
  "/admin/rewards/:tournamentId/:userId/approve",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      let responseData = null;
      let rewardActivityEventData = null;

      await session.withTransaction(async () => {
        const { tournamentId, userId } = req.params;

        if (
          !mongoose.Types.ObjectId.isValid(tournamentId) ||
          !mongoose.Types.ObjectId.isValid(userId)
        ) {
          throw createRouteError(
            400,
            "Invalid tournament ID or user ID"
          );
        }

        const tournament = await Tournament.findById(
          tournamentId
        ).session(session);

        if (!tournament) {
          throw createRouteError(
            404,
            "Tournament not found"
          );
        }

        const result = tournament.results.find(
          (item) =>
            item.userId.toString() === userId
        );

        if (!result) {
          throw createRouteError(
            404,
            "Player reward result not found"
          );
        }

        if (result.isDisqualified) {
          throw createRouteError(
            400,
            "Disqualified player reward cannot be approved"
          );
        }

        if (
          result.rewardStatus === "approved" ||
          result.rewardPaid === true
        ) {
          throw createRouteError(
            400,
            "This reward has already been approved"
          );
        }

        if (result.rewardStatus === "rejected") {
          throw createRouteError(
            400,
            "Rejected reward cannot be approved"
          );
        }

        const user = await User.findById(
          userId
        ).session(session);

        if (!user) {
          throw createRouteError(
            404,
            "User not found"
          );
        }

        const killRewardAmount =
          Math.round(
            Number(result.killRewardAmount || 0) * 100
          ) / 100;

        const winnerRewardAmount =
          Math.round(
            Number(result.winnerRewardAmount || 0) * 100
          ) / 100;

        const totalReward =
          Math.round(
            (killRewardAmount + winnerRewardAmount) *
              100
          ) / 100;

        if (totalReward <= 0) {
          throw createRouteError(
            400,
            "Reward amount must be greater than zero"
          );
        }

        const balanceBefore =
          Math.round(
            Number(user.walletBalance || 0) * 100
          ) / 100;

        let runningBalance = balanceBefore;

        let killTransaction = null;
        let winnerTransaction = null;

        if (killRewardAmount > 0) {
          const killBalanceAfter =
            Math.round(
              (runningBalance + killRewardAmount) *
                100
            ) / 100;

          const createdKillTransactions =
            await Transaction.create(
              [
                {
                  userId: user._id,
                  tournamentId: tournament._id,
                  transactionType: "kill_reward",
                  amount: killRewardAmount,
                  balanceBefore: runningBalance,
                  balanceAfter: killBalanceAfter,
                  status: "success",
                  description: `Kill reward approved for ${tournament.title}`,
                  processedBy: req.user.userId,
                },
              ],
              { session }
            );

          killTransaction =
            createdKillTransactions[0];

          runningBalance = killBalanceAfter;
        }

        if (winnerRewardAmount > 0) {
          const winnerBalanceAfter =
            Math.round(
              (runningBalance +
                winnerRewardAmount) *
                100
            ) / 100;

          const createdWinnerTransactions =
            await Transaction.create(
              [
                {
                  userId: user._id,
                  tournamentId: tournament._id,
                  transactionType:
                    "winner_reward",
                  amount: winnerRewardAmount,
                  balanceBefore: runningBalance,
                  balanceAfter:
                    winnerBalanceAfter,
                  status: "success",
                  description: `Rank reward approved for ${tournament.title}`,
                  processedBy: req.user.userId,
                },
              ],
              { session }
            );

          winnerTransaction =
            createdWinnerTransactions[0];

          runningBalance = winnerBalanceAfter;
        }

        user.walletBalance = runningBalance;

        user.totalKillRewards =
          Math.round(
            (Number(user.totalKillRewards || 0) +
              killRewardAmount) *
              100
          ) / 100;

        user.totalWinnerRewards =
          Math.round(
            (Number(
              user.totalWinnerRewards || 0
            ) +
              winnerRewardAmount) *
              100
          ) / 100;

        user.totalWinnings =
          Math.round(
            (Number(user.totalWinnings || 0) +
              totalReward) *
              100
          ) / 100;

        await user.save({ session });

        result.rewardStatus = "approved";
        result.rewardPaid = true;
        result.isDisqualified = false;
        result.rewardNote =
          req.body?.rewardNote
            ? String(req.body.rewardNote).trim()
            : "Reward approved by admin";

        result.verifiedBy = req.user.userId;
        result.verifiedAt = new Date();

        result.killRewardTransactionId =
          killTransaction
            ? killTransaction._id
            : null;

        result.winnerRewardTransactionId =
          winnerTransaction
            ? winnerTransaction._id
            : null;

        await tournament.save({ session });
rewardActivityEventData = {
  user: {
    _id: user._id,
    name: user.name,
  },
  eventType: "tournament_reward",
  amount: totalReward,
  eventKey:
    `tournament_reward:${tournament._id}:${user._id}`,
  tournamentId: tournament._id,
  tournamentTitle: tournament.title,
  transactionId:
    winnerTransaction?._id ||
    killTransaction?._id ||
    null,
  metadata: {
    rank: result.rank,
    kills: result.kills,
    killRewardAmount,
    winnerRewardAmount,
    killRewardTransactionId:
      killTransaction?._id || null,
    winnerRewardTransactionId:
      winnerTransaction?._id || null,
  },
};
        responseData = {
          success: true,
          message:
            "Reward approved and added to user wallet successfully",

          tournament: {
            id: tournament._id,
            title: tournament.title,
          },

          player: {
            userId: user._id,
            freeFireUid: result.freeFireUid,
            freeFireIgn: result.freeFireIgn,
            rank: result.rank,
            kills: result.kills,
          },

          reward: {
            killRewardAmount,
            winnerRewardAmount,
            totalReward,
            rewardStatus: result.rewardStatus,
            rewardPaid: result.rewardPaid,
          },

          wallet: {
            balanceBefore,
            balanceAfter: runningBalance,
          },

          transactions: {
            killRewardTransaction:
              killTransaction,
            winnerRewardTransaction:
              winnerTransaction,
          },
        };
      });
if (rewardActivityEventData) {
  try {
    await createActivityEvent(
      rewardActivityEventData
    );
  } catch (activityError) {
    console.error(
      "Tournament reward activity event error:",
      activityError
    );
  }
}
      return res.status(200).json(responseData);
    } catch (error) {
      console.error(
        "Approve reward error:",
        error
      );

      if (error.statusCode) {
        return res
          .status(error.statusCode)
          .json({
            success: false,
            message: error.message,
            ...(error.extraData || {}),
          });
      }

      return res.status(500).json({
        success: false,
        message:
          "Server error while approving reward",
        error: error.message,
      });
    } finally {
      await session.endSession();
    }
  }
);

// =====================================
// ADMIN REJECT PLAYER REWARD
// NO WALLET CREDIT
// =====================================
router.put(
  "/admin/rewards/:tournamentId/:userId/reject",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      let responseData = null;

      await session.withTransaction(async () => {
        const { tournamentId, userId } = req.params;

        const {
          rewardNote,
          isDisqualified,
        } = req.body || {};

        if (
          !mongoose.Types.ObjectId.isValid(tournamentId) ||
          !mongoose.Types.ObjectId.isValid(userId)
        ) {
          throw createRouteError(
            400,
            "Invalid tournament ID or user ID"
          );
        }

        if (
          !rewardNote ||
          !String(rewardNote).trim()
        ) {
          throw createRouteError(
            400,
            "Reject reason is required"
          );
        }

        const tournament = await Tournament.findById(
          tournamentId
        ).session(session);

        if (!tournament) {
          throw createRouteError(
            404,
            "Tournament not found"
          );
        }

        const result = tournament.results.find(
          (item) =>
            item.userId.toString() === userId
        );

        if (!result) {
          throw createRouteError(
            404,
            "Player reward result not found"
          );
        }

        if (
          result.rewardStatus === "approved" ||
          result.rewardPaid === true
        ) {
          throw createRouteError(
            400,
            "Approved reward cannot be rejected"
          );
        }

        if (result.rewardStatus === "rejected") {
          throw createRouteError(
            400,
            "This reward has already been rejected"
          );
        }

        result.rewardStatus = "rejected";
        result.rewardPaid = false;

        result.isDisqualified =
          isDisqualified === true;

        result.rewardNote =
          String(rewardNote).trim();

        result.verifiedBy =
          req.user.userId;

        result.verifiedAt =
          new Date();

        result.killRewardTransactionId =
          null;

        result.winnerRewardTransactionId =
          null;

        await tournament.save({
          session,
        });

        responseData = {
          success: true,

          message:
            "Reward rejected successfully",

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

            rewardStatus:
              result.rewardStatus,

            rewardPaid:
              result.rewardPaid,

            isDisqualified:
              result.isDisqualified,

            rewardNote:
              result.rewardNote,

            verifiedBy:
              result.verifiedBy,

            verifiedAt:
              result.verifiedAt,
          },
        };
      });

      return res
        .status(200)
        .json(responseData);
    } catch (error) {
      console.error(
        "Reject reward error:",
        error
      );

      if (error.statusCode) {
        return res
          .status(error.statusCode)
          .json({
            success: false,
            message: error.message,
            ...(error.extraData || {}),
          });
      }

      return res.status(500).json({
        success: false,
        message:
          "Server error while rejecting reward",
        error: error.message,
      });
    } finally {
      await session.endSession();
    }
  }
);
// =====================================
// LOGGED-IN USER REWARD HISTORY
// =====================================
router.get(
  "/my-reward-history",
  authMiddleware,
  async (req, res) => {
    try {
      const tournaments = await Tournament.find({
        results: {
          $elemMatch: {
            userId: req.user.userId,
          },
        },
      })
        .select(
          "title game mode map date time status results"
        )
        .sort({ updatedAt: -1 });

      const rewardHistory = [];

      tournaments.forEach((tournament) => {
        const playerResult =
          tournament.results.find(
            (result) =>
              result.userId.toString() ===
              req.user.userId.toString()
          );

        if (playerResult) {
          rewardHistory.push({
            tournamentId: tournament._id,
            tournamentTitle: tournament.title,
            game: tournament.game,
            mode: tournament.mode,
            map: tournament.map,
            date: tournament.date,
            time: tournament.time,
            tournamentStatus:
              tournament.status,

            rank: playerResult.rank,
            kills: playerResult.kills,
            isWinner:
              playerResult.isWinner,

            killRewardAmount:
              playerResult.killRewardAmount || 0,

            winnerRewardAmount:
              playerResult.winnerRewardAmount || 0,

            totalReward:
              playerResult.prizeAmount || 0,

            rewardStatus:
              playerResult.rewardStatus,

            rewardPaid:
              playerResult.rewardPaid,

            isDisqualified:
              playerResult.isDisqualified,

            rewardNote:
              playerResult.rewardNote || "",

            verifiedAt:
              playerResult.verifiedAt || null,
          });
        }
      });

      return res.status(200).json({
        success: true,
        message:
          "Reward history fetched successfully",
        count: rewardHistory.length,
        rewardHistory,
      });
    } catch (error) {
      console.error(
        "Get reward history error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while fetching reward history",
        error: error.message,
      });
    }
  }
);
// =====================================
// LOGGED-IN USER'S JOINED TOURNAMENTS
// GET /api/tournaments/my-tournaments
// =====================================
router.get(
  "/my-tournaments",
  authMiddleware,
  async (req, res) => {
    try {
      const allowedStatuses = [
        "Upcoming",
        "Live",
        "Completed",
        "Cancelled",
        "Expired",
      ];

      const requestedStatus = req.query.status
        ? String(req.query.status).trim()
        : "";

      const filter = {
        "joinedPlayers.userId": req.user.userId,
      };

      if (requestedStatus) {
        const matchedStatus = allowedStatuses.find(
          (status) =>
            status.toLowerCase() ===
            requestedStatus.toLowerCase()
        );

        if (!matchedStatus) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid tournament status filter",
            allowedStatuses,
          });
        }

        filter.status = matchedStatus;
      }

      const tournaments = await Tournament.find(
        filter
      )
        .select(
          "title game mode map entryFee coinEntryFee prizePool totalSlots joinedSlots date time status roomId roomPassword cancelReason cancelledAt expireReason expiredAt resultPublished joinedPlayers createdAt updatedAt"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

      const myTournaments = tournaments
        .map((tournament) => {
          const joinedPlayer =
            (
              tournament.joinedPlayers || []
            ).find(
              (player) =>
                String(player.userId) ===
                String(req.user.userId)
            );

          if (!joinedPlayer) {
            return null;
          }

          const walletAmountPaid =
            Math.round(
              Number(
                joinedPlayer.walletAmountPaid ||
                  0
              ) * 100
            ) / 100;

          const coinAmountPaid =
            Math.floor(
              Number(
                joinedPlayer.coinAmountPaid ||
                  0
              )
            );

          const savedPaymentMethod =
            String(
              joinedPlayer.paymentMethod || ""
            )
              .trim()
              .toLowerCase();

          const paymentMethod = [
            "wallet",
            "coin",
            "free",
          ].includes(savedPaymentMethod)
            ? savedPaymentMethod
            : coinAmountPaid > 0
              ? "coin"
              : walletAmountPaid > 0
                ? "wallet"
                : Number(
                      tournament.entryFee || 0
                    ) === 0
                  ? "free"
                  : "previous_entry";

          const paymentLabel =
            paymentMethod === "coin"
              ? "Coin Paid"
              : paymentMethod === "wallet"
                ? "Wallet Paid"
                : paymentMethod === "free"
                  ? "Free Entry"
                  : "Previous Entry";

          const roomAvailable = Boolean(
            tournament.roomId &&
              tournament.roomPassword
          );

          return {
            id: tournament._id,
            title: tournament.title,
            game: tournament.game,
            mode: tournament.mode,
            map: tournament.map,

            walletEntryFee:
              tournament.entryFee || 0,

            coinEntryFee:
              tournament.coinEntryFee || 0,

            prizePool:
              tournament.prizePool || 0,

            totalSlots:
              tournament.totalSlots,

            joinedSlots:
              tournament.joinedSlots,

            date: tournament.date,
            time: tournament.time,
            status: tournament.status,

            resultPublished:
              tournament.resultPublished ===
              true,

            roomAvailable,

            roomEndpoint: roomAvailable
              ? `/api/tournaments/room/${tournament._id}`
              : null,

            cancelReason:
              tournament.cancelReason || "",

            cancelledAt:
              tournament.cancelledAt || null,

            expireReason:
              tournament.expireReason || "",

            expiredAt:
              tournament.expiredAt || null,

            myJoin: {
              freeFireUid:
                joinedPlayer.freeFireUid,

              freeFireIgn:
                joinedPlayer.freeFireIgn,

              paymentMethod,
              paymentLabel,
              walletAmountPaid,
              coinAmountPaid,

              rulesAccepted:
                joinedPlayer.rulesAccepted ===
                true,

              rulesVersionAccepted:
                Number(
                  joinedPlayer.rulesVersionAccepted ||
                    0
                ),

              rulesLanguageAccepted:
                joinedPlayer.rulesLanguageAccepted ||
                "",

              joinedAt:
                joinedPlayer.joinedAt ||
                null,
            },

            createdAt:
              tournament.createdAt,

            updatedAt:
              tournament.updatedAt,
          };
        })
        .filter(Boolean);

      return res.status(200).json({
        success: true,

        message:
          "My tournaments fetched successfully",

        count: myTournaments.length,

        appliedStatus:
          requestedStatus || "all",

        tournaments: myTournaments,
      });
    } catch (error) {
      console.error(
        "Get my tournaments error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error while fetching my tournaments",

        error: error.message,
      });
    }
  }
);
module.exports = router;
