const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    picture: {
      type: String,
      default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
    },
    provider: {
      type: String,
      required: true,
      enum: ["local", "google", "github"],
      default: "local",
    },
    providerId: {
      type: String,
    },
    password: {
      type: String,
      // Required only for local authentication
      required: function () {
        return this.provider === "local";
      },
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: function () {
        // OAuth users are considered verified
        return this.provider !== "local";
      },
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    // Add array field for HF API keys
    hfApiKeys: [
      {
        name: String,
        key: String,
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
        lastUsed: Date,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
