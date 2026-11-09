const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema(
  {
    columnId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BoardColumn', columnSchema);

