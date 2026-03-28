"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  defaultValue?: string;
  onSearch?: (q: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  defaultValue = "",
  onSearch,
  placeholder = "영화, 애니메이션 검색...",
  autoFocus = false,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(value);
    } else {
      router.push(`/browse?q=${encodeURIComponent(value)}`);
    }
  };

  const clear = () => {
    setValue("");
    onSearch?.("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b3b3b3] pointer-events-none"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#2d2d2d] border border-[#3d3d3d] text-white placeholder-[#6b7280]
          pl-9 pr-8 py-2.5 rounded-md text-sm outline-none
          focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914] transition-colors"
        data-focusable="true"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </form>
  );
}
