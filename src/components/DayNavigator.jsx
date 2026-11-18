import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { shiftDateKey, formatDateKeyDisplay, isTodayKey, getTodayDateKey } from '../api';

export default function DayNavigator({ selectedDate, onDateChange }) {
  const isToday = isTodayKey(selectedDate);

  return (
    <div className="day-navigator">
      <button 
        type="button"
        className="day-nav-btn"
        onClick={() => onDateChange(shiftDateKey(selectedDate, -1))}
        aria-label="Previous day"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="day-nav-current">
        <CalendarIcon size={16} className="day-nav-icon" />
        <span className="day-nav-label">{formatDateKeyDisplay(selectedDate)}</span>
      </div>

      <button 
        type="button"
        className="day-nav-btn"
        onClick={() => onDateChange(shiftDateKey(selectedDate, 1))}
        aria-label="Next day"
      >
        <ChevronRight size={18} />
      </button>

      {!isToday && (
        <button
          type="button"
          className="day-nav-today-btn"
          onClick={() => onDateChange(getTodayDateKey())}
        >
          Today
        </button>
      )}
    </div>
  );
}
