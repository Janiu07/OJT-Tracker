import React, { useState } from 'react';

const BulkEntryModal = ({ onClose, onSave }) => {
  const [entries, setEntries] = useState([
    {
      date: new Date().toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '17:00',
      breakMinutes: 60,
      task: '',
      category: 'Coding',
      notes: '',
      isDTRMode: true
    }
  ]);
  const [error, setError] = useState('');

  const addEntryRow = () => {
    const lastEntry = entries[entries.length - 1];
    const lastDate = new Date(lastEntry.date);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + 1);

    setEntries([
      ...entries,
      {
        ...lastEntry,
        date: nextDate.toISOString().split('T')[0],
        task: '',
        notes: ''
      }
    ]);
  };

  const removeEntryRow = (idx) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== idx));
    }
  };

  const handleEntryChange = (idx, field, value) => {
    const newEntries = [...entries];
    newEntries[idx][field] = value;
    setEntries(newEntries);
  };

  const handleSubmit = async () => {
    setError('');
    
    // Validation
    for (const entry of entries) {
      if (!entry.date || !entry.startTime || !entry.endTime || !entry.task) {
        setError('Please fill in all required fields');
        return;
      }

      const start = new Date(`2000-01-01 ${entry.startTime}`);
      const end = new Date(`2000-01-01 ${entry.endTime}`);
      const hours = (end - start) / (1000 * 60 * 60);

      if (hours <= 0) {
        setError(`Row with "${entry.task}" has invalid times`);
        return;
      }
    }

    // Submit all
    try {
      for (const entry of entries) {
        await onSave(entry);
      }
      onClose();
    } catch (error) {
      setError('Error saving entries. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="rounded-xl shadow-2xl w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>📋 Add Multiple Days</h3>
            <button onClick={onClose} className="text-2xl leading-none hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>×</button>
          </div>

          {error && (
            <div className="mb-4 p-3 border rounded-lg text-sm" style={{ backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#dc2626' }}>{error}</div>
          )}

          <div className="overflow-x-auto mb-4">
            <table className="w-full min-w-[940px] text-sm" style={{ color: 'var(--text-primary)' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="border-b">
                  <th className="px-2 sm:px-3 py-2 text-left font-semibold whitespace-nowrap">Date</th>
                  <th className="px-2 sm:px-3 py-2 text-left font-semibold whitespace-nowrap">Time In</th>
                  <th className="px-2 sm:px-3 py-2 text-left font-semibold whitespace-nowrap">Time Out</th>
                  <th className="px-2 sm:px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[110px]">Break (min)</th>
                  <th className="px-2 sm:px-3 py-2 text-left font-semibold min-w-[220px]">Task</th>
                  <th className="px-2 sm:px-3 py-2 text-left font-semibold min-w-[190px]">Category</th>
                  <th className="px-2 sm:px-3 py-2 text-center font-semibold whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr key={idx} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-2 sm:px-3 py-2">
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => handleEntryChange(idx, 'date', e.target.value)}
                        className="w-full min-w-[120px] px-2 py-1 text-xs rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      />
                    </td>
                    <td className="px-2 sm:px-3 py-2">
                      <input
                        type="time"
                        value={entry.startTime}
                        onChange={(e) => handleEntryChange(idx, 'startTime', e.target.value)}
                        className="w-full min-w-[100px] px-2 py-1 text-xs rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      />
                    </td>
                    <td className="px-2 sm:px-3 py-2">
                      <input
                        type="time"
                        value={entry.endTime}
                        onChange={(e) => handleEntryChange(idx, 'endTime', e.target.value)}
                        className="w-full min-w-[100px] px-2 py-1 text-xs rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      />
                    </td>
                    <td className="px-2 sm:px-3 py-2">
                      <input
                        type="number"
                        value={entry.breakMinutes}
                        onChange={(e) => handleEntryChange(idx, 'breakMinutes', parseInt(e.target.value))}
                        min="0"
                        max="480"
                        className="w-full min-w-[90px] px-2 py-1 text-xs rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      />
                    </td>
                    <td className="px-2 sm:px-3 py-2">
                      <input
                        type="text"
                        value={entry.task}
                        onChange={(e) => handleEntryChange(idx, 'task', e.target.value)}
                        placeholder="Task..."
                        className="w-full min-w-[220px] px-2 py-1 text-xs rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      />
                    </td>
                    <td className="px-2 sm:px-3 py-2">
                      <select
                        value={entry.category}
                        onChange={(e) => handleEntryChange(idx, 'category', e.target.value)}
                        className="w-full min-w-[170px] px-2 py-1 pr-8 text-xs rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)', appearance: 'none', backgroundImage: 'linear-gradient(45deg, transparent 50%, var(--text-secondary) 50%), linear-gradient(135deg, var(--text-secondary) 50%, transparent 50%)', backgroundPosition: 'calc(100% - 14px) calc(50% - 2px), calc(100% - 8px) calc(50% - 2px)', backgroundSize: '6px 6px, 6px 6px', backgroundRepeat: 'no-repeat', paddingRight: '2rem' }}
                      >
                        <option value="Coding" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Coding</option>
                        <option value="Data Entry / Encoding" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Data Entry</option>
                        <option value="Documentation" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Documentation</option>
                        <option value="Debugging / Troubleshooting" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Debugging</option>
                        <option value="Testing" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Testing</option>
                        <option value="Other" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Other</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEntryRow(idx)}
                          className="font-bold hover:opacity-70"
                          style={{ color: '#ef4444' }}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={addEntryRow}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm"
            >
              + Add Another Day
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 font-semibold py-2 rounded-lg transition"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition"
            >
              {`Save All (${entries.length} days)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkEntryModal;
