import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle2, User, Building2, Trophy } from 'lucide-react';
import { AppState, ClassSchedule, ClassType, Gym, Student } from '../../types';

interface QuickLogModalProps {
  state: AppState;
  classIds: string[];
  date: string;
  coachId?: string;
  athleteIds?: string[];
  onConfirm: (classTypeIdOrData: any, studentIds?: string[], date?: string, hours?: number, coachId?: string, isCompetition?: boolean) => void;
  onCancel: () => void;
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({ state, classIds, date, coachId, athleteIds, onConfirm, onCancel }) => {
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>(athleteIds || []);

  const { classOptions, entitiesToShow } = useMemo(() => {
    let options: Array<ClassType | Gym> = [];
    const allOptions = [
      ...(state.classTypes || []).map(ct => ({ ...ct, isGym: false })),
      ...(state.gyms || []).map(g => ({ ...g, isGym: true }))
    ];
    options = allOptions.filter(opt => classIds.includes(opt.id) || classIds.includes(opt.id));

    let entities: Student[] = [];
    if (classIds.length === 1) {
      const firstId = classIds[0];
      const gym = (state.gyms || []).find(g => g.id === firstId);
      if (gym) {
        if (gym.gym_type !== 'cheer') {
          entities = []; // Gyms/clubs do not have attendances
        } else {
          entities = state.students.filter(s => classIds.includes(s.associated_gym_id || ''));
        }
      } else {
        const ct = (state.classTypes || []).find(c => c.id === firstId);
        if (ct && ct.studentIds && ct.studentIds.length > 0) {
          entities = state.students.filter(s => ct.studentIds?.includes(s.id));
        } else {
          entities = state.students.filter(s => !s.is_gym_member);
          if (athleteIds && athleteIds.length > 0) {
             entities = entities.filter(s => athleteIds.includes(s.id));
          }
        }
      }
    }
    return { classOptions: options, entitiesToShow: entities };
  }, [state, classIds, athleteIds]);

  const isClubOrGym = classOptions.length > 0 && classOptions.every(o => 'isGym' in o && o.isGym && (o as Gym).gym_type !== 'cheer');

  useEffect(() => {
    // Auto-select if there is only 1 entity or if we are using strict initial athleteIds!
    if (entitiesToShow.length === 1 && selectedAthletes.length === 0) {
      setSelectedAthletes([entitiesToShow[0].id]);
    } else if (athleteIds && athleteIds.length > 0 && selectedAthletes.length === 0) {
      // Auto select the pre-assigned athletes for private sessions
      setSelectedAthletes(athleteIds);
    }
  }, [entitiesToShow, athleteIds]);

  const toggleEntity = (id: string) => {
    setSelectedAthletes(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleConfirm = () => {
    if (entitiesToShow.length > 0 && selectedAthletes.length === 0) {
      if (!window.confirm("No athletes are selected. Are you sure you want to log with no attendance?")) {
        return;
      }
    }

    if (classIds.length === 1) {
      const firstId = classIds[0];
      const gym = state.gyms.find(g => g.id === firstId);
      const ct = state.classTypes.find(c => c.id === firstId);
      const hours = gym?.default_hours || 1; // Default to 1 hour or gym.default_hours

      onConfirm(firstId, selectedAthletes, date, hours, coachId, false);
    } else {
      // It's a multi-class scheduled log. We need to create an array for sessionsToUpsert.
      const sessions = classIds.map(cid => {
         const gym = state.gyms.find(g => g.id === cid);
         return {
           id: '',
           classTypeId: cid,
           studentIds: selectedAthletes,
           date: date,
           hours: gym?.default_hours || 1,
           coachId: coachId,
           isCompetition: false
         };
      });
      onConfirm(sessions);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">Confirm Log</h2>
      
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
        <label className="text-[10px] font-black text-[#94a3b8] uppercase mb-2 block">
          {isClubOrGym ? 'Gym' : 'Classes'}
        </label>
        <div className="space-y-2">
          {classOptions.map((opt, idx) => (
             <div key={idx} className="flex items-center gap-2">
                {'isGym' in opt && opt.isGym ? ((opt as Gym).gym_type === 'cheer' ? <Trophy size={14} className="text-blue-500" /> : <Building2 size={14} className="text-blue-500" />) : <User size={14} className="text-indigo-500" />}
                <span className="font-black text-sm uppercase italic dark:text-slate-200">{opt.name}</span>
             </div>
          ))}
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase mt-4">Date: <span className="text-slate-600 dark:text-slate-300">{date}</span></p>
      </div>

      {!isClubOrGym && (
        <div className="space-y-3 max-h-[40vh] overflow-y-auto no-scrollbar pb-2">
          <div className="flex items-center justify-between px-1">
             <label className="text-[10px] font-black text-[#94a3b8] uppercase">Attendance</label>
             {entitiesToShow.length > 0 && (
                <button 
                  onClick={() => setSelectedAthletes(selectedAthletes.length === entitiesToShow.length ? [] : entitiesToShow.map(a => a.id))}
                  className="text-[9px] font-black uppercase text-blue-500"
                >
                  {selectedAthletes.length === entitiesToShow.length ? 'Clear All' : 'Select All'}
                </button>
             )}
          </div>
          
          {entitiesToShow.length === 0 ? (
            <div className="text-center p-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-[10px] text-slate-400 font-bold uppercase">No specific athletes required for this log.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entitiesToShow.map((entity, idx) => (
                <motion.button key={`qm-${entity.id}-${idx}`} whileTap={{ scale: 0.97 }} onClick={() => toggleEntity(entity.id)} className={`w-full p-4 rounded-xl border flex items-center gap-3.5 transition-colors ${selectedAthletes.includes(entity.id) ? 'bg-[#eff6ff] dark:bg-blue-900/30 border-[#1e4da1] text-[#1e4da1] shadow-md' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-[#1a1a1a] dark:text-slate-300'}`}>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedAthletes.includes(entity.id) ? 'bg-[#1e4da1] border-[#1e4da1]' : 'border-slate-200'}`}>
                    {selectedAthletes.includes(entity.id) && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <User size={14} className="opacity-50" />
                    <span className="font-black uppercase italic text-[13px]">{entity.name}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleConfirm} className="flex-[3] bg-[#1e4da1] dark:bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg">Confirm Log</motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onCancel} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center font-black uppercase"><X size={20} /></motion.button>
      </div>
    </div>
  );
};
