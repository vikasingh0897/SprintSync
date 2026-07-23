'use client';
import { useState } from 'react';
import { Board } from '../../components/Board';

export default function BoardPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <main className="min-h-screen pb-20 bg-[#0c0e17]">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Kanban Board</h2>
            <p className="text-sm text-gray-400">Drag and drop tasks between columns. Click any task to edit.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">search</span>
              <input
                className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 transition-all w-52"
                placeholder="Search tasks..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter */}
            <button className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white transition-all">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              <span className="hidden sm:inline">Filter</span>
            </button>

            {/* New Column */}
            <button
              onClick={() => document.getElementById('new-column-btn')?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span className="hidden sm:inline">New Column</span>
            </button>
          </div>
        </div>
      </div>

      <Board searchQuery={searchQuery} />
    </main>
  );
}
