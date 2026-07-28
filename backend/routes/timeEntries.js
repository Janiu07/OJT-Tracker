const express = require('express');
const router = express.Router();
const TimeEntry = require('../models/TimeEntry');
const auth = require('../middleware/auth');

// Helper: calculate hours from times and break
function calcHours(startTime, endTime, breakMinutes = 0) {
  const start = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);
  const rawHours = (end - start) / (1000 * 60 * 60);
  return rawHours - (breakMinutes / 60);
}

// Get all time entries for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const entries = await TimeEntry.find({ userId: req.user._id }).sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get summary statistics
router.get('/summary', auth, async (req, res) => {
  try {
    const entries = await TimeEntry.find({ userId: req.user._id });
    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    const approvedHours = entries
      .filter(e => e.status === 'approved')
      .reduce((sum, entry) => sum + entry.hours, 0);

    const byCategory = entries.reduce((acc, entry) => {
      acc[entry.category] = (acc[entry.category] || 0) + entry.hours;
      return acc;
    }, {});

    const byMonth = entries.reduce((acc, entry) => {
      const month = new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      acc[month] = (acc[month] || 0) + entry.hours;
      return acc;
    }, {});

    res.json({
      totalHours,
      approvedHours,
      pendingHours: totalHours - approvedHours,
      requiredHours: req.user.requiredHours,
      progress: (approvedHours / req.user.requiredHours * 100).toFixed(2),
      byCategory,
      byMonth,
      totalEntries: entries.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export entries as JSON (for PDF/CSV generation on frontend)
router.get('/export', auth, async (req, res) => {
  try {
    const { startDate, endDate, month } = req.query;
    let query = { userId: req.user._id };

    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (month) {
      const [year, m] = month.split('-');
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }

    const entries = await TimeEntry.find(query).sort({ date: 1 });
    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

    res.json({
      user: { name: req.user.name, requiredHours: req.user.requiredHours },
      entries,
      totalHours,
      exportDate: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new time entry
router.post('/', auth, async (req, res) => {
  try {
    const { date, startTime, endTime, task, category, notes, breakMinutes, isDTRMode } = req.body;

    const breakMins = isDTRMode ? (parseInt(breakMinutes) || 0) : 0;
    const hours = calcHours(startTime, endTime, breakMins);

    if (hours <= 0) {
      return res.status(400).json({ message: 'Net hours must be greater than 0. Check your break time.' });
    }

    // DTR mode: prevent duplicate on same date
    if (isDTRMode) {
      const entryDate = new Date(date);
      const dayStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const existing = await TimeEntry.findOne({
        userId: req.user._id,
        isDTRMode: true,
        date: { $gte: dayStart, $lt: dayEnd }
      });

      if (existing) {
        return res.status(400).json({ message: 'A DTR entry already exists for this date. Edit the existing one instead.' });
      }
    }

    const entry = new TimeEntry({
      userId: req.user._id,
      date,
      startTime,
      endTime,
      breakMinutes: breakMins,
      hours: parseFloat(hours.toFixed(2)),
      task,
      category,
      notes,
      isDTRMode: isDTRMode || false,
      status: 'approved'
    });

    await entry.save();
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update time entry
router.put('/:id', auth, async (req, res) => {
  try {
    const { date, startTime, endTime, task, category, notes, breakMinutes, isDTRMode } = req.body;

    let entry = await TimeEntry.findOne({ _id: req.params.id, userId: req.user._id });
    if (!entry) return res.status(404).json({ message: 'Time entry not found' });

    const breakMins = isDTRMode ? (parseInt(breakMinutes) || 0) : 0;

    if (startTime && endTime) {
      const hours = calcHours(startTime, endTime, breakMins);
      if (hours <= 0) {
        return res.status(400).json({ message: 'Net hours must be greater than 0. Check your break time.' });
      }
      entry.hours = parseFloat(hours.toFixed(2));
    }

    entry.date = date || entry.date;
    entry.startTime = startTime || entry.startTime;
    entry.endTime = endTime || entry.endTime;
    entry.breakMinutes = breakMins;
    entry.task = task || entry.task;
    entry.category = category || entry.category;
    entry.notes = notes !== undefined ? notes : entry.notes;
    entry.isDTRMode = isDTRMode !== undefined ? isDTRMode : entry.isDTRMode;

    await entry.save();
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete time entry
router.delete('/:id', auth, async (req, res) => {
  try {
    const entry = await TimeEntry.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!entry) return res.status(404).json({ message: 'Time entry not found' });
    res.json({ message: 'Time entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
