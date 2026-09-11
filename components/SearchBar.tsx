'use client';

import { MagnifyingGlass } from '@phosphor-icons/react';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ placeholder = 'Search...', value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <MagnifyingGlass
        size={18}
        weight="bold"
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-transparent transition-shadow"
      />
    </div>
  );
}
