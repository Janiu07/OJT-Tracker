const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  breakMinutes: {
    type: Number,
    default: 0
  },
  hours: {
    type: Number,
    required: true
  },
  // Flag: true = single DTR-style entry with break deducted, false = normal multi-entry
  isDTRMode: {
    type: Boolean,
    default: false
  },
  task: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['Coding', 'Data Entry / Encoding', 'Documentation', 'Debugging / Troubleshooting', 'Testing', 'Other'],
    default: 'Other'
  },
  notes: {
    type: String,
    default: ''
  },
  supervisorFeedback: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TimeEntry', timeEntrySchema);
