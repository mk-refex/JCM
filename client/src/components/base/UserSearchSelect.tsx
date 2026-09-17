import { useMemo, useRef, useState } from "react";
import type { Employee } from "@/types/domain";
import { cn } from "@/lib/utils";

interface UserSearchSelectProps {
  label: string;
  value: string | null;
  employees: Employee[];
  excludeId?: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}

export default function UserSearchSelect({
  label,
  value,
  employees,
  excludeId,
  onChange,
  placeholder = "Search by name or employee ID",
}: UserSearchSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => employees.find((e) => e.id === value) ?? null,
    [employees, value],
  );

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = employees.filter((e) => e.id !== excludeId);
    if (!q) return list.slice(0, 40);
    return list
      .filter((e) =>
        `${e.name} ${e.empId} ${e.email} ${e.designation}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 40);
  }, [employees, excludeId, query]);

  return (
    <div ref={rootRef} className="flex flex-col gap-1.5">
      <label className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
        {label}
      </label>
      {selected && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-background-200 bg-background-100 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground-900">
              {selected.name}
            </p>
            <p className="truncate text-xs text-foreground-500">
              {selected.empId}
              {selected.designation ? ` · ${selected.designation}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 cursor-pointer rounded-md px-2 py-1 font-label text-xs text-foreground-600 hover:bg-background-200"
          >
            Clear
          </button>
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => {
              if (!rootRef.current?.contains(document.activeElement)) {
                setOpen(false);
              }
            }, 120);
          }}
          placeholder={placeholder}
          className="h-10 w-full rounded-md border border-background-300 bg-background-50 px-3 font-label text-sm text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
        {open && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-background-200 bg-background-50 shadow-md scrollbar-slim">
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-foreground-500">No users found</li>
            ) : (
              options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(option.id);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full cursor-pointer flex-col items-start px-3 py-2 text-left hover:bg-background-100",
                      option.id === value && "bg-primary-50",
                    )}
                  >
                    <span className="text-sm font-medium text-foreground-900">
                      {option.name}
                    </span>
                    <span className="text-xs text-foreground-500">
                      {option.empId}
                      {option.designation ? ` · ${option.designation}` : ""}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
