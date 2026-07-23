const express = require("express");

const Tournament = require("../tournament");
const User = require("../user");

const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const router = express.Router();

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
        map,
        entryFee,
        prizePool,
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
        !totalSlots ||
        !date ||
        !time
      ) {
        return res.status(400).json({
          message: "All tournament fields are required",
        });
      }

      const parsedEntryFee = Number(entryFee);
      const parsedPrizePool = Number(prizePool);
      const parsedTotalSlots = Number(totalSlots);

      if (
        Number.isNaN(parsedEntryFee) ||
        Number.isNaN(parsedPrizePool) ||
        Number.isNaN(parsedTotalSlots)
      ) {
        return res.status(400).json({
          message: "Entry fee, prize pool and total slots must be numbers",
        });
      }

      if (
        parsedEntryFee < 0 ||
        parsedPrizePool < 0 ||
        parsedTotalSlots < 1
      ) {
        return res.status(400).json({
          message:
            "Entry fee and prize pool cannot be negative, and total slots must be at least 1",
        });
      }

      const tournament = await Tournament.create({
        title: String(title).trim(),
        game: game ? String(game).trim() : "Free Fire",
        mode: String(mode).trim(),
        map: String(map).trim(),
        entryFee: parsedEntryFee,
        prizePool: parsedPrizePool,
        totalSlots: parsedTotalSlots,
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
        message: "Server error while creating tournament",
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
      .select("-roomId -roomPassword")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Tournaments fetched successfully",
      count: tournaments.length,
      tournaments,
    });
  } catch (error) {
    console.error("Get tournaments error:", error);

    return res.status(500).json({
      message: "Server error while fetching tournaments",
      error: error.message,
    });
  }
});

// =====================================
// JOIN TOURNAMENT
// UID + IGN AUTOMATICALLY SAVED
// =====================================
router.post("/join/:id", authMiddleware, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        message: "Tournament not found",
      });
    }

    if (tournament.status !== "Upcoming") {
      return res.status(400).json({
        message: "This tournament is not open for joining",
      });
    }

    if (tournament.createdBy.toString() === req.user.userId.toString()) {
      return res.status(400).json({
        message: "Tournament creator cannot join own tournament",
      });
    }

    const alreadyJoined = tournament.joinedPlayers.some(
      (player) =>
        player.userId.toString() === req.user.userId.toString()
    );

    if (alreadyJoined) {
      return res.status(400).json({
        message: "You have already joined this tournament",
      });
    }

    if (tournament.joinedSlots >= tournament.totalSlots) {
      return res.status(400).json({
        message: "Tournament is full",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.freeFireUid || !user.freeFireIgn) {
      return res.status(400).json({
        message: "Free Fire UID and IGN are required before joining",
      });
    }

    tournament.joinedPlayers.push({
      userId: user._id,
      freeFireUid: user.freeFireUid,
      freeFireIgn: user.freeFireIgn,
      joinedAt: new Date(),
    });

    tournament.joinedSlots = tournament.joinedPlayers.length;

    await tournament.save();

    return res.status(200).json({
      message: "Tournament joined successfully",
      player: {
        userId: user._id,
        freeFireUid: user.freeFireUid,
        freeFireIgn: user.freeFireIgn,
      },
      joinedSlots: tournament.joinedSlots,
      totalSlots: tournament.totalSlots,
    });
  } catch (error) {
    console.error("Join tournament error:", error);

    return res.status(500).json({
      message: "Server error while joining tournament",
      error: error.message,
    });
  }
});

// =====================================
// UPDATE TOURNAMENT — ADMIN ONLY
// =====================================
router.put(
  "/update/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const tournament = await Tournament.findById(req.params.id);

      if (!tournament) {
        return res.status(404).json({
          message: "Tournament not found",
        });
      }

      if (tournament.status === "Completed") {
        return res.status(400).json({
          message: "Completed tournament cannot be updated",
        });
      }

      const allowedFields = [
        "title",
        "game",
        "mode",
        "map",
        "entryFee",
        "prizePool",
        "totalSlots",
        "date",
        "time",
      ];

      allowedFields.forEach((field) => {
        if (req.body && req.body[field] !== undefined) {
          tournament[field] = req.body[field];
        }
      });

      if (Number(tournament.totalSlots) < tournament.joinedSlots) {
        return res.status(400).json({
          message: "Total slots cannot be less than joined slots",
        });
      }

      await tournament.save();

      return res.status(200).json({
        message: "Tournament updated successfully",
        tournament,
      });
    } catch (error) {
      console.error("Update tournament error:", error);

      return res.status(500).json({
        message: "Server error while updating tournament",
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
      const { roomId, roomPassword } = req.body || {};

      if (!roomId || !roomPassword) {
        return res.status(400).json({
          message: "Room ID and room password are required",
        });
      }

      const tournament = await Tournament.findById(req.params.id);

      if (!tournament) {
        return res.status(404).json({
          message: "Tournament not found",
        });
      }

      if (tournament.status === "Completed") {
        return res.status(400).json({
          message: "Completed tournament cannot be made live",
        });
      }

      tournament.roomId = String(roomId).trim();
      tournament.roomPassword = String(roomPassword).trim();
      tournament.status = "Live";

      await tournament.save();

      return res.status(200).json({
        message: "Room details published successfully",
        tournament: {
          id: tournament._id,
          title: tournament.title,
          status: tournament.status,
          roomId: tournament.roomId,
          roomPassword: tournament.roomPassword,
        },
      });
    } catch (error) {
      console.error("Publish room error:", error);

      return res.status(500).json({
        message: "Server error while publishing room details",
        error: error.message,
      });
    }
  }
);

// =====================================
// VIEW ROOM DETAILS
// JOINED PLAYER OR ADMIN ONLY
// =====================================
router.get("/room/:id", authMiddleware, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        message: "Tournament not found",
      });
    }

    const isAdmin = req.user.role === "admin";

    const isJoined = tournament.joinedPlayers.some(
      (player) =>
        player.userId.toString() === req.user.userId.toString()
    );

    if (!isAdmin && !isJoined) {
      return res.status(403).json({
        message: "Only joined players can view room details",
      });
    }

    if (!tournament.roomId || !tournament.roomPassword) {
      return res.status(400).json({
        message: "Room details have not been published yet",
      });
    }

    return res.status(200).json({
      message: "Room details fetched successfully",
      tournament: {
        id: tournament._id,
        title: tournament.title,
        status: tournament.status,
        roomId: tournament.roomId,
        roomPassword: tournament.roomPassword,
      },
    });
  } catch (error) {
    console.error("View room error:", error);

    return res.status(500).json({
      message: "Server error while fetching room details",
      error: error.message,
    });
  }
});

// =====================================
// ADMIN VIEW JOINED PLAYERS
// =====================================
router.get(
  "/players/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const tournament = await Tournament.findById(req.params.id);

      if (!tournament) {
        return res.status(404).json({
          message: "Tournament not found",
        });
      }

      return res.status(200).json({
        message: "Joined players fetched successfully",
        tournament: {
          id: tournament._id,
          title: tournament.title,
          status: tournament.status,
          joinedSlots: tournament.joinedSlots,
          totalSlots: tournament.totalSlots,
        },
        players: tournament.joinedPlayers,
      });
    } catch (error) {
      console.error("Get players error:", error);

      return res.status(500).json({
        message: "Server error while fetching joined players",
        error: error.message,
      });
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
      const tournament = await Tournament.findById(req.params.id);

      if (!tournament) {
        return res.status(404).json({
          message: "Tournament not found",
        });
      }

      if (tournament.status === "Completed") {
        return res.status(400).json({
          message: "Tournament is already completed",
        });
      }

      if (tournament.status !== "Live") {
        return res.status(400).json({
          message: "Only a live tournament can be completed",
        });
      }

      tournament.status = "Completed";

      await tournament.save();

      return res.status(200).json({
        message: "Tournament completed successfully",
        tournament: {
          id: tournament._id,
          title: tournament.title,
          status: tournament.status,
        },
      });
    } catch (error) {
      console.error("Complete tournament error:", error);

      return res.status(500).json({
        message: "Server error while completing tournament",
        error: error.message,
      });
    }
  }
);

// =====================================
// PUBLISH MATCH RESULTS — ADMIN ONLY
// =====================================
router.put(
  "/publish-results/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { results } = req.body || {};

      if (!Array.isArray(results) || results.length === 0) {
        return res.status(400).json({
          message: "Results must be a non-empty array",
        });
      }

      const tournament = await Tournament.findById(req.params.id);

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
          message: "No players joined this tournament",
        });
      }

      const usedUserIds = new Set();
      const usedRanks = new Set();
      const formattedResults = [];

      let totalPrizeAmount = 0;

      for (const result of results) {
        if (
          !result.userId ||
          result.rank === undefined ||
          result.kills === undefined ||
          result.prizeAmount === undefined
        ) {
          return res.status(400).json({
            message:
              "Every result requires userId, rank, kills and prizeAmount",
          });
        }

        const userId = String(result.userId);
        const rank = Number(result.rank);
        const kills = Number(result.kills);
        const prizeAmount = Number(result.prizeAmount);

        if (
          Number.isNaN(rank) ||
          Number.isNaN(kills) ||
          Number.isNaN(prizeAmount)
        ) {
          return res.status(400).json({
            message: "Rank, kills and prize amount must be numbers",
          });
        }

        if (!Number.isInteger(rank) || rank < 1) {
          return res.status(400).json({
            message: "Rank must be a positive whole number",
          });
        }

        if (!Number.isInteger(kills) || kills < 0) {
          return res.status(400).json({
            message: "Kills must be a non-negative whole number",
          });
        }

        if (prizeAmount < 0) {
          return res.status(400).json({
            message: "Prize amount cannot be negative",
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

        const joinedPlayer = tournament.joinedPlayers.find(
          (player) => player.userId.toString() === userId
        );

        if (!joinedPlayer) {
          return res.status(400).json({
            message: `Player ${userId} did not join this tournament`,
          });
        }

        usedUserIds.add(userId);
        usedRanks.add(rank);
        totalPrizeAmount += prizeAmount;

        formattedResults.push({
          userId: joinedPlayer.userId,
          freeFireUid: joinedPlayer.freeFireUid,
          freeFireIgn: joinedPlayer.freeFireIgn,
          rank,
          kills,
          prizeAmount,
          isWinner: rank === 1,
        });
      }

      if (totalPrizeAmount > tournament.prizePool) {
        return res.status(400).json({
          message: "Total prize amount cannot exceed tournament prize pool",
          prizePool: tournament.prizePool,
          submittedPrizeTotal: totalPrizeAmount,
        });
      }

      formattedResults.sort((a, b) => a.rank - b.rank);

      tournament.results = formattedResults;
      tournament.resultPublished = true;

      await tournament.save();

      return res.status(200).json({
        message: "Tournament results published successfully",
        tournament: {
          id: tournament._id,
          title: tournament.title,
          status: tournament.status,
          resultPublished: tournament.resultPublished,
          prizePool: tournament.prizePool,
          distributedPrize: totalPrizeAmount,
        },
        results: tournament.results,
      });
    } catch (error) {
      console.error("Publish results error:", error);

      return res.status(500).json({
        message: "Server error while publishing tournament results",
        error: error.message,
      });
    }
  }
);

// =====================================
// GET ALL TOURNAMENT RESULTS
// =====================================
router.get("/results/:id", authMiddleware, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        message: "Tournament not found",
      });
    }

    if (!tournament.resultPublished) {
      return res.status(400).json({
        message: "Tournament results have not been published yet",
      });
    }

    const sortedResults = [...tournament.results].sort(
      (a, b) => a.rank - b.rank
    );

    return res.status(200).json({
      message: "Tournament results fetched successfully",
      tournament: {
        id: tournament._id,
        title: tournament.title,
        game: tournament.game,
        mode: tournament.mode,
        map: tournament.map,
        status: tournament.status,
        prizePool: tournament.prizePool,
        resultPublished: tournament.resultPublished,
      },
      count: sortedResults.length,
      results: sortedResults,
    });
  } catch (error) {
    console.error("Get results error:", error);

    return res.status(500).json({
      message: "Server error while fetching tournament results",
      error: error.message,
    });
  }
});

// =====================================
// GET LOGGED-IN PLAYER'S RESULT
// =====================================
router.get("/my-result/:id", authMiddleware, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        message: "Tournament not found",
      });
    }

    if (!tournament.resultPublished) {
      return res.status(400).json({
        message: "Tournament results have not been published yet",
      });
    }

    const playerResult = tournament.results.find(
      (result) =>
        result.userId.toString() === req.user.userId.toString()
    );

    if (!playerResult) {
      return res.status(404).json({
        message: "Your result was not found in this tournament",
      });
    }

    return res.status(200).json({
      message: "Your tournament result fetched successfully",
      tournament: {
        id: tournament._id,
        title: tournament.title,
        status: tournament.status,
      },
      result: playerResult,
    });
  } catch (error) {
    console.error("Get my result error:", error);

    return res.status(500).json({
      message: "Server error while fetching your tournament result",
      error: error.message,
    });
  }
});

// =====================================
// TOURNAMENT LEADERBOARD
// TOP PLAYERS SORTED BY RANK
// =====================================
router.get("/leaderboard/:id", authMiddleware, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        message: "Tournament not found",
      });
    }

    if (!tournament.resultPublished) {
      return res.status(400).json({
        message: "Tournament results have not been published yet",
      });
    }

    const limitValue = Number(req.query.limit) || 10;
    const safeLimit = Math.min(Math.max(limitValue, 1), 100);

    const leaderboard = [...tournament.results]
      .sort((a, b) => {
        if (a.rank !== b.rank) {
          return a.rank - b.rank;
        }

        return b.kills - a.kills;
      })
      .slice(0, safeLimit);

    const highestKillsPlayer = [...tournament.results].sort(
      (a, b) => b.kills - a.kills
    )[0];

    const winner = tournament.results.find(
      (result) => result.rank === 1
    );

    return res.status(200).json({
      message: "Tournament leaderboard fetched successfully",
      tournament: {
        id: tournament._id,
        title: tournament.title,
        status: tournament.status,
      },
      winner: winner || null,
      highestKillsPlayer: highestKillsPlayer || null,
      count: leaderboard.length,
      leaderboard,
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);

    return res.status(500).json({
      message: "Server error while fetching leaderboard",
      error: error.message,
    });
  }
});

module.exports = router;