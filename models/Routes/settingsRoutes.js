const express = require("express");

const Settings = require("../settings");

const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const router = express.Router();

// =====================================
// SETTINGS HELPERS
// =====================================
const BOOLEAN_FIELDS = [
  "maintenanceMode",
  "registrationEnabled",
  "depositEnabled",
  "withdrawalEnabled",
  "joinTournamentEnabled",
  "rewardedAdsEnabled",
  "couponRedeemEnabled",
  "referralEnabled",
  "rulesAcceptanceRequired",
  "activityBannerEnabled",
];

const NUMBER_RULES = {
  minimumDeposit: {
    minimum: 0,
    integer: false,
  },
  minimumWithdrawal: {
    minimum: 0,
    integer: false,
  },
  withdrawalFee: {
    minimum: 0,
    integer: false,
  },
  withdrawalTimeHours: {
    minimum: 0,
    integer: false,
  },
  defaultEntryFee: {
    minimum: 0,
    integer: false,
  },
  defaultPrizePool: {
    minimum: 0,
    integer: false,
  },
  perKillReward: {
    minimum: 0,
    integer: false,
  },
  maxPlayers: {
    minimum: 1,
    integer: true,
  },
  coinPerAd: {
    minimum: 1,
    integer: true,
  },
  dailyAdLimit: {
    minimum: 0,
    integer: true,
  },
  coinRequiredForCoupon: {
    minimum: 1,
    integer: true,
  },
  couponValue: {
    minimum: 1,
    integer: false,
  },
  referralRewardAmount: {
    minimum: 1,
    integer: false,
  },
  referralMinimumDeposit: {
    minimum: 0,
    integer: false,
  },
  referralMinimumTournamentEntry: {
    minimum: 0,
    integer: false,
  },
  referralRequiredCompletedMatches: {
    minimum: 1,
    integer: true,
  },
  referralValidityDays: {
    minimum: 1,
    integer: true,
  },

  minimumFreeFireLevel: {
    minimum: 1,
    integer: true,
  },
};

const TEXT_FIELDS = [
  "gameDisclaimerEnglish",
  "gameDisclaimerHindi",
  "refundPolicyEnglish",
  "refundPolicyHindi",
];

const RULE_LIST_FIELDS = [
  "fairPlayRulesEnglish",
  "fairPlayRulesHindi",
];

const RULE_VERSION_FIELDS = [
  "minimumFreeFireLevel",
  ...TEXT_FIELDS,
  ...RULE_LIST_FIELDS,
];

const ALLOWED_FIELDS = [
  "appName",
  ...BOOLEAN_FIELDS,
  ...Object.keys(NUMBER_RULES),
  ...TEXT_FIELDS,
  ...RULE_LIST_FIELDS,
  "referralRewardType",
  "defaultRulesLanguage",
];

const hasOwn = (object, field) => {
  return Object.prototype.hasOwnProperty.call(
    object,
    field
  );
};

const normalizeRuleList = (
  value,
  fieldName
) => {
  if (!Array.isArray(value)) {
    return {
      error: `${fieldName} must be an array`,
    };
  }

  if (
    value.length < 1 ||
    value.length > 50
  ) {
    return {
      error:
        `${fieldName} must contain between 1 and 50 rules`,
    };
  }

  const normalizedRules = [];
  const usedTitles = new Set();

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    const rule = value[index];

    if (
      !rule ||
      typeof rule !== "object" ||
      Array.isArray(rule)
    ) {
      return {
        error:
          `${fieldName}[${index}] must be an object`,
      };
    }

    if (
      typeof rule.title !== "string" ||
      !rule.title.trim()
    ) {
      return {
        error:
          `${fieldName}[${index}].title must be a non-empty string`,
      };
    }

    if (
      typeof rule.description !== "string" ||
      !rule.description.trim()
    ) {
      return {
        error:
          `${fieldName}[${index}].description must be a non-empty string`,
      };
    }

    const title = rule.title.trim();
    const description =
      rule.description.trim();

    if (title.length > 200) {
      return {
        error:
          `${fieldName}[${index}].title cannot exceed 200 characters`,
      };
    }

    if (description.length > 3000) {
      return {
        error:
          `${fieldName}[${index}].description cannot exceed 3000 characters`,
      };
    }

    const normalizedTitle =
      title.toLowerCase();

    if (usedTitles.has(normalizedTitle)) {
      return {
        error:
          `${fieldName} contains a duplicate rule title: ${title}`,
      };
    }

    usedTitles.add(normalizedTitle);

    normalizedRules.push({
      title,
      description,
    });
  }

  return {
    rules: normalizedRules,
  };
};

const serializeSettingValue = (
  value
) => {
  if (Array.isArray(value)) {
    return JSON.stringify(
      value.map((item) => ({
        title: item.title,
        description:
          item.description,
      }))
    );
  }

  return JSON.stringify(value);
};

const getOrCreateSettings = async () => {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = await Settings.create({});
  }

  return settings;
};

const getPublicSettings = (settings) => {
  return {
    appName: settings.appName,
    maintenanceMode: settings.maintenanceMode,
    registrationEnabled: settings.registrationEnabled,

    depositEnabled: settings.depositEnabled,
    minimumDeposit: settings.minimumDeposit,

    withdrawalEnabled: settings.withdrawalEnabled,
    minimumWithdrawal: settings.minimumWithdrawal,
    withdrawalFee: settings.withdrawalFee,
    withdrawalTimeHours: settings.withdrawalTimeHours,

    joinTournamentEnabled: settings.joinTournamentEnabled,
    defaultEntryFee: settings.defaultEntryFee,
    defaultPrizePool: settings.defaultPrizePool,
    perKillReward: settings.perKillReward,
    maxPlayers: settings.maxPlayers,

    rewardedAdsEnabled: settings.rewardedAdsEnabled,
    coinPerAd: settings.coinPerAd,
    dailyAdLimit: settings.dailyAdLimit,

    couponRedeemEnabled: settings.couponRedeemEnabled,
    coinRequiredForCoupon: settings.coinRequiredForCoupon,
    couponValue: settings.couponValue,
    couponStatus:
      settings.couponRedeemEnabled === true
        ? "available"
        : "upcoming",

    referralEnabled: settings.referralEnabled,
    referralRewardType: settings.referralRewardType,
    referralRewardAmount: settings.referralRewardAmount,
    referralMinimumDeposit: settings.referralMinimumDeposit,
    referralMinimumTournamentEntry:
      settings.referralMinimumTournamentEntry,
    referralRequiredCompletedMatches:
      settings.referralRequiredCompletedMatches,
    referralValidityDays: settings.referralValidityDays,

    tournamentRules: {
      acceptanceRequired:
        settings.rulesAcceptanceRequired,

      defaultLanguage:
        settings.defaultRulesLanguage,

      availableLanguages: [
        "english",
        "hindi",
      ],

      version:
        settings.rulesVersion,

      updatedAt:
        settings.rulesUpdatedAt,

      minimumFreeFireLevel:
        settings.minimumFreeFireLevel,

      endpoint:
        "/api/settings/rules",
    },

    activityBannerEnabled: settings.activityBannerEnabled,
  };
};

// =====================================
// FORMAT RULES BY SELECTED LANGUAGE
// =====================================
const getRulesByLanguage = (
  settings,
  language
) => {
  const isHindi =
    language === "hindi";

  const selectedRules = isHindi
    ? settings.fairPlayRulesHindi
    : settings.fairPlayRulesEnglish;

  return {
    selectedLanguage: language,

    defaultLanguage:
      settings.defaultRulesLanguage,

    availableLanguages: [
      "english",
      "hindi",
    ],

    rulesAcceptanceRequired:
      settings.rulesAcceptanceRequired,

    rulesVersion:
      settings.rulesVersion,

    rulesUpdatedAt:
      settings.rulesUpdatedAt,

    minimumFreeFireLevel:
      settings.minimumFreeFireLevel,

    disclaimer: isHindi
      ? settings.gameDisclaimerHindi
      : settings.gameDisclaimerEnglish,

    refundPolicy: isHindi
      ? settings.refundPolicyHindi
      : settings.refundPolicyEnglish,

    rules: selectedRules.map(
      (rule, index) => ({
        number: index + 1,
        title: rule.title,
        description:
          rule.description,
      })
    ),
  };
};

// =====================================
// GET TOURNAMENT RULES
// GET /api/settings/rules
// DEFAULT: ENGLISH
// =====================================
router.get(
  "/rules",
  async (req, res) => {
    try {
      const requestedLanguage =
        req.query.language
          ? String(
              req.query.language
            )
              .trim()
              .toLowerCase()
          : "english";

      if (
        ![
          "english",
          "hindi",
        ].includes(requestedLanguage)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "language must be english or hindi",
        });
      }

      const settings =
        await getOrCreateSettings();

      return res.status(200).json({
        success: true,
        message:
          "Tournament rules fetched successfully",
        data: getRulesByLanguage(
          settings,
          requestedLanguage
        ),
      });
    } catch (error) {
      console.error(
        "Get tournament rules error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch tournament rules",
        error: error.message,
      });
    }
  }
);

// =====================================
// GET PUBLIC APP SETTINGS
// GET /api/settings
// =====================================
router.get("/", async (req, res) => {
  try {
    const settings = await getOrCreateSettings();

    return res.status(200).json({
      success: true,
      message: "Settings fetched successfully",
      data: getPublicSettings(settings),
    });
  } catch (error) {
    console.error("Get settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
      error: error.message,
    });
  }
});

// =====================================
// GET FULL SETTINGS FOR ADMIN
// GET /api/settings/admin
// =====================================
router.get(
  "/admin",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const settings = await getOrCreateSettings();

      return res.status(200).json({
        success: true,
        message: "Admin settings fetched successfully",
        data: settings,
      });
    } catch (error) {
      console.error("Get admin settings error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch admin settings",
        error: error.message,
      });
    }
  }
);

// =====================================
// UPDATE SETTINGS
// PUT /api/settings/admin
// =====================================
router.put(
  "/admin",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const requestBody =
        req.body || {};

      const updateData = {};

      for (const field of ALLOWED_FIELDS) {
        if (hasOwn(requestBody, field)) {
          updateData[field] =
            requestBody[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid settings field provided",
        });
      }

      if (
        hasOwn(updateData, "appName")
      ) {
        if (
          typeof updateData.appName !== "string" ||
          !updateData.appName.trim()
        ) {
          return res.status(400).json({
            success: false,
            message: "appName must be a non-empty string",
          });
        }

        updateData.appName =
          updateData.appName.trim();
      }

      for (const field of BOOLEAN_FIELDS) {
        if (
          hasOwn(updateData, field) &&
          typeof updateData[field] !== "boolean"
        ) {
          return res.status(400).json({
            success: false,
            message: `${field} must be true or false`,
          });
        }
      }

      for (const [field, rule] of Object.entries(
        NUMBER_RULES
      )) {
        if (
          !hasOwn(updateData, field)
        ) {
          continue;
        }

        const value = updateData[field];

        if (
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < rule.minimum
        ) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a number greater than or equal to ${rule.minimum}`,
          });
        }

        if (rule.integer && !Number.isInteger(value)) {
          return res.status(400).json({
            success: false,
            message: `${field} must be an integer`,
          });
        }
      }

      if (
        hasOwn(
          updateData,
          "referralRewardType"
        ) &&
        !["coin", "wallet"].includes(
          updateData.referralRewardType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "referralRewardType must be coin or wallet",
        });
      }

      if (
        hasOwn(
          updateData,
          "defaultRulesLanguage"
        ) &&
        ![
          "english",
          "hindi",
        ].includes(
          updateData.defaultRulesLanguage
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "defaultRulesLanguage must be english or hindi",
        });
      }

      for (const field of TEXT_FIELDS) {
        if (!hasOwn(updateData, field)) {
          continue;
        }

        if (
          typeof updateData[field] !==
            "string" ||
          !updateData[field].trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              `${field} must be a non-empty string`,
          });
        }

        const cleanText =
          updateData[field].trim();

        if (cleanText.length > 5000) {
          return res.status(400).json({
            success: false,
            message:
              `${field} cannot exceed 5000 characters`,
          });
        }

        updateData[field] =
          cleanText;
      }

      for (
        const field of
        RULE_LIST_FIELDS
      ) {
        if (!hasOwn(updateData, field)) {
          continue;
        }

        const normalized =
          normalizeRuleList(
            updateData[field],
            field
          );

        if (normalized.error) {
          return res.status(400).json({
            success: false,
            message:
              normalized.error,
          });
        }

        updateData[field] =
          normalized.rules;
      }

      const settings =
        await getOrCreateSettings();

      const englishRules =
        hasOwn(
          updateData,
          "fairPlayRulesEnglish"
        )
          ? updateData.fairPlayRulesEnglish
          : settings.fairPlayRulesEnglish;

      const hindiRules =
        hasOwn(
          updateData,
          "fairPlayRulesHindi"
        )
          ? updateData.fairPlayRulesHindi
          : settings.fairPlayRulesHindi;

      if (
        englishRules.length !==
        hindiRules.length
      ) {
        return res.status(400).json({
          success: false,
          message:
            "English and Hindi rule lists must contain the same number of rules",
        });
      }

      const rulesChanged =
        RULE_VERSION_FIELDS.some(
          (field) =>
            hasOwn(
              updateData,
              field
            ) &&
            serializeSettingValue(
              updateData[field]
            ) !==
              serializeSettingValue(
                settings[field]
              )
        );

      if (rulesChanged) {
        updateData.rulesVersion =
          Math.max(
            Number(
              settings.rulesVersion || 1
            ),
            1
          ) + 1;

        updateData.rulesUpdatedAt =
          new Date();
      }

      Object.assign(settings, updateData);
      await settings.save();

      return res.status(200).json({
        success: true,
        message: "Settings updated successfully",
        data: settings,
      });
    } catch (error) {
      console.error("Update settings error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update settings",
        error: error.message,
      });
    }
  }
);

module.exports = router;