const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a task title'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },
    assignee: {
      type: String,
      default: null,
    },
    assigneeId: {
      type: String,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
    columnId: {
      type: String,
      required: [true, 'Column ID is required'],
      default: 'col-backlog',
    },
    category: {
      type: String,
      default: 'Feature',
    },
    dueDate: {
      type: String,
      default: null,
    },
    storyPoints: {
      type: Number,
      default: 3,
    },
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sprint',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);

