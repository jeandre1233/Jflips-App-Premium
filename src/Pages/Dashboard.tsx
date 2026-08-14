import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft,
  History, 
  Users, 
  User, 
  CreditCard, 
  Clock, 
  Building2, 
  Pencil, 
  Trash2, 
  Calendar,
  X,
  GraduationCap,
  TrendingUp,
  PieChart
} from 'lucide-react';
import { 
  AppState, 
  AttendanceSession, 
  ClassType, 
  Gym, 
  ClassSchedule, 
  HistoryMonth,
  StaffProfile,
  Profile,
  getStudentSessionPrice 
} from '../../types';
import { SyncStatusBadge } from '../components/SyncStatusBadge';

// --- CONSTANTS ---
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const invoiceItemVariants = {
  hidden: { y: 15, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

// --- HELPERS ---
const getDayStatus = (day: number, month: number, year: number, state: any) => {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dow = new Date(year, month, day).getDay();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const logged = (state.sessions || []).filter((s: any) => s.date === dateStr);
  const scheduled = (state.schedules || []).filter((s: any) => s.day_of_week === dow);

  return { logged, scheduled };
};

const getVibrantColor = (bg: string) => {
  const map: Record<string, string> = {
    'bg-[#0073E6]': 'bg-[#0073E6] dark:bg-[#0073E6]',
    'bg-[#4CA5FF]': 'bg-[#4CA5FF] dark:bg-[#4CA5FF]',
    'bg-[#062963]': 'bg-[#062963] dark:bg-[#062963]',
    'bg-[#1e4da1]': 'bg-[#1e4da1] dark:bg-blue-400',
    'bg-indigo-500': 'bg-indigo-500 dark:bg-indigo-400',
    'bg-emerald-500': 'bg-emerald-500 dark:bg-emerald-400',
    'bg-teal-500': 'bg-teal-500 dark:bg-teal-400',
    'bg-[#E42624]': 'bg-[#E42624] dark:bg-[#E42624]',
    'bg-rose-500': 'bg-rose-500 dark:bg-rose-400',
    'bg-[#FF8A00]': 'bg-[#FF8A00] dark:bg-[#FF8A00]',
    'bg-amber-500': 'bg-amber-500 dark:bg-amber-400',
    'bg-yellow-400': 'bg-yellow-400 dark:bg-yellow-300',
    'bg-purple-500': 'bg-purple-500 dark:bg-purple-400',
    'bg-pink-500': 'bg-pink-500 dark:bg-pink-400',
    'bg-slate-700': 'bg-slate-700 dark:bg-slate-400',
  };
  return map[bg] || bg;
};

const StatusPips = ({ status, size = "w-1 h-1" }: { status: { logged: AttendanceSession[], scheduled: ClassSchedule[] }, size?: string }) => {
  const colorMap = new Map<string, boolean>();

  status.logged.forEach(ls => {
    const sched = status.scheduled.find(s => s.class_ids.includes(ls.classTypeId));
    const bg = sched?.color || 'bg-[#1e4da1]';
    colorMap.set(bg, true);
  });

  status.scheduled.forEach(s => {
    const allLogged = s.class_ids.every(cid => status.logged.some(ls => ls.classTypeId === cid));
    if (!allLogged) {
       const bg = s.color || 'bg-[#1e4da1]';
       if (!colorMap.has(bg)) {
           colorMap.set(bg, false);
       }
    }
  });

  if (colorMap.size === 0) return null;

  const pipList = Array.from(colorMap.entries()).map(([bg, isLogged]) => ({ bg: getVibrantColor(bg), isLogged }));

  return (
    <div className="flex gap-0.5 justify-center flex-row absolute bottom-1 left-0 right-0 px-1 overflow-hidden">
      {pipList.slice(0, 3).map((pip, idx) => (
         <div 
            key={`pip-${pip.bg}-${idx}`} 
            className={`${size} rounded-full ${pip.bg} ${pip.isLogged ? 'opacity-100 ring-1 ring-white/20' : 'opacity-40 dark:opacity-60'} shrink-0`} 
          />
      ))}
      {pipList.length > 3 && (
         <div className={`${size} rounded-full bg-slate-300 dark:bg-slate-600 shrink-0`} />
      )}
    </div>
  );
};

// --- CALENDAR VIEW ---
export const CalendarView = memo(({ sessions, classTypes, gyms, month, year, schedules, onQuickLog, staff, profile }: { 
  sessions: AttendanceSession[], 
  classTypes: ClassType[], 
  gyms: Gym[],
  month?: number,
  year?: number,
  schedules?: ClassSchedule[],
  onQuickLog?: (classIds: string[], date: string, coachId?: string, athleteIds?: string[]) => void,
  staff?: StaffProfile[],
  profile?: Profile
}) => {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(month !== undefined ? month : now.getMonth());
  const [viewYear, setViewYear] = useState(year !== undefined ? year : now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (month !== undefined) setViewMonth(month);
    if (year !== undefined) setViewYear(year);
  }, [month, year]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [viewMonth, viewYear, firstDayOfMonth, daysInMonth]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, AttendanceSession[]> = {};
    sessions.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [sessions]);

  const handleDateClick = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dow = new Date(viewYear, viewMonth, day).getDay();
    const hasLogs = !!sessionsByDate[dateStr];
    
    // Check if the selected date is in the past compared to today
    const checkDate = new Date(viewYear, viewMonth, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = checkDate < today;

    // We only care about schedules if the date is today or in the future
    const hasScheds = (schedules || []).some(s => s.day_of_week === dow);
    const hasUnloggedPastScheds = isPast && (schedules || []).some(s => {
      const dow2 = new Date(viewYear, viewMonth, day).getDay();
      return s.day_of_week === dow2 && !s.class_ids.every(cid => (sessionsByDate[dateStr] || []).some(ls => ls.classTypeId === cid));
    });
    
    if (hasLogs || hasScheds || hasUnloggedPastScheds) {
      setSelectedDate(selectedDate === dateStr ? null : dateStr);
    } else {
      setSelectedDate(null);
    }
  };

  const changeMonth = (delta: number) => {
    let newMonth = viewMonth + delta;
    let newYear = viewYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setViewMonth(newMonth);
    setViewYear(newYear);
    setSelectedDate(null);
  };

  const selectedSessions = selectedDate ? sessionsByDate[selectedDate] : [];
  const selectedSchedules = useMemo(() => {
    if (!selectedDate) return [];
    
    const [y, m, d] = selectedDate.split('-').map(Number);
    const checkDate = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return (schedules || []).filter(s => s.day_of_week === checkDate.getDay() && !s.class_ids.every(cid => (selectedSessions || []).some(ls => ls.classTypeId === cid)));
  }, [selectedDate, schedules, selectedSessions]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => changeMonth(-1)} aria-label="Previous Month" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-colors">
          <ChevronRight className="rotate-180" size={18} />
        </button>
        <h4 className="font-black text-[#1a1a1a] dark:text-slate-100 text-sm uppercase italic tracking-widest">
          {MONTHS[viewMonth]} {viewYear}
        </h4>
        <button onClick={() => changeMonth(1)} aria-label="Next Month" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-4 text-center mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={`day-hdr-${d}-${i}`} className="text-[10px] font-black text-slate-400 uppercase">{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center">
        {calendarDays.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const status = getDayStatus(day, viewMonth, viewYear, { sessions, classTypes, gyms, schedules } as any);
          const hasSessions = status.logged.length > 0 || status.scheduled.length > 0;
          const isSelected = selectedDate === dateStr;
          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          return (
            <div key={`${viewYear}-${viewMonth}-${day}-${idx}`} className="flex flex-col items-center justify-center relative h-12">
              <button
                onClick={() => handleDateClick(day)}
                className={`
                  w-8 h-8 flex items-center justify-center text-xs font-bold rounded-full transition-all
                  ${isToday ? 'ring-2 ring-slate-200 dark:ring-slate-700' : ''}
                  ${isSelected ? 'bg-[#1e4da1] !text-white shadow-lg scale-110' : 'text-slate-600 dark:text-slate-400'}
                `}
              >
                {day}
              </button>
              <StatusPips status={status} />
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedDate && ((selectedSessions && selectedSessions.length > 0) || (selectedSchedules && selectedSchedules.length > 0)) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-6"
          >
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
              <p className="text-[10px] font-black text-[#1e4da1] dark:text-blue-400 uppercase tracking-widest mb-2">
                Classes on {new Date(selectedDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
              </p>
              <div className="space-y-2">
                {(selectedSessions || []).map((session, idx) => {
                  const ct = classTypes.find(c => c.id === session.classTypeId);
                  const gym = gyms.find(g => g.id === session.classTypeId);
                  const sched = schedules?.find(s => s.class_ids.includes(session.classTypeId));
                  const loggedByCoach = staff?.find(s => s.id === session.coach_id);
                  const coachName = session.covering_coach_name || loggedByCoach?.name || profile?.name || 'Coach';
                  const isExternalGym = !!gym && gym.gym_type !== 'cheer';
                  const sessionTypeLabel = isExternalGym ? 'EXTERNAL GYM SESSION' : (gym?.gym_type === 'cheer' ? 'CHEER TEAM PRACTICE' : 'TUMBLING SESSION');
                  const entryCount = gym 
                    ? `${session.hours_coached || gym.default_hours || 1} Hours Coached` 
                    : `${session.studentIds?.length || 0} Athlete Entries`;

                  return (
                    <div key={session.id || `sel-sess-${idx}`} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                      <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${sched?.color || 'bg-[#1e4da1]'}`}></div>
                      <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-[#1e4da1] dark:text-blue-400 shrink-0 shadow-sm ml-2">
                        {gym ? <Building2 size={14} /> : ((session.studentIds?.length || 0) > 0 ? <Users size={14} /> : <User size={14} />)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-black text-[#1a1a1a] dark:text-slate-100 italic uppercase">
                            {(() => {
                              const baseName = ct?.name || gym?.name || 'Session';
                              return session.custom_event_name ? `${baseName} (${session.custom_event_name})` : baseName;
                            })()}
                          </p>
                          <span className={`text-[7px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${isExternalGym ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' : (gym?.gym_type === 'cheer' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300')}`}>
                            {sessionTypeLabel}
                          </span>
                        </div>
                        <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase flex flex-wrap items-center gap-1 mt-0.5">
                          {isExternalGym ? (
                            <span className="text-[#1e4da1] dark:text-blue-400 font-black">CLASS</span>
                          ) : (
                            <span className="text-[#10b981] font-black">LOGGED BY {coachName}</span>
                          )}
                          <span>•</span>
                          <span>{entryCount}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
                {selectedSchedules.map((schedule, idx) => {
                  const firstClass = classTypes.find(c => c.id === schedule.class_ids[0]) || gyms.find(g => g.id === schedule.class_ids[0]);
                  const [sy, sm, sd] = (selectedDate || '').split('-').map(Number);
                  const schedCheckDate = new Date(sy, sm - 1, sd);
                  const schedToday = new Date(); schedToday.setHours(0,0,0,0);
                  const isSchedulePast = schedCheckDate < schedToday;

                  return (
                     <div key={schedule.id || `sel-sched-${idx}`} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden opacity-70">
                        <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${schedule.color || 'bg-[#1e4da1]'}`}></div>
                        <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0 shadow-sm ml-2 text-slate-400">
                          <Clock size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-[#1a1a1a] dark:text-slate-100 italic uppercase">{schedule.label || firstClass?.name || 'Scheduled Class'}</p>
                          <p className={`text-[9px] font-bold uppercase ${isSchedulePast ? 'text-amber-500' : 'text-[#f59e0b]'}`}>
                            {isSchedulePast ? 'UNLOGGED' : 'UPCOMING'} • {schedule.time || 'TBD'}
                          </p>
                        </div>
                        {isSchedulePast && onQuickLog && (
                          <button
                            onClick={() => onQuickLog(schedule.class_ids, selectedDate!, schedule.coach_id, schedule.athlete_ids)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-[9px] font-black uppercase shadow-sm shrink-0 transition-colors"
                          >
                            Log Now
                          </button>
                        )}
                     </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// --- DASHBOARD VIEW ---
export const DashboardView = memo(({ state, onEditSession, onRemoveSession, onQuickLog, showAllLogs, onShowAllLogs }: {
  state: AppState,
  onEditSession: (s: AttendanceSession) => void,
  onRemoveSession: (id: string | string[]) => void,
  onQuickLog: (classId: string | string[], date: string, coachId?: string, athleteIds?: string[]) => void,
  showAllLogs: boolean,
  onShowAllLogs: (v: boolean) => void
}) => {
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [showRevenueBreakdown, setShowRevenueBreakdown] = useState(false);
  const now = new Date();
  const [breakdownMonth, setBreakdownMonth] = useState(now.getMonth());
  const [breakdownYear, setBreakdownYear] = useState(now.getFullYear());
  const isOwner = state.profile.role === 'owner';

  const coachSessions = useMemo(() => {
    if (isOwner) return state.sessions || [];
    const myId = state.profile?.id;
    return (state.sessions || []).filter(s => s.coach_id === myId);
  }, [state.sessions, isOwner, state.profile]);

  const revenue = useMemo(() => (state.sessions || []).reduce((acc, sess) => {
    const ct = (state.classTypes || []).find(c => c.id === sess.classTypeId);
    const gym = (state.gyms || []).find(g => g.id === sess.classTypeId);
    
    let price = ct ? ct.price : (gym ? gym.pay_amount : 0);
    if (gym && sess.custom_event_name) {
      const customPreset = gym.custom_event_presets?.find(p => {
        const name = p.includes(':') ? p.split(':')[0] : p;
        return name.toLowerCase() === sess.custom_event_name?.toLowerCase();
      });
      if (customPreset && customPreset.includes(':')) {
        const ratePart = customPreset.split(':')[1];
        const parsed = parseFloat(ratePart);
        if (!isNaN(parsed)) {
          price = parsed;
        }
      }
    }
    if (sess.is_competition && gym?.competition_rate) {
      price = gym.competition_rate;
    }

    if (gym) {
      return acc + (price * (sess.hours_coached || gym.default_hours || 1));
    }
    const className = ct ? ct.name : '';
    const sessionSum = (sess.studentIds || []).reduce((sum, sid) => {
      const student = (state.students || []).find(s => s.id === sid);
      return sum + getStudentSessionPrice(student, sess, price, className);
    }, 0);
    return acc + sessionSum;
  }, 0), [state.sessions, state.classTypes, state.gyms]);

  const monthlyData = useMemo(() => {
    const sessionsInMonth = (state.sessions || []).filter(sess => {
      if (!sess.date) return false;
      const d = new Date(sess.date);
      return d.getMonth() === breakdownMonth && d.getFullYear() === breakdownYear;
    });

    let tumblingRevenue = 0;
    let tumblingCount = 0;
    let tumblingStudentsCount = 0;

    let schoolsRevenue = 0;
    let schoolsCount = 0;
    let schoolsHours = 0;

    let gymsRevenue = 0;
    let gymsCount = 0;
    let gymsHours = 0;

    const itemizedList: {
      id: string;
      date: string;
      title: string;
      category: 'tumbling' | 'schools' | 'gyms';
      amount: number;
      subtext: string;
    }[] = [];

    sessionsInMonth.forEach(sess => {
      const ct = (state.classTypes || []).find(c => c.id === sess.classTypeId);
      const gym = (state.gyms || []).find(g => g.id === sess.classTypeId);

      let price = ct ? ct.price : (gym ? gym.pay_amount : 0);
      if (gym && sess.custom_event_name) {
        const customPreset = gym.custom_event_presets?.find(p => {
          const name = p.includes(':') ? p.split(':')[0] : p;
          return name.toLowerCase() === sess.custom_event_name?.toLowerCase();
        });
        if (customPreset && customPreset.includes(':')) {
          const ratePart = customPreset.split(':')[1];
          const parsed = parseFloat(ratePart);
          if (!isNaN(parsed)) {
            price = parsed;
          }
        }
      }
      if (sess.is_competition && gym?.competition_rate) {
        price = gym.competition_rate;
      }

      if (gym) {
        const hours = sess.hours_coached || gym.default_hours || 1;
        const amt = price * hours;
        const isSchool = gym.gym_type === 'cheer' || gym.name.toLowerCase().includes('school');

        if (isSchool) {
          schoolsRevenue += amt;
          schoolsCount += 1;
          schoolsHours += hours;
          itemizedList.push({
            id: sess.id,
            date: sess.date,
            title: gym.name + (sess.custom_event_name ? ` (${sess.custom_event_name})` : ''),
            category: 'schools',
            amount: amt,
            subtext: `${hours} HR${hours > 1 ? 'S' : ''} @ R${price}/hr`
          });
        } else {
          gymsRevenue += amt;
          gymsCount += 1;
          gymsHours += hours;
          itemizedList.push({
            id: sess.id,
            date: sess.date,
            title: gym.name + (sess.custom_event_name ? ` (${sess.custom_event_name})` : ''),
            category: 'gyms',
            amount: amt,
            subtext: `${hours} HR${hours > 1 ? 'S' : ''} @ R${price}/hr`
          });
        }
      } else {
        const className = ct ? ct.name : 'Tumbling Session';
        const studentCount = sess.studentIds?.length || 0;
        const sessionSum = (sess.studentIds || []).reduce((sum, sid) => {
          const student = (state.students || []).find(s => s.id === sid);
          return sum + getStudentSessionPrice(student, sess, price, className);
        }, 0);

        tumblingRevenue += sessionSum;
        tumblingCount += 1;
        tumblingStudentsCount += studentCount;

        itemizedList.push({
          id: sess.id,
          date: sess.date,
          title: className + (sess.custom_event_name ? ` (${sess.custom_event_name})` : ''),
          category: 'tumbling',
          amount: sessionSum,
          subtext: `${studentCount} Student${studentCount !== 1 ? 's' : ''}`
        });
      }
    });

    const total = tumblingRevenue + schoolsRevenue + gymsRevenue;

    return {
      total,
      tumblingRevenue,
      tumblingCount,
      tumblingStudentsCount,
      schoolsRevenue,
      schoolsCount,
      schoolsHours,
      gymsRevenue,
      gymsCount,
      gymsHours,
      itemizedList: itemizedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }, [breakdownMonth, breakdownYear, state.sessions, state.classTypes, state.gyms, state.students]);

  const matTime = useMemo(() => {
    return (coachSessions || []).reduce((acc, sess) => acc + (sess.hours_coached || 1), 0);
  }, [coachSessions]);

  const staffPay = useMemo(() => {
    return (coachSessions || []).reduce((acc, sess) => {
      const coach = (state.staff || []).find(s => s.id === sess.coach_id);
      const coachPayRate = isOwner ? (coach?.payRate || 0) : (state.profile.pay_rate || 0);
      return acc + (coachPayRate * (sess.hours_coached || 1));
    }, 0);
  }, [coachSessions, state.staff, isOwner, state.profile.pay_rate]);

  const recentLogs = useMemo(() => {
    const logs = [...(coachSessions || [])].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return createdB - createdA;
    });
    // DISPLAY ONLY — collapse the per-coach rows the app writes into one row per
    // real-world session, so a class covered by two coaches is listed once with
    // both names instead of appearing twice. Invoicing is untouched: it still
    // prices each coach's row separately.
    //
    // This previously collapsed competition sessions only, which is why ordinary
    // multi-coach classes showed up duplicated.
    const grouped: (AttendanceSession & { groupIds?: string[]; coachNames?: string[] })[] = [];
    const seen = new Map<string, number>();

    const keyFor = (log: AttendanceSession) =>
      log.session_group_id
        ? `sgid:${log.session_group_id}`
        : `${log.classTypeId}_${log.date}_${(log.custom_event_name || '').toLowerCase()}_${log.is_competition ? 1 : 0}`;

    const nameFor = (coachId?: string): string | null => {
      if (!coachId) return null;
      const staffMember = (state.staff || []).find((s: any) => s.id === coachId);
      if (staffMember?.name) return staffMember.name;
      if (coachId === state.profile.id) return state.profile.name || 'Me';
      return null;
    };

    logs.forEach(log => {
      const key = keyFor(log);
      const name = nameFor(log.coach_id);
      const index = seen.get(key);

      if (index !== undefined) {
        const row = grouped[index];
        if (!row.groupIds) row.groupIds = [row.id];
        row.groupIds.push(log.id);
        if (name && !(row.coachNames || []).includes(name)) {
          row.coachNames = [...(row.coachNames || []), name];
        }
      } else {
        seen.set(key, grouped.length);
        grouped.push({ ...log, groupIds: [log.id], coachNames: name ? [name] : [] });
      }
    });

    return grouped.slice(0, 10);
  }, [coachSessions, state.staff, state.profile]);

  /** Distinct real-world sessions, so "View All (N)" matches the collapsed list. */
  const totalLogCount = useMemo(() => new Set(
    (coachSessions || []).map(log =>
      log.session_group_id
        ? `sgid:${log.session_group_id}`
        : `${log.classTypeId}_${log.date}_${(log.custom_event_name || '').toLowerCase()}_${log.is_competition ? 1 : 0}`
    )
  ).size, [coachSessions]);

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const miniCalendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, []);

  const upcomingClasses = useMemo(() => {
    if (!state.schedules || state.schedules.length === 0) return [];
    const today = new Date();
    const results: { schedule: ClassSchedule; date: string; dayLabel: string; className: string }[] = [];
    for (let offset = 0; offset < 1; offset++) {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      const dow = d.getDay();
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : DAY_NAMES[dow];
      state.schedules.filter(s => s.day_of_week === dow).forEach(sched => {
        // Check if any of the classes in this schedule are already logged
        const allLogged = (sched.class_ids || []).every(cid => 
          (state.sessions || []).some(sess => sess.classTypeId === cid && sess.date === dateStr)
        );
        if (allLogged) return;

        const names = (sched.class_ids || []).map(cid => {
          const ct = (state.classTypes || []).find(c => c.id === cid);
          const gym = (state.gyms || []).find(g => g.id === cid);
          return ct?.name || gym?.name;
        }).filter(Boolean);

        const className = sched.label || names.join(' & ') || 'Class';
        results.push({ schedule: sched, date: dateStr, dayLabel, className });
      });
    }
    return results;
  }, [state.schedules, state.classTypes, state.gyms, state.sessions]);

  const currentMonthName = now.toLocaleString('default', { month: 'short' }).toUpperCase();

  return (
    <div className="space-y-6 mt-4 pb-20">
      <div className="flex justify-center">
        <SyncStatusBadge />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <motion.button 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          whileTap={{ scale: 0.95 }}
          onClick={isOwner ? () => setShowRevenueBreakdown(true) : () => onShowAllLogs(true)}
          className={`${isOwner ? 'bg-[#1e4da1] dark:bg-blue-900/40 cursor-pointer' : 'bg-emerald-600 dark:bg-emerald-900/40'} rounded-3xl p-5 text-white shadow-lg flex flex-col justify-between relative overflow-hidden text-left aspect-square lg:aspect-auto lg:h-44`}
        >
          <div className="z-10">
            <p className="text-white/60 text-[9px] font-black uppercase tracking-[0.15em] mb-1">
              {isOwner ? 'Cycle Revenue' : 'Mat Time'}
            </p>
            <h3 className="text-3xl font-black italic">{isOwner ? `R${revenue}` : `${matTime} HRS`}</h3>
          </div>
          
          <div className="z-10 border-t border-white/10 pt-3 w-full">
            <div className="flex flex-col">
              <p className="text-white/60 text-[8px] font-black uppercase tracking-widest">{isOwner ? 'Staff Pay' : 'My Earnings'}</p>
              <p className={`text-sm font-black italic ${isOwner ? 'text-emerald-400' : 'text-blue-200'}`}>R{staffPay}</p>
            </div>
          </div>
          {isOwner ? (
            <CreditCard className="absolute -bottom-3 -right-3 text-white/10 w-20 h-20 rotate-12" />
          ) : (
            <Clock className="absolute -bottom-3 -right-3 text-white/10 w-20 h-20 rotate-12" />
          )}
          <div className="absolute top-4 right-4 text-white/20">
            <History size={14} />
          </div>
        </motion.button>

        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
          className={`bg-white dark:bg-slate-800 rounded-3xl p-4 text-[#1a1a1a] dark:text-white shadow-lg flex flex-col relative overflow-hidden border transition-all duration-300 aspect-square lg:aspect-auto lg:h-44 ${isCalendarExpanded ? 'border-[#1e4da1] ring-2 ring-[#1e4da1]/20' : 'border-slate-100 dark:border-slate-700'}`}
        >
          <div className="flex justify-between items-center w-full mb-1">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.15em]">{currentMonthName}</p>
            <ChevronRight className={`transition-transform duration-300 text-slate-300 ${isCalendarExpanded ? 'rotate-90' : ''}`} size={14} />
          </div>
          
          <div className="grid grid-cols-7 gap-x-0.5 gap-y-1 w-full flex-1 items-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <span key={`${d}-${i}`} className="text-[6px] font-black text-slate-300 text-center">{d}</span>
            ))}
            {miniCalendarDays.map((day, idx) => {
              if (day === null) return <div key={`mini-empty-${idx}`} />;
              const status = getDayStatus(day, now.getMonth(), now.getFullYear(), state);
              const isToday = now.getDate() === day;
              return (
                <div key={`mini-${day}-${idx}`} className="flex flex-col items-center justify-center relative h-5 w-full">
                  <span className={`text-[7px] font-bold leading-none ${isToday ? 'text-[#1e4da1] dark:text-blue-400' : 'text-slate-500'}`}>
                    {day}
                  </span>
                  <StatusPips status={status} size="w-[2px] h-[2px]" />
                </div>
              );
            })}
          </div>
        </motion.button>
      </div>

      <AnimatePresence>
        {isCalendarExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <CalendarView 
               sessions={state.sessions || []} 
               classTypes={state.classTypes || []} 
               gyms={state.gyms || []} 
               schedules={state.schedules || []}
               onQuickLog={onQuickLog}
               staff={state.staff || []}
               profile={state.profile}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {upcomingClasses.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-end justify-between"><h4 className="font-black text-[#1a1a1a] dark:text-slate-100 text-xl uppercase italic">Upcoming</h4><span className="text-[#94a3b8] text-[9px] font-bold uppercase tracking-widest">{upcomingClasses.length} Classes</span></div>
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2.5">
            {upcomingClasses.map((item, idx) => {
              const bgClass = item.schedule.color || 'bg-blue-500';
              
              return (
              <motion.div key={`${item.schedule.id}_${item.date}_${idx}`} variants={invoiceItemVariants} className={`flex items-center gap-3 p-4 bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm relative overflow-hidden`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${bgClass}`}></div>
                <div className={`w-10 h-10 ${bgClass.replace('bg-', 'bg-opacity-20 bg-')} rounded-full flex items-center justify-center shrink-0 ml-1 opacity-80 backdrop-blur-sm`}>
                  <Calendar size={18} className={bgClass.replace('bg-', 'text-')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[#1a1a1a] dark:text-slate-100 italic uppercase">{item.className}</p>
                  <p className="text-[9px] font-bold text-[#94a3b8] uppercase">{item.dayLabel} • {item.schedule.time}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <motion.button 
                    whileTap={{ scale: 0.9 }} 
                    onClick={() => onQuickLog(item.schedule.class_ids, item.date, item.schedule.coach_id, item.schedule.athlete_ids)} 
                    className="px-3 py-2 bg-[#1e4da1] dark:bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-md"
                  >
                    Log
                  </motion.button>
                </div>
              </motion.div>
            )})}
          </motion.div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <h4 className="font-black text-[#1a1a1a] dark:text-slate-100 text-xl uppercase italic">Recent Logs</h4>
          <button 
            onClick={() => onShowAllLogs(true)}
            className="text-[#1e4da1] dark:text-blue-400 text-[9px] font-black uppercase tracking-widest hover:underline"
          >
            View All ({totalLogCount})
          </button>
        </div>
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
          {(!recentLogs || recentLogs.length === 0) ? <p className="text-center py-10 text-[#94a3b8] text-[9px] font-black uppercase">No Data</p> : recentLogs.map((session, idx) => {
            const ct = (state.classTypes || []).find(c => c.id === session.classTypeId);
            const gym = (state.gyms || []).find(g => g.id === session.classTypeId);
            return (
              <motion.div key={`recent-${session.id}-${idx}`} variants={invoiceItemVariants} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800/60 border border-slate-50 dark:border-slate-800 rounded-2xl shadow-sm">
                <div className="w-10 h-10 bg-[#eff6ff] dark:bg-blue-900/30 rounded-full flex items-center justify-center text-[#1e4da1] dark:text-blue-400 shrink-0">
                  {gym ? <Building2 size={18} /> : ((session.studentIds?.length || 0) > 1 ? <Users size={18} /> : <User size={18} />)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-black text-[#1a1a1a] dark:text-slate-100 italic uppercase break-words leading-tight">
                      {(() => {
                        const baseName = ct?.name || gym?.name || 'Session';
                        const hasCompInName = baseName.toLowerCase().includes('competition');
                        const mainName = `${baseName}${session.is_competition && !hasCompInName ? ' Competition' : ''}`;
                        return session.custom_event_name ? `${mainName} (${session.custom_event_name})` : mainName;
                      })()}
                    </p>
                    {session.is_competition && (
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0">Comp</span>
                    )}
                  </div>
                  <p className="text-[9px] font-bold text-[#94a3b8] uppercase mt-0.5">
                    {new Date(session.date).toLocaleDateString()}
                    {(session as any).coachNames?.length > 0 && (
                      <span className="text-[#1e4da1] dark:text-blue-400"> · {(session as any).coachNames.join(', ')}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {gym && <span className="text-[9px] font-black text-[#1e4da1] mr-1">{session.hours_coached || gym.default_hours || 1} HRS</span>}
                  <span className="text-[9px] font-black text-[#1e4da1] mr-1">{(session.studentIds?.length || 0)} IN</span>
                  <button onClick={() => onEditSession(session)} aria-label="Edit Session" className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-400 rounded-lg"><Pencil size={12} /></button>
                  <button onClick={() => { if (window.confirm("Delete?")) onRemoveSession(session.groupIds || session.id); }} aria-label="Delete Session" className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-400 rounded-lg"><Trash2 size={12} /></button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Revenue Breakdown Modal (Owner Only) */}
      <AnimatePresence>
        {showRevenueBreakdown && isOwner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-start justify-center p-3 sm:p-6 overflow-y-auto py-8"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative my-auto bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-5 max-h-[85vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white dark:bg-slate-900 z-20 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 pt-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-blue-50 dark:bg-blue-900/40 text-[#1e4da1] dark:text-blue-400 rounded-xl">
                      <PieChart size={20} />
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic">
                      Revenue Breakdown
                    </h3>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                    Monthly income across revenue streams
                  </p>
                </div>
                <button
                  onClick={() => setShowRevenueBreakdown(false)}
                  className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Month Selector */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    if (breakdownMonth === 0) {
                      setBreakdownMonth(11);
                      setBreakdownYear(prev => prev - 1);
                    } else {
                      setBreakdownMonth(prev => prev - 1);
                    }
                  }}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-600 dark:text-slate-300"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="text-center">
                  <span className="text-sm font-black uppercase text-slate-900 dark:text-white italic tracking-wide">
                    {MONTHS[breakdownMonth]} {breakdownYear}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (breakdownMonth === 11) {
                      setBreakdownMonth(0);
                      setBreakdownYear(prev => prev + 1);
                    } else {
                      setBreakdownMonth(prev => prev + 1);
                    }
                  }}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-600 dark:text-slate-300"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Total Monthly Card */}
              <div className="bg-gradient-to-br from-[#1e4da1] to-blue-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-blue-200 text-[9px] font-black uppercase tracking-widest">
                      Total Monthly Revenue
                    </p>
                    <h2 className="text-4xl font-black italic mt-1">R{monthlyData.total}</h2>
                  </div>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-wider">
                    {monthlyData.itemizedList.length} Sessions
                  </span>
                </div>
                <TrendingUp className="absolute -bottom-4 -right-4 text-white/10 w-28 h-28 rotate-12" />
              </div>

              {/* 3 Categories Grid */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Revenue Stream Breakdown
                </h4>

                {/* 1. Tumbling */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                        <User size={16} />
                      </div>
                      <div>
                        <h5 className="text-xs font-black uppercase italic text-slate-900 dark:text-white">
                          Tumbling
                        </h5>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">
                          Classes & Private Sessions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black italic text-[#1e4da1] dark:text-blue-400">
                        R{monthlyData.tumblingRevenue}
                      </span>
                      <p className="text-[8px] font-bold text-slate-400">
                        {monthlyData.total > 0 ? Math.round((monthlyData.tumblingRevenue / monthlyData.total) * 100) : 0}% of total
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#1e4da1] dark:bg-blue-500 h-full transition-all duration-500"
                      style={{ width: `${monthlyData.total > 0 ? (monthlyData.tumblingRevenue / monthlyData.total) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase pt-0.5">
                    <span>{monthlyData.tumblingCount} Sessions</span>
                    <span>{monthlyData.tumblingStudentsCount} Student Attendances</span>
                  </div>
                </div>

                {/* 2. Schools */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                        <GraduationCap size={16} />
                      </div>
                      <div>
                        <h5 className="text-xs font-black uppercase italic text-slate-900 dark:text-white">
                          Schools
                        </h5>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">
                          School Orgs & Cheer Teams
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black italic text-amber-600 dark:text-amber-400">
                        R{monthlyData.schoolsRevenue}
                      </span>
                      <p className="text-[8px] font-bold text-slate-400">
                        {monthlyData.total > 0 ? Math.round((monthlyData.schoolsRevenue / monthlyData.total) * 100) : 0}% of total
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-500"
                      style={{ width: `${monthlyData.total > 0 ? (monthlyData.schoolsRevenue / monthlyData.total) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase pt-0.5">
                    <span>{monthlyData.schoolsCount} Sessions</span>
                    <span>{monthlyData.schoolsHours} Hours Coached</span>
                  </div>
                </div>

                {/* 3. Gym Sessions */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <h5 className="text-xs font-black uppercase italic text-slate-900 dark:text-white">
                          Gym Sessions
                        </h5>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">
                          External Partner Gyms
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black italic text-emerald-600 dark:text-emerald-400">
                        R{monthlyData.gymsRevenue}
                      </span>
                      <p className="text-[8px] font-bold text-slate-400">
                        {monthlyData.total > 0 ? Math.round((monthlyData.gymsRevenue / monthlyData.total) * 100) : 0}% of total
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${monthlyData.total > 0 ? (monthlyData.gymsRevenue / monthlyData.total) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase pt-0.5">
                    <span>{monthlyData.gymsCount} Sessions</span>
                    <span>{monthlyData.gymsHours} Hours Coached</span>
                  </div>
                </div>
              </div>

              {/* Itemized Session Logs for the Month */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {MONTHS[breakdownMonth]} Session Logs ({monthlyData.itemizedList.length})
                </h4>
                {monthlyData.itemizedList.length === 0 ? (
                  <p className="text-center py-6 text-slate-400 text-[10px] font-bold uppercase">
                    No sessions logged for {MONTHS[breakdownMonth]} {breakdownYear}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {monthlyData.itemizedList.map((item, idx) => (
                      <div
                        key={`itemized-${item.id}-${idx}`}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${
                              item.category === 'tumbling'
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                : item.category === 'schools'
                                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {item.category}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate uppercase text-[10px]">
                              {item.title}
                            </p>
                            <p className="text-[8px] text-slate-400 font-medium">
                              {new Date(item.date).toLocaleDateString()} • {item.subtext}
                            </p>
                          </div>
                        </div>
                        <span className="font-black text-slate-900 dark:text-white text-xs italic shrink-0">
                          +R{item.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

DashboardView.displayName = 'DashboardView';
