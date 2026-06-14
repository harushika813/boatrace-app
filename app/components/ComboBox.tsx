"use client";

import React, { useState, useRef, useEffect } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
};

export default function ComboBox({ label, value, onChange, options, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = query ? options.filter((o) => o.includes(query)) : options;

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-sm font-semibold text-slate-800 block mb-1">{label}</label>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-lg">
          {filtered.map((opt) => (
            <li
              key={opt}
              onClick={() => {
                onChange(opt);
                setQuery(opt);
                setOpen(false);
              }}
              className="px-3 py-2 text-sm hover:bg-emerald-50 cursor-pointer"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
