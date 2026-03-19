import { useState, useMemo, useRef, useEffect } from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  onAddNew?: (searchText: string) => void;
  addNewLabel?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Digite para buscar...",
  searchPlaceholder = "Digite para buscar...",
  emptyText = "Nenhum resultado.",
  onAddNew,
  addNewLabel = "Cadastrar",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label || "",
    [options, value]
  );

  useEffect(() => {
    if (!open) {
      setSearch(selectedLabel);
    }
  }, [selectedLabel, open]);

  const filtered = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(lower));
  }, [options, search]);

  const hasExactMatch = useMemo(() => {
    if (!search.trim()) return true;
    const lower = search.toLowerCase().trim();
    return options.some((o) => o.label.toLowerCase() === lower);
  }, [options, search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch(selectedLabel);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [selectedLabel]);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        ref={inputRef}
        value={open ? search : selectedLabel}
        placeholder={placeholder}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setSearch(selectedLabel);
        }}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-60 overflow-y-auto">
          {filtered.length === 0 && !onAddNew && (
            <div className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</div>
          )}
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left",
                value === option.value && "bg-accent/50"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onValueChange(option.value);
                setSearch(option.label);
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  "h-4 w-4 shrink-0",
                  value === option.value ? "opacity-100" : "opacity-0"
                )}
              />
              {option.label}
            </button>
          ))}
          {onAddNew && !hasExactMatch && search.trim() && (
            <>
              {filtered.length > 0 && <div className="border-t border-border" />}
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left text-primary font-medium"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  onAddNew(search.trim());
                }}
              >
                <Plus className="h-4 w-4" />
                {addNewLabel} "{search.trim()}"
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
