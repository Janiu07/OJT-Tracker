import React, { useState, useEffect } from 'react';

const TimeEntryModal = ({ entry, onClose, onSave, defaultDate, existingEntries = [] }) => {
  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    breakMinutes: 60,
    task: '',
    category: 'Other',
    notes: '',
    isDTRMode: false
  });
  const [overlapError, setOverlapError] = useState('');

  // Smart break time suggestion
  const getSuggestedBreak = () => {
    if (!formData.startTime || !formData.endTime) return null;
    const start = new Date(`2000-01-01 ${formData.startTime}`);
    const end = new Date(`2000-01-01 ${formData.endTime}`);
    const hours = (end - start) / (1000 * 60 * 60);
    
    if (hours >= 8) return 60;
    if (hours >= 6) return 30;
    return 0;
  };

  // Overlap check will be evaluated in an effect to keep dependencies clear

  // Live net hours preview
  const computeNetHours = () => {
    if (!formData.startTime || !formData.endTime) return null;
    const start = new Date(`2000-01-01 ${formData.startTime}`);
    const end = new Date(`2000-01-01 ${formData.endTime}`);
    const rawHours = (end - start) / (1000 * 60 * 60);
    const breakH = formData.isDTRMode ? (parseInt(formData.breakMinutes) || 0) / 60 : 0;
    const net = rawHours - breakH;
    if (net <= 0) return null;
    const h = Math.floor(net);
    const m = Math.round((net % 1) * 60);
    return `${h}h ${m}m`;
  };

  useEffect(() => {
    if (entry) {
      const entryDate = new Date(entry.date);
      const localDateStr = new Date(entryDate.getTime() - (entryDate.getTimezoneOffset() * 60000))
        .toISOString().split('T')[0];
      setFormData({
        date: localDateStr,
        startTime: entry.startTime,
        endTime: entry.endTime,
        breakMinutes: entry.breakMinutes ?? 60,
        task: entry.task,
        category: entry.category,
        notes: entry.notes || '',
        isDTRMode: entry.isDTRMode || false
      });
    } else {
      const dateToUse = defaultDate ? new Date(defaultDate) : new Date();
      const localDateStr = new Date(dateToUse.getTime() - (dateToUse.getTimezoneOffset() * 60000))
        .toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, date: localDateStr }));
    }
  }, [entry, defaultDate]);

  useEffect(() => {
    if (!formData.startTime || !formData.endTime || !formData.date) {
      setOverlapError('');
      return;
    }

    const newStart = new Date(`2000-01-01 ${formData.startTime}`);
    const newEnd = new Date(`2000-01-01 ${formData.endTime}`);

    const sameDay = existingEntries.filter(e => {
      const entryDate = new Date(e.date);
      const entryLocalDateStr = new Date(entryDate.getTime() - (entryDate.getTimezoneOffset() * 60000))
        .toISOString()
        .split('T')[0];
      return entryLocalDateStr === formData.date && e._id !== entry?._id;
    });

    let overlap = '';
    for (const existingEntry of sameDay) {
      const existingStart = new Date(`2000-01-01 ${existingEntry.startTime}`);
      const existingEnd = new Date(`2000-01-01 ${existingEntry.endTime}`);

      if (newStart < existingEnd && newEnd > existingStart) {
        overlap = `⚠️ Time overlaps with: "${existingEntry.task}" (${existingEntry.startTime}-${existingEntry.endTime})`;
        break;
      }
    }

    setOverlapError(overlap);
  }, [formData.startTime, formData.endTime, formData.date, existingEntries, entry]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTimeShortcut = (start, end) => {
    setFormData(prev => ({ ...prev, startTime: start, endTime: end }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (overlapError) {
      alert('Cannot save entry: ' + overlapError);
      return;
    }
    onSave(formData);
  };

  const netHours = computeNetHours();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
      >
        <div className="p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold mb-4 text-center" style={{ color: 'var(--text-primary)' }}>
            {entry ? 'Edit Time Entry' : 'Add Time Entry'}
          </h3>

          {/* DTR Mode Toggle */}
          <div className="mb-4 p-3 rounded-lg border-2 border-dashed" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: '#667eea' }}>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  name="isDTRMode"
                  checked={formData.isDTRMode}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${formData.isDTRMode ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-600'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${formData.isDTRMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  📋 DTR Mode {formData.isDTRMode ? '(ON)' : '(OFF)'}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {formData.isDTRMode
                    ? 'Single daily entry — break time deducted automatically'
                    : 'Normal mode — multiple entries allowed per day'}
                </div>
              </div>
            </label>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Time Shortcuts */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Time Shortcuts</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTimeShortcut('07:00', '18:00')}
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)'
                  }}
                  className="px-2 py-1.5 hover:opacity-80 rounded-lg text-xs font-medium transition"
                >
                  7:00 AM - 6:00 PM
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeShortcut('08:00', '17:00')}
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)'
                  }}
                  className="px-2 py-1.5 hover:opacity-80 rounded-lg text-xs font-medium transition"
                >
                  8:00 AM - 5:00 PM
                </button>
              </div>
            </div>

            {/* Start / End Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Time In</label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Time Out</label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Overlap Warning */}
            {overlapError && (
              <div className="p-3 border rounded-lg text-sm font-medium" style={{ backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#dc2626' }}>
                {overlapError}
              </div>
            )}

            {/* Break Time — only visible in DTR mode */}
            {formData.isDTRMode && (
              <div className="p-3 border rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: '#f97316' }}>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    ☕ Break Time (minutes)
                  </label>
                  {getSuggestedBreak() !== null && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, breakMinutes: getSuggestedBreak() }))}
                      className="text-xs px-2 py-1 rounded font-medium transition hover:opacity-80"
                      style={{ backgroundColor: '#fed7aa', color: '#92400e' }}
                    >
                      💡 Suggest: {getSuggestedBreak()}m
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    name="breakMinutes"
                    value={formData.breakMinutes}
                    onChange={handleChange}
                    min="0"
                    max="480"
                    placeholder="e.g. 60"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      borderColor: '#f97316'
                    }}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <div className="flex gap-1">
                    {[30, 60, 90].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, breakMinutes: mins }))}
                        className="px-2 py-1 text-xs rounded font-medium transition"
                        style={{
                          backgroundColor: parseInt(formData.breakMinutes) === mins ? '#fb923c' : 'var(--bg-tertiary)',
                          color: parseInt(formData.breakMinutes) === mins ? 'white' : 'var(--text-primary)'
                        }}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs mt-1" style={{ color: '#f97316' }}>This will be deducted from total hours.</p>
              </div>
            )}

            {/* Net Hours Preview */}
            {netHours && (
              <div className="flex items-center justify-between p-2 border rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: '#22c55e' }}>
                <span className="text-sm font-medium" style={{ color: '#22c55e' }}>✅ Net Hours:</span>
                <span className="text-lg font-bold" style={{ color: '#22c55e' }}>{netHours}</span>
              </div>
            )}

            {/* Task */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Task / Activity</label>
              <input
                type="text"
                name="task"
                value={formData.task}
                onChange={handleChange}
                placeholder="e.g., Developed login feature"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Coding">Coding</option>
                <option value="Data Entry / Encoding">Data Entry / Encoding</option>
                <option value="Documentation">Documentation</option>
                <option value="Debugging / Troubleshooting">Debugging / Troubleshooting</option>
                <option value="Testing">Testing</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Notes (Optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="2"
                placeholder="Additional details..."
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)'
                }}
                className="flex-1 font-semibold py-2 text-sm rounded-lg transition duration-200 hover:opacity-80"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 text-sm rounded-lg transition duration-200"
              >
                {entry ? 'Update' : 'Add'} Entry
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TimeEntryModal;
