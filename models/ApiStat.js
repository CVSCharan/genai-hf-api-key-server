const mongoose = require("mongoose");

const ApiStatSchema = new mongoose.Schema({
  route: {
    type: String,
    required: true,
    index: true,
  },
  method: {
    type: String,
    required: true,
    enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    index: true,
  },
  statusCode: {
    type: Number,
    required: true,
    index: true,
  },
  responseTime: {
    type: Number,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  userName: {
    type: String,
    index: true,
  },
  userIp: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Create compound index for common queries
ApiStatSchema.index({ route: 1, method: 1, timestamp: 1 });
ApiStatSchema.index({ userName: 1, timestamp: 1 });

module.exports = mongoose.model("ApiStat", ApiStatSchema);
