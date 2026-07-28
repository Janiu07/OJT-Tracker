import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const PlanHours = ({ onClose }) => {
  const [selectedDates, setSelectedDates] = useState([]);
  const [hours, setHours] = useState(8);
  const [minutes, setMinutes] = useState(0);
  const [calendarKey, setCalendarKey] = useState(0);
  const [activeStartDate, setActiveStartDate] = useState(new Date());

  const hoursPerDay = hours + (minutes / 60);

  const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);

    return localDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDateClick = (date) => {
    const dateStr = formatDateKey(date);

    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter((d) => d !== dateStr));
      setCalendarKey((prev) => prev + 1);
    } else {
      setSelectedDates([...selectedDates, dateStr]);
      setCalendarKey((prev) => prev + 1);
    }
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = formatDateKey(date);
      if (selectedDates.includes(dateStr)) {
        return 'selected-plan-date';
      }
    }
    return null;
  };

  const totalPlannedHours = selectedDates.length * hoursPerDay;
  const totalHours = Math.floor(totalPlannedHours);
  const totalMinutes = Math.round((totalPlannedHours % 1) * 60);

  const clearAll = () => {
    setSelectedDates([]);
  };

return (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
    <div className="rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto my-2 sm:my-8" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="p-3 sm:p-6">
        <div className="flex justify-between items-center mb-3 sm:mb-4 sticky top-0 z-10 pb-2 border-b" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-lg sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Plan Future Hours</h3>
          <button
            onClick={onClose}
            className="text-3xl leading-none hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
          >
            ×
          </button>
        </div>

        <div className="mb-3 sm:mb-4 p-3 sm:p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <p className="text-xs sm:text-sm mb-1 sm:mb-2" style={{ color: 'var(--text-primary)' }}>
            📅 Click on dates to select them. Click again to deselect.
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Use this to plan how many hours you can accumulate in the future.
          </p>
        </div>

        {/* Hours per day input */}
        <div className="mb-3 sm:mb-4">
          <label className="block font-medium mb-2 text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
            Hours per day
          </label>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="block text-xs sm:text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Hours</label>
              <input
                type="number"
                value={hours === 0 ? '' : hours}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setHours(0);
                  } else {
                    const num = parseInt(val);
                    setHours(num >= 0 && num <= 24 ? num : hours);
                  }
                }}
                placeholder="0"
                min="0"
                max="24"
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Minutes</label>
              <input
                type="number"
                value={minutes === 0 ? '' : minutes}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setMinutes(0);
                  } else {
                    const num = parseInt(val);
                    setMinutes(num >= 0 && num < 60 ? num : minutes);
                  }
                }}
                placeholder="0"
                min="0"
                max="59"
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              />
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="mb-3 sm:mb-4">
            <Calendar
            key={calendarKey}
            onClickDay={handleDateClick}
            onActiveStartDateChange={({ activeStartDate }) => setActiveStartDate(activeStartDate)}
            activeStartDate={activeStartDate}
            tileClassName={tileClassName}
            className="border-none w-full text-xs sm:text-base"
            minDate={new Date()}
            />
        </div>

        {/* Selected dates summary */}
        <div className="rounded-lg p-3 sm:p-4 mb-3 sm:mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div>
              <div className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Selected Days</div>
              <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{selectedDates.length}</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Hours per Day</div>
              <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {hours}h {minutes}m
              </div>
            </div>
            <div>
              <div className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Total Planned</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {totalHours}h {totalMinutes}m
              </div>
            </div>
          </div>
        </div>

        {/* Selected dates list */}
        {selectedDates.length > 0 && (
          <div className="mb-3 sm:mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>Selected Dates:</h4>
              <button
                onClick={clearAll}
                className="text-xs sm:text-sm font-medium hover:opacity-70"
                style={{ color: '#dc2626' }}
              >
                Clear All
              </button>
            </div>
            <div className="max-h-32 sm:max-h-40 overflow-y-auto rounded-lg p-2 sm:p-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
              <div className="space-y-1">
                {selectedDates.sort().map((dateStr) => (
                  <div key={dateStr} className="flex justify-between items-center text-xs sm:text-sm">
                    <span style={{ color: 'var(--text-primary)' }}>
                      {formatDisplayDate(dateStr)}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {hours}h {minutes}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 sm:gap-3 sticky bottom-0 pt-2 border-t" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <button
            onClick={onClose}
            className="flex-1 font-semibold py-2 sm:py-3 rounded-lg transition duration-200 text-sm sm:text-base"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
);
};

export default PlanHours;