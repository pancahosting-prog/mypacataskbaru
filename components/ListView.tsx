
import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { STATUS_COLORS, PRIORITY_COLORS } from '../constants';

interface ListViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onColorChange: (taskId: string, newColor: string) => void;
  onAddNew?: () => void;
}

const ListView: React.FC<ListViewProps> = ({ tasks, onTaskClick, onDeleteTask, onColorChange, onAddNew }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) || 
                           task.companyName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Search & Filter matching reference dropdown style */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input 
            type="text" 
            placeholder="Search list/task name"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none transition-all text-sm"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-400 outline-none"
        >
          <option value="All">All Status</option>
          {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <div 
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="group flex items-center gap-4 py-4 px-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0"
            >
              <div className="flex items-center justify-center">
                 <div className="w-5 h-5 rounded border border-slate-200 dark:border-slate-700 group-hover:border-indigo-400 transition-colors"></div>
              </div>
              
              <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
                       <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
                       {task.companyName}
                    </p>
                 </div>
                 <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{task.title}</h4>
              </div>

              <div className="flex items-center gap-6">
                 <div className="hidden md:flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase">Priority</span>
                    <span className={`text-[11px] font-medium ${task.priority === 'High' ? 'text-rose-500' : task.priority === 'Medium' ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}>
                       {task.priority || 'Set Priority'}
                    </span>
                 </div>
                 <button 
                  onClick={(e) => { e.stopPropagation(); if(onDeleteTask) onDeleteTask(task.id); }}
                  className="p-2 text-slate-200 dark:text-slate-700 hover:text-rose-500 transition-colors"
                 >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                 </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
            <p className="text-sm font-medium">No tasks found in this list.</p>
          </div>
        )}
      </div>

      <div className="pt-4 flex gap-4">
         <button 
           onClick={onAddNew}
           className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 hover:bg-indigo-700 active:scale-95 transition-all"
         >
           Finish
         </button>
         <button 
           onClick={onAddNew}
           className="px-4 py-2.5 text-slate-400 dark:text-slate-500 text-xs font-bold hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-2"
         >
           <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
           Add Task
         </button>
      </div>
    </div>
  );
};

export default ListView;
