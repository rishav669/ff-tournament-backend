const express = require("express");

const ActivityEvent = require(
  "../activityEvent"
);
const Settings = require("../settings");

const router = express.Router();

// =====================================
// GET PUBLIC LIVE ACTIVITY TICKER
// GET /api/activity/ticker
// =====================================
router.get("/ticker", async (req, res) => {
  try {
    const requestedLimit =
      Number(req.query.limit) || 20;

    const safeLimit = Math.min(
      Math.max(
        Math.floor(requestedLimit),
        1
      ),
      50
    );

    const settings =
      await Settings.findOne()
        .select("activityBannerEnabled")
        .lean();

    const tickerEnabled =
      settings
        ? settings.activityBannerEnabled !==
          false
        : true;

    const tickerConfig = {
      enabled: tickerEnabled,
      repeat: true,
      direction: "right_to_left",
      intervalSeconds: 8,
      separator: " • ",
    };

    if (!tickerEnabled) {
      return res.status(200).json({
        success: true,
        message:
          "Live activity ticker is disabled",
        ticker: tickerConfig,
        total: 0,
        tickerText: "",
        events: [],
      });
    }

    const events =
      await ActivityEvent.find({
        isVisible: true,
      })
        .select(
          "eventType amount currency maskedName message occurredAt"
        )
        .sort({
          occurredAt: -1,
          _id: -1,
        })
        .limit(safeLimit)
        .lean();

    const publicEvents = events.map(
      (event) => ({
        id: event._id,
        eventType: event.eventType,
        amount: event.amount,
        currency: event.currency,
        maskedName: event.maskedName,
        message: event.message,
        occurredAt: event.occurredAt,
      })
    );

    const tickerText =
      publicEvents
        .map((event) => event.message)
        .join(tickerConfig.separator);

    return res.status(200).json({
      success: true,
      message:
        "Live activity ticker fetched successfully",
      ticker: tickerConfig,
      total: publicEvents.length,
      tickerText,
      events: publicEvents,
    });
  } catch (error) {
    console.error(
      "Get activity ticker error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch live activity ticker",
      error: error.message,
    });
  }
});

module.exports = router;