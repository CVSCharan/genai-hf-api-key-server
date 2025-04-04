const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    session: {
      type: Object,
      required: true,
    },
    expires: {
      type: Date,
      required: true,
      index: { expires: 0 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", SessionSchema);