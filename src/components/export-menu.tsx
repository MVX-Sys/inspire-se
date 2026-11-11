import { useEffect, useRef, useState } from "react";
import { Download, FileDown, FileSpreadsheet, Sheet, ChevronDown } from "lucide-react";

type Format = "csv" | "xlsx" | "pdf";

export function ExportMenu({
  onExport,
  disabled,
  count,
  className = "",
}: {
  onExport: (format: Format) => void;
  disabled?: boolean;
  count?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (f: Format) => {
    setOpen(false);
    onExport(f);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-4 w-4" />
        Exportar
        {typeof count === "number" && count > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
            {count}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Baixar {typeof count === "number" ? `(${count})` : ""}
          </p>
          <MenuItem icon={<FileSpreadsheet className="h-4 w-4" />} label="CSV" hint=".csv" onClick={() => pick("csv")} />
          <MenuItem icon={<Sheet className="h-4 w-4" />} label="Excel" hint=".xlsx" onClick={() => pick("xlsx")} />
          <MenuItem icon={<FileDown className="h-4 w-4" />} label="PDF" hint=".pdf" onClick={() => pick("pdf")} />
          <p className="border-t border-border/60 px-3 pb-2 pt-2 text-[10px] leading-tight text-muted-foreground">
            Segue os filtros e a ordenação atuais.
          </p>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
    >
      <span className="grid h-7 w-7 place-items-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1 font-medium">{label}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{hint}</span>
    </button>
  );
}
