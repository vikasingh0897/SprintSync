const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide an employee name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an employee email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Please provide a role'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Please provide a department'],
      trim: true,
    },
    avatarColor: {
      type: String,
      default: '#6366f1',
    },
    initials: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Pending Confirmation', 'On Leave', 'Remote'],
      default: 'Pending Confirmation',
    },
    confirmationToken: {
      type: String,
      default: null,
    },
    confirmationExpires: {
      type: Date,
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    tasksCompleted: {
      type: Number,
      default: 0,
    },
    tasksInProgress: {
      type: Number,
      default: 0,
    },
    tasksPending: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: Number,
      default: 0,
    },
    avgScore: {
      type: Number,
      default: 85,
    },
    joinedDate: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
  },
  { timestamps: true }
);

// Auto generate initials before saving if not present
employeeSchema.pre('save', function (next) {
  if (this.name && !this.initials) {
    const parts = this.name.trim().split(' ');
    if (parts.length >= 2) {
      this.initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else {
      this.initials = this.name.substring(0, 2).toUpperCase();
    }
  }
  next();
});

module.exports = mongoose.model('Employee', employeeSchema);

