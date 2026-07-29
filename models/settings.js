const mongoose = require("mongoose");

const fairPlayRuleSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
        required: true,
        trim: true,
      },

      description: {
        type: String,
        required: true,
        trim: true,
      },
    },
    {
      _id: false,
      versionKey: false,
    }
  );

const defaultFairPlayRulesEnglish = [
  {
    title:
      "Hacker Found - Match Cancel and Refund",
    description:
      "If any player is confirmed as a hacker or cheater after Admin verification, the match will be cancelled and the Entry Fee will be refunded to all genuine players. The hacker will not receive a refund and may be permanently banned.",
  },
  {
    title:
      "Do Not Share Room ID or Password",
    description:
      "Sharing the Room ID or Password with anyone is strictly prohibited. If the responsible player is identified, the account may be suspended or permanently banned. Rewards or bonuses earned through the violation will be forfeited.",
  },
  {
    title:
      "Minimum Free Fire Level 50 Required",
    description:
      "The player's Free Fire account must meet the minimum level configured by the Admin. A player below the required level will be removed from the Room and the Entry Fee will not be refunded. Admin may request a profile screenshot for verification.",
  },
  {
    title:
      "Teaming or Collusion Is Prohibited",
    description:
      "Teaming, kill sharing, helping opponents or manipulating results is prohibited. The player will be disqualified, no reward will be given and the Entry Fee will not be refunded.",
  },
  {
    title:
      "Personal Network, Device or Game Glitch",
    description:
      "Admin is not responsible if a player leaves the match because of personal internet problems, high ping, device issues, battery problems, game crashes or individual glitches. No refund or rematch will normally be provided. A verified server-wide issue affecting multiple players may be reviewed separately.",
  },
  {
    title:
      "Use the Same Registered Free Fire UID",
    description:
      "The player must play using the same Free Fire UID and IGN used during app registration. A UID mismatch will result in removal or disqualification. No reward or Entry Fee refund will be provided.",
  },
  {
    title:
      "Hacks, Scripts and Third-Party Tools Are Prohibited",
    description:
      "Hacks, scripts, macros, injectors, modified game clients, unauthorized GFX tools and exploits are strictly prohibited. A confirmed violation will result in disqualification and account suspension or permanent ban.",
  },
  {
    title:
      "Join the Room on Time",
    description:
      "Players must join the Room within the announced time. Admin is not responsible if a player is late, selects the wrong slot or fails to join before the match starts. The Entry Fee may not be refunded.",
  },
  {
    title:
      "Fake or Duplicate Accounts Are Prohibited",
    description:
      "Fake information, duplicate accounts, impersonation, account sharing or using another player's identity is prohibited. The account may be suspended and rewards earned through fraud will be cancelled.",
  },
  {
    title:
      "Toxic Behaviour and Harassment Are Prohibited",
    description:
      "Abusive language, threats, harassment, hate speech and insulting players or Admins are prohibited. Violations may result in a warning, temporary suspension or permanent ban.",
  },
  {
    title:
      "Result and Fair-Play Verification",
    description:
      "Rank, kills, results and fair-play evidence will be verified before rewards are credited. Admin may request screenshots or screen recordings. Appeals must be submitted with valid evidence within the announced time.",
  },
  {
    title:
      "Cancellation and Refund Policy",
    description:
      "If the Admin cancels a tournament, eligible players will receive an Entry Fee refund. No refund will be provided if a player voluntarily leaves, violates rules, uses a mismatched UID or fails to join on time.",
  },
  {
    title:
      "Wallet Balance and Fraudulent Rewards",
    description:
      "Rewards or bonuses obtained through cheating or fraud will be cancelled. Legitimate deposited wallet balance will be handled according to the Terms and Conditions and applicable law.",
  },
  {
    title:
      "Independent Platform Disclaimer",
    description:
      "This is an independent community tournament platform. It is not affiliated with, sponsored, endorsed or administered by Garena or Free Fire. All trademarks belong to their respective owners.",
  },
  {
    title:
      "Rules Acceptance",
    description:
      "By selecting I Agree to Tournament Rules and Fair Play Policy, the player agrees to the current Rules Version. The acceptance date, time and Rules Version will be stored securely.",
  },
];

const defaultFairPlayRulesHindi = [
  {
    title:
      "Hacker Milne Par Match Cancel aur Refund",
    description:
      "Agar Admin verification me koi player hacker ya cheater sabit hota hai, to match cancel kiya jayega aur sabhi genuine players ki Entry Fee refund ki jayegi. Hacker ko refund nahi milega aur uska account permanently ban ho sakta hai.",
  },
  {
    title:
      "Room ID ya Password Share Mat Karo",
    description:
      "Room ID ya Password kisi ke saath share karna sakht mana hai. Agar share karne wale player ka pata chalta hai, to uska account suspend ya permanently ban kiya ja sakta hai. Violation se mila reward ya bonus cancel kar diya jayega.",
  },
  {
    title:
      "Minimum Free Fire Level 50 Zaroori Hai",
    description:
      "Player ka Free Fire account Admin ke set kiye gaye minimum level par hona chahiye. Required level se kam hone par player ko Room se kick kar diya jayega aur Entry Fee refund nahi hogi. Verification ke liye Admin profile screenshot maang sakta hai.",
  },
  {
    title:
      "Teaming ya Collusion Mana Hai",
    description:
      "Team-up karna, kill share karna, opponent ki help karna ya result manipulate karna mana hai. Player disqualify hoga, koi reward nahi milega aur Entry Fee refund nahi hogi.",
  },
  {
    title:
      "Personal Network, Device ya Game Glitch",
    description:
      "Personal internet problem, high ping, device issue, battery problem, game crash ya individual glitch ki wajah se player match se bahar ho jata hai to Admin zimmedar nahi hoga. Normally refund ya rematch nahi milega. Agar verified server-wide problem se bahut players affect hote hain, to Admin alag se review karega.",
  },
  {
    title:
      "Wahi Registered Free Fire UID Use Karo",
    description:
      "App registration ke samay diya gaya same Free Fire UID aur IGN use karke hi match khelna hoga. UID mismatch hone par player ko kick ya disqualify kiya jayega. Koi reward ya Entry Fee refund nahi milega.",
  },
  {
    title:
      "Hack, Script aur Third-Party Tool Mana Hai",
    description:
      "Hack, script, macro, injector, modified game client, unauthorized GFX tool ya exploit use karna sakht mana hai. Violation confirm hone par player disqualify hoga aur account suspend ya permanently ban ho sakta hai.",
  },
  {
    title:
      "Room Me Time Par Join Karo",
    description:
      "Player ko announced time ke andar Room me join karna hoga. Late aane, galat slot lene ya match start hone se pehle join na karne par Admin zimmedar nahi hoga. Entry Fee refund nahi ho sakti hai.",
  },
  {
    title:
      "Fake ya Duplicate Account Mana Hai",
    description:
      "Fake information, duplicate account, kisi aur ki identity use karna ya account sharing karna mana hai. Account suspend ho sakta hai aur fraud se mila reward cancel kar diya jayega.",
  },
  {
    title:
      "Toxic Behaviour aur Harassment Mana Hai",
    description:
      "Gali dena, dhamki dena, harassment, hate speech ya player aur Admin ko insult karna mana hai. Violation par warning, temporary suspension ya permanent ban ho sakta hai.",
  },
  {
    title:
      "Result aur Fair-Play Verification",
    description:
      "Reward dene se pehle rank, kills, result aur fair-play evidence verify kiya jayega. Admin screenshot ya screen recording maang sakta hai. Appeal announced time ke andar valid evidence ke saath submit karni hogi.",
  },
  {
    title:
      "Cancellation aur Refund Policy",
    description:
      "Agar Admin tournament cancel karta hai, to eligible players ki Entry Fee refund ki jayegi. Player khud match chhodta hai, rules todta hai, UID mismatch hota hai ya time par join nahi karta hai to refund nahi milega.",
  },
  {
    title:
      "Wallet Balance aur Fraudulent Rewards",
    description:
      "Cheating ya fraud se mila reward aur bonus cancel kar diya jayega. Legitimate deposited wallet balance ko Terms and Conditions aur applicable law ke hisab se handle kiya jayega.",
  },
  {
    title:
      "Independent Platform Disclaimer",
    description:
      "Yeh ek independent community tournament platform hai. Iska Garena ya Free Fire ke saath koi official affiliation, sponsorship, endorsement ya administration nahi hai. Sabhi trademarks unke respective owners ke hain.",
  },
  {
    title:
      "Rules Acceptance",
    description:
      "I Agree to Tournament Rules and Fair Play Policy select karne par player current Rules Version ko accept karta hai. Acceptance ki date, time aur Rules Version securely save ki jayegi.",
  },
];

const settingsSchema = new mongoose.Schema(
  {
    // ==========================
    // APP
    // ==========================
    appName: {
      type: String,
      default: "FF Tournament",
      trim: true,
    },

    maintenanceMode: {
      type: Boolean,
      default: false,
    },

    registrationEnabled: {
      type: Boolean,
      default: true,
    },

    // ==========================
    // DEPOSIT
    // ==========================
    depositEnabled: {
      type: Boolean,
      default: true,
    },

    minimumDeposit: {
      type: Number,
      default: 10,
      min: 0,
    },

    // ==========================
    // WITHDRAW
    // ==========================
    withdrawalEnabled: {
      type: Boolean,
      default: true,
    },

    minimumWithdrawal: {
      type: Number,
      default: 100,
      min: 0,
    },

    withdrawalFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    withdrawalTimeHours: {
      type: Number,
      default: 24,
      min: 0,
    },

    // ==========================
    // TOURNAMENT
    // ==========================
    joinTournamentEnabled: {
      type: Boolean,
      default: true,
    },

    defaultEntryFee: {
      type: Number,
      default: 50,
      min: 0,
    },

    defaultPrizePool: {
      type: Number,
      default: 1000,
      min: 0,
    },

    perKillReward: {
      type: Number,
      default: 5,
      min: 0,
    },

    maxPlayers: {
      type: Number,
      default: 48,
      min: 1,
    },

    // ==========================
    // REWARDED ADS / COIN
    // ==========================
    rewardedAdsEnabled: {
      type: Boolean,
      default: true,
    },

    coinPerAd: {
      type: Number,
      default: 1,
      min: 1,
    },

    dailyAdLimit: {
      type: Number,
      default: 10,
      min: 0,
    },

    // ==========================
    // COUPON / REDEEM
    // ==========================
    couponRedeemEnabled: {
      type: Boolean,
      default: false,
    },

    coinRequiredForCoupon: {
      type: Number,
      default: 300,
      min: 1,
    },

    couponValue: {
      type: Number,
      default: 50,
      min: 1,
    },

    // ==========================
    // REFERRAL
    // ==========================
    referralEnabled: {
      type: Boolean,
      default: true,
    },

    referralRewardType: {
      type: String,
      enum: ["coin", "wallet"],
      default: "coin",
    },

    referralRewardAmount: {
      type: Number,
      default: 10,
      min: 0,
    },

    referralMinimumDeposit: {
      type: Number,
      default: 50,
      min: 0,
    },

    referralMinimumTournamentEntry: {
      type: Number,
      default: 50,
      min: 0,
    },

    referralRequiredCompletedMatches: {
      type: Number,
      default: 1,
      min: 1,
    },

    referralValidityDays: {
      type: Number,
      default: 30,
      min: 1,
    },

    // ==========================
    // TOURNAMENT RULES
    // ==========================
    rulesAcceptanceRequired: {
      type: Boolean,
      default: true,
    },

    defaultRulesLanguage: {
      type: String,
      enum: ["english", "hindi"],
      default: "english",
    },

    rulesVersion: {
      type: Number,
      default: 1,
      min: 1,
    },

    rulesUpdatedAt: {
      type: Date,
      default: Date.now,
    },

    minimumFreeFireLevel: {
      type: Number,
      default: 50,
      min: 1,
    },

    gameDisclaimerEnglish: {
      type: String,
      trim: true,
      default:
        "This is an independent community tournament platform. It is not affiliated with, sponsored, endorsed or administered by Garena or Free Fire. Players participate at their own risk and must follow all tournament and fair-play rules.",
    },

    gameDisclaimerHindi: {
      type: String,
      trim: true,
      default:
        "Yeh ek independent community tournament platform hai. Iska Garena ya Free Fire ke saath koi official affiliation, sponsorship, endorsement ya administration nahi hai. Players apni zimmedari par participate karte hain aur sabhi tournament aur fair-play rules follow karna zaroori hai.",
    },

    refundPolicyEnglish: {
      type: String,
      trim: true,
      default:
        "If the Admin cancels a tournament, eligible players will receive an Entry Fee refund. No refund will be provided if a player voluntarily leaves, violates rules, uses a mismatched UID or fails to join on time. If a hacker is confirmed after Admin verification, the match will be cancelled and genuine players will receive an Entry Fee refund.",
    },

    refundPolicyHindi: {
      type: String,
      trim: true,
      default:
        "Agar Admin tournament cancel karta hai, to eligible players ki Entry Fee refund ki jayegi. Player khud match chhodta hai, rules todta hai, UID mismatch hota hai ya time par join nahi karta hai to refund nahi milega. Agar Admin verification me hacker confirm hota hai, to match cancel kiya jayega aur genuine players ki Entry Fee refund ki jayegi.",
    },

    fairPlayRulesEnglish: {
      type: [fairPlayRuleSchema],
      default: () =>
        defaultFairPlayRulesEnglish.map(
          (rule) => ({
            ...rule,
          })
        ),
    },

    fairPlayRulesHindi: {
      type: [fairPlayRuleSchema],
      default: () =>
        defaultFairPlayRulesHindi.map(
          (rule) => ({
            ...rule,
          })
        ),
    },

    // ==========================
    // BANNER
    // ==========================
    activityBannerEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports =
  mongoose.models.Settings ||
  mongoose.model("Settings", settingsSchema);