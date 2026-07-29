const User = require("./user");
const Settings = require("./settings");
const ReferralTransaction = require("./referralTransaction");
const CoinTransaction = require("./coinTransaction");

async function processReferralReward(referredUserId) {
  try {
    const referredUser = await User.findById(referredUserId);

    if (!referredUser) return;

    if (!referredUser.referredBy) return;

    if (referredUser.referralRewardGiven) return;

    const settings = await Settings.findOne();

    if (!settings || !settings.referralEnabled) return;

    if (
      Number(referredUser.totalDeposited || 0) <
      Number(settings.referralMinimumDeposit)
    ) {
      return;
    }

    if (
      Number(referredUser.totalEntryFeesPaid || 0) <
      Number(settings.referralMinimumTournamentEntry)
    ) {
      return;
    }

    const referrer = await User.findById(
      referredUser.referredBy
    );

    if (!referrer) return;

    let referralTransaction =
      await ReferralTransaction.findOne({
        referredUser: referredUser._id,
      });

    if (!referralTransaction) {
      referralTransaction =
        await ReferralTransaction.create({
          referrer: referrer._id,
          referredUser: referredUser._id,
          referralCode: referrer.referralCode,
          rewardType:
            settings.referralRewardType,
          rewardAmount:
            settings.referralRewardAmount,
        });
    }

    if (
      referralTransaction.status ===
      "rewarded"
    ) {
      return;
    }

    if (
      settings.referralRewardType ===
      "coin"
    ) {
      const before =
        Number(referrer.coinBalance || 0);

      referrer.coinBalance =
        before +
        Number(
          settings.referralRewardAmount
        );

      await CoinTransaction.create({
        user: referrer._id,
        type: "referral_reward",
        transactionType: "credit",
        amount:
          settings.referralRewardAmount,
        balanceBefore: before,
        balanceAfter:
          referrer.coinBalance,
        description:
          "Referral Reward",
      });
    } else {
      referrer.walletBalance =
        Number(
          referrer.walletBalance || 0
        ) +
        Number(
          settings.referralRewardAmount
        );
    }

    referredUser.referralRewardGiven =
      true;

    referralTransaction.status =
      "rewarded";

    referralTransaction.rewardedAt =
      new Date();

    referralTransaction.depositConditionMet =
      true;

    referralTransaction.tournamentEntryConditionMet =
      true;

    referralTransaction.completedMatchConditionMet =
      true;

    await referrer.save();
    await referredUser.save();
    await referralTransaction.save();
  } catch (err) {
    console.error(
      "Referral Reward Error:",
      err
    );
  }
}

module.exports = {
  processReferralReward,
};