const ActivityEvent = require(
  "./activityEvent"
);

const ALLOWED_EVENT_TYPES = [
  "deposit",
  "tournament_join",
  "tournament_reward",
  "withdrawal",
];

const maskDisplayName = (name) => {
  const normalizedName = String(name || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!normalizedName) {
    return "Pla***";
  }

  const firstName =
    normalizedName.split(" ")[0];

  const characters =
    Array.from(firstName);

  const visibleCharacters =
    characters.slice(
      0,
      Math.min(3, characters.length)
    );

  return `${visibleCharacters.join("")}***`;
};

const roundMoney = (amount) => {
  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      "Activity amount must be greater than zero"
    );
  }

  return (
    Math.round(numericAmount * 100) /
    100
  );
};

const roundNonNegativeMoney = (
  amount
) => {
  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount < 0
  ) {
    throw new Error(
      "Activity amount cannot be negative"
    );
  }

  return (
    Math.round(numericAmount * 100) /
    100
  );
};

const formatMoney = (amount) => {
  return Number(amount).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  );
};

const buildActivityMessage = (
  eventType,
  maskedName,
  amount,
  tournamentTitle = ""
) => {
  const formattedAmount =
    formatMoney(amount);

  if (eventType === "deposit") {
    return `💰 ${maskedName} deposited ₹${formattedAmount}`;
  }

  if (eventType === "tournament_join") {
    const safeTournamentTitle =
      String(tournamentTitle || "")
        .trim()
        .slice(0, 80);

    return safeTournamentTitle
      ? `🎮 ${maskedName} joined ${safeTournamentTitle}`
      : `🎮 ${maskedName} joined a tournament`;
  }

  if (
    eventType ===
    "tournament_reward"
  ) {
    return `🏆 ${maskedName} won ₹${formattedAmount}`;
  }

  if (eventType === "withdrawal") {
    return `✅ ${maskedName} withdrew ₹${formattedAmount}`;
  }

  throw new Error(
    "Unsupported activity event type"
  );
};

const createActivityEvent = async ({
  user,
  eventType,
  amount,
  eventKey,
  tournamentId = null,
  tournamentTitle = "",
  transactionId = null,
  withdrawRequestId = null,
  metadata = {},
}) => {
  if (!user || !user._id) {
    throw new Error(
      "Valid user is required for activity event"
    );
  }

  if (
    !ALLOWED_EVENT_TYPES.includes(
      eventType
    )
  ) {
    throw new Error(
      "Invalid activity event type"
    );
  }

  const normalizedEventKey =
    String(eventKey || "").trim();

  if (!normalizedEventKey) {
    throw new Error(
      "Activity event key is required"
    );
  }

  const normalizedAmount =
    eventType === "tournament_join"
      ? roundNonNegativeMoney(amount)
      : roundMoney(amount);

  const maskedName =
    maskDisplayName(user.name);

  const message =
    buildActivityMessage(
      eventType,
      maskedName,
      normalizedAmount,
      tournamentTitle
    );

  const existingEvent =
    await ActivityEvent.findOne({
      eventKey: normalizedEventKey,
    });

  if (existingEvent) {
    return {
      created: false,
      event: existingEvent,
    };
  }

  try {
    const event =
      await ActivityEvent.create({
        user: user._id,
        eventType,
        amount: normalizedAmount,
        currency: "INR",
        maskedName,
        message,
        eventKey: normalizedEventKey,
        tournament: tournamentId,
        transaction: transactionId,
        withdrawRequest:
          withdrawRequestId,
        isVisible: true,
        occurredAt: new Date(),
        metadata:
          metadata &&
          typeof metadata === "object" &&
          !Array.isArray(metadata)
            ? metadata
            : {},
      });

    return {
      created: true,
      event,
    };
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateEvent =
        await ActivityEvent.findOne({
          eventKey:
            normalizedEventKey,
        });

      return {
        created: false,
        event: duplicateEvent,
      };
    }

    throw error;
  }
};

module.exports = {
  maskDisplayName,
  buildActivityMessage,
  createActivityEvent,
};