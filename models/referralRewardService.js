const mongoose = require("mongoose");

const User = require("./user");
const Settings = require("./settings");
const Tournament = require("./tournament");
const Transaction = require("./transaction");

const ReferralTransaction = require(
  "./referralTransaction"
);

const CoinTransaction = require(
  "./coinTransaction"
);

const roundMoney = (value) => {
  return (
    Math.round(
      (Number(value) +
        Number.EPSILON) *
        100
    ) / 100
  );
};

const createResult = (
  success,
  rewarded,
  reason,
  data = {}
) => {
  return {
    success,
    rewarded,
    reason,
    ...data,
  };
};

// ========================================
// PROCESS AUTOMATIC REFERRAL REWARD
// ========================================
async function processReferralReward(
  referredUserId
) {
  if (
    !mongoose.Types.ObjectId.isValid(
      referredUserId
    )
  ) {
    return createResult(
      false,
      false,
      "Invalid referred user ID"
    );
  }

  const session =
    await mongoose.startSession();

  let finalResult = createResult(
    true,
    false,
    "Referral reward was not processed"
  );

  try {
    await session.withTransaction(
      async () => {
        const referredUser =
          await User.findById(
            referredUserId
          ).session(session);

        if (!referredUser) {
          finalResult = createResult(
            false,
            false,
            "Referred user not found"
          );

          return;
        }

        if (!referredUser.referredBy) {
          finalResult = createResult(
            true,
            false,
            "User was not registered with a referral code"
          );

          return;
        }

        if (referredUser.isBlocked) {
          finalResult = createResult(
            true,
            false,
            "Blocked referred user is not eligible"
          );

          return;
        }

        if (
          !referredUser.email ||
          !referredUser.freeFireUid ||
          !referredUser.freeFireIgn
        ) {
          finalResult = createResult(
            true,
            false,
            "Referred user profile is incomplete"
          );

          return;
        }

        const settings =
          await Settings.findOne().session(
            session
          );

        if (!settings) {
          finalResult = createResult(
            false,
            false,
            "Application settings not found"
          );

          return;
        }

        if (
          !settings.referralEnabled
        ) {
          finalResult = createResult(
            true,
            false,
            "Referral system is disabled"
          );

          return;
        }

        let referralTransaction =
          await ReferralTransaction.findOne(
            {
              referredUser:
                referredUser._id,
            }
          ).session(session);

        const referrer =
          await User.findById(
            referredUser.referredBy
          ).session(session);

        if (!referrer) {
          finalResult = createResult(
            false,
            false,
            "Referrer not found"
          );

          return;
        }

        if (
          String(referrer._id) ===
          String(referredUser._id)
        ) {
          if (referralTransaction) {
            referralTransaction.status =
              "rejected";

            referralTransaction.rejectedAt =
              new Date();

            referralTransaction.rejectionReason =
              "Self-referral is not allowed";

            await referralTransaction.save(
              {
                session,
              }
            );
          }

          finalResult = createResult(
            false,
            false,
            "Self-referral is not allowed"
          );

          return;
        }

        if (referrer.isBlocked) {
          if (referralTransaction) {
            referralTransaction.status =
              "rejected";

            referralTransaction.rejectedAt =
              new Date();

            referralTransaction.rejectionReason =
              "Blocked referrer cannot receive referral rewards";

            await referralTransaction.save(
              {
                session,
              }
            );
          }

          finalResult = createResult(
            true,
            false,
            "Blocked referrer cannot receive referral rewards"
          );

          return;
        }

        const rewardType =
          settings.referralRewardType;

        const rewardAmount = Number(
          settings.referralRewardAmount
        );

        const minimumDeposit = Number(
          settings.referralMinimumDeposit ||
            0
        );

        const minimumTournamentEntry =
          Number(
            settings.referralMinimumTournamentEntry ||
              0
          );

        const requiredCompletedMatches =
          Math.max(
            Number(
              settings.referralRequiredCompletedMatches ||
                1
            ),
            1
          );

        const validityDays = Math.max(
          Number(
            settings.referralValidityDays ||
              30
          ),
          1
        );

        if (
          !["coin", "wallet"].includes(
            rewardType
          )
        ) {
          finalResult = createResult(
            false,
            false,
            "Invalid referral reward type"
          );

          return;
        }

        if (
          !Number.isFinite(
            rewardAmount
          ) ||
          rewardAmount < 1
        ) {
          finalResult = createResult(
            false,
            false,
            "Invalid referral reward amount"
          );

          return;
        }

        if (!referralTransaction) {
          const createdTransactions =
            await ReferralTransaction.create(
              [
                {
                  referrer:
                    referrer._id,

                  referredUser:
                    referredUser._id,

                  referralCode:
                    referrer.referralCode,

                  rewardType,
                  rewardAmount,
                  status: "pending",

                  minimumDepositRequired:
                    minimumDeposit,

                  minimumTournamentEntryRequired:
                    minimumTournamentEntry,

                  requiredCompletedMatches,

                  metadata: {
                    validityDays,

                    registeredAt:
                      referredUser.createdAt ||
                      new Date(),
                  },
                },
              ],
              {
                session,
              }
            );

          referralTransaction =
            createdTransactions[0];
        }

        if (
          referralTransaction.status ===
            "rewarded" ||
          referredUser.referralRewardGiven
        ) {
          finalResult = createResult(
            true,
            false,
            "Referral reward was already given",
            {
              referralTransactionId:
                referralTransaction._id,
            }
          );

          return;
        }

        if (
          referralTransaction.status ===
          "rejected"
        ) {
          finalResult = createResult(
            true,
            false,

            referralTransaction
              .rejectionReason ||
              "Referral was rejected"
          );

          return;
        }

        if (
          referralTransaction.status ===
          "expired"
        ) {
          finalResult = createResult(
            true,
            false,
            "Referral reward validity has expired"
          );

          return;
        }

        const referralStartDate =
          new Date(
            referralTransaction.createdAt ||
              referredUser.createdAt ||
              Date.now()
          );

        const referralExpiryDate =
          new Date(
            referralStartDate.getTime() +
              validityDays *
                24 *
                60 *
                60 *
                1000
          );

        if (
          Date.now() >
          referralExpiryDate.getTime()
        ) {
          referralTransaction.status =
            "expired";

          referralTransaction.expiredAt =
            new Date();

          referralTransaction.rejectionReason =
            "Referral conditions were not completed within the validity period";

          referralTransaction.metadata = {
            ...(referralTransaction.metadata ||
              {}),

            validityDays,

            expiresAt:
              referralExpiryDate,
          };

          await referralTransaction.save(
            {
              session,
            }
          );

          finalResult = createResult(
            true,
            false,
            "Referral reward validity has expired"
          );

          return;
        }

        const totalDeposited = Number(
          referredUser.totalDeposited ||
            0
        );

        const totalEntryFeesPaid =
          Number(
            referredUser.totalEntryFeesPaid ||
              0
          );

        const completedMatches =
          await Tournament.countDocuments(
            {
              status: "Completed",

              "joinedPlayers.userId":
                referredUser._id,
            }
          ).session(session);

        const depositConditionMet =
          totalDeposited >=
          minimumDeposit;

        const tournamentEntryConditionMet =
          totalEntryFeesPaid >=
          minimumTournamentEntry;

        const completedMatchConditionMet =
          completedMatches >=
          requiredCompletedMatches;

        referralTransaction.rewardType =
          rewardType;

        referralTransaction.rewardAmount =
          rewardAmount;

        referralTransaction.minimumDepositRequired =
          minimumDeposit;

        referralTransaction.minimumTournamentEntryRequired =
          minimumTournamentEntry;

        referralTransaction.requiredCompletedMatches =
          requiredCompletedMatches;

        referralTransaction.depositConditionMet =
          depositConditionMet;

        referralTransaction.tournamentEntryConditionMet =
          tournamentEntryConditionMet;

        referralTransaction.completedMatchConditionMet =
          completedMatchConditionMet;

        referralTransaction.metadata = {
          ...(referralTransaction.metadata ||
            {}),

          validityDays,

          expiresAt:
            referralExpiryDate,

          totalDeposited,

          totalEntryFeesPaid,

          completedMatches,

          lastCheckedAt:
            new Date(),
        };

        if (
          !depositConditionMet ||
          !tournamentEntryConditionMet ||
          !completedMatchConditionMet
        ) {
          referralTransaction.status =
            "pending";

          await referralTransaction.save(
            {
              session,
            }
          );

          finalResult = createResult(
            true,
            false,
            "Referral conditions are not completed",
            {
              conditions: {
                deposit: {
                  required:
                    minimumDeposit,

                  current:
                    totalDeposited,

                  met:
                    depositConditionMet,
                },

                tournamentEntry: {
                  required:
                    minimumTournamentEntry,

                  current:
                    totalEntryFeesPaid,

                  met:
                    tournamentEntryConditionMet,
                },

                completedMatches: {
                  required:
                    requiredCompletedMatches,

                  current:
                    completedMatches,

                  met:
                    completedMatchConditionMet,
                },
              },
            }
          );

          return;
        }

        referralTransaction.status =
          "eligible";

        await referralTransaction.save(
          {
            session,
          }
        );

        let balanceBefore = 0;
        let balanceAfter = 0;

        if (rewardType === "coin") {
          balanceBefore = Number(
            referrer.coinBalance || 0
          );

          balanceAfter =
            balanceBefore +
            rewardAmount;

          referrer.coinBalance =
            balanceAfter;

          await CoinTransaction.create(
            [
              {
                user: referrer._id,

                type:
                  "referral_reward",

                transactionType:
                  "credit",

                amount:
                  rewardAmount,

                balanceBefore,

                balanceAfter,

                description:
                  "Automatic referral reward",

                referenceId:
                  referralTransaction._id.toString(),

                metadata: {
                  referredUserId:
                    referredUser._id.toString(),

                  referralCode:
                    referralTransaction.referralCode,
                },
              },
            ],
            {
              session,
            }
          );
        } else {
          balanceBefore =
            roundMoney(
              referrer.walletBalance ||
                0
            );

          balanceAfter =
            roundMoney(
              balanceBefore +
                rewardAmount
            );

          referrer.walletBalance =
            balanceAfter;

          await Transaction.create(
            [
              {
                userId:
                  referrer._id,

                referralTransactionId:
                  referralTransaction._id,

                transactionType:
                  "referral_reward",

                amount:
                  rewardAmount,

                balanceBefore,

                balanceAfter,

                status: "success",

                description:
                  "Automatic referral reward",
              },
            ],
            {
              session,
            }
          );
        }

        referredUser.referralRewardGiven =
          true;

        referralTransaction.status =
          "rewarded";

        referralTransaction.rewardedAt =
          new Date();

        referralTransaction.rejectionReason =
          "";

        referralTransaction.metadata = {
          ...(referralTransaction.metadata ||
            {}),

          rewardType,

          rewardAmount,

          balanceBefore,

          balanceAfter,

          rewardedAutomatically:
            true,
        };

        await referrer.save({
          session,
        });

        await referredUser.save({
          session,
        });

        await referralTransaction.save(
          {
            session,
          }
        );

        finalResult = createResult(
          true,
          true,
          "Referral reward credited automatically",
          {
            rewardType,

            rewardAmount,

            balanceBefore,

            balanceAfter,

            referrerId:
              referrer._id,

            referredUserId:
              referredUser._id,

            referralTransactionId:
              referralTransaction._id,
          }
        );
      }
    );

    return finalResult;
  } catch (error) {
    console.error(
      "Referral Reward Error:",
      error
    );

    return createResult(
      false,
      false,

      error.message ||
        "Failed to process referral reward"
    );
  } finally {
    await session.endSession();
  }
}

module.exports = {
  processReferralReward,
};