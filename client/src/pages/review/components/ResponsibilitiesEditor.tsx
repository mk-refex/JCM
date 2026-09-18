import Button from "@/components/base/Button";
import { SectionCard } from "@/components/base/Card";
import { cn, uid } from "@/lib/utils";
import type { Responsibility } from "@/types/domain";

const MAX_ROWS = 20;
const STEP = 5;

interface ResponsibilitiesEditorProps {
  rows: Responsibility[];
  onChange: (rows: Responsibility[]) => void;
  readOnly?: boolean;
}

function clamp(val: number) {
  return Math.max(0, Math.min(100, Math.round(val)));
}

function parsePercent(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (Number.isNaN(value)) return null;
  return clamp(value);
}

// Small stepper: − VALUE + badge
function PercentStepper({
  value,
  onChange,
  complete = false,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  complete?: boolean;
}) {
  const current = value ?? 0;

  const decrement = () => {
    const next = current - STEP;
    onChange(next <= 0 ? null : clamp(next));
  };

  const increment = () => {
    onChange(clamp(current + STEP));
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={decrement}
        disabled={current === 0}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border font-label text-sm font-bold transition-colors cursor-pointer",
          "border-background-300 bg-background-50 text-foreground-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
        aria-label="Decrease"
      >
        <i className="ri-subtract-line text-xs" />
      </button>

      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          value={value ?? ""}
          onChange={(e) => onChange(parsePercent(e.target.value))}
          placeholder="0"
          className={cn(
            "h-9 w-[72px] rounded-lg border px-2 text-center font-label text-sm font-semibold transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400",
            complete || value === 100
              ? "border-secondary-300 bg-secondary-50 text-secondary-800"
              : value !== null && value > 0
                ? "border-background-300 bg-background-50 text-foreground-800"
                : "border-background-300 bg-background-50 text-foreground-600",
          )}
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center font-label text-xs text-foreground-500">
          %
        </span>
      </div>

      <button
        type="button"
        onClick={increment}
        disabled={current >= 100}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border font-label text-sm font-bold transition-colors cursor-pointer",
          "border-background-300 bg-background-50 text-foreground-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
        aria-label="Increase"
      >
        <i className="ri-add-line text-xs" />
      </button>
    </div>
  );
}

export default function ResponsibilitiesEditor({
  rows,
  onChange,
  readOnly = false,
}: ResponsibilitiesEditorProps) {
  const totalPercent = rows.reduce((sum, r) => sum + (r.percent ?? 0), 0);
  const remaining = 100 - totalPercent;
  const balanced = remaining === 0;

  const updateRow = (id: string, patch: Partial<Responsibility>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    if (rows.length >= MAX_ROWS) return;
    onChange([...rows, { id: uid("resp"), text: "", percent: null }]);
  };

  const removeRow = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  return (
    <SectionCard
      title="Section B — Key job responsibilities"
      description="List the tasks and deliverables you actually perform. Use the stepper to set the approximate % of your time each takes. The total must equal 100%."
      icon="ri-list-check-2"
      compact
      action={
        <div className="flex flex-nowrap items-center gap-2">
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-label text-sm font-bold",
              balanced
                ? "border-secondary-200 bg-secondary-100 text-secondary-800"
                : totalPercent > 100
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-amber-200 bg-amber-50 text-amber-800",
            )}
          >
            <i
              className={cn(
                "text-sm",
                balanced
                  ? "ri-checkbox-circle-fill"
                  : totalPercent > 100
                    ? "ri-error-warning-fill"
                    : "ri-time-line",
              )}
            />
            {totalPercent}% / 100%
          </span>
          {!readOnly && (
            <Button
              variant="primary"
              size="sm"
              icon="ri-add-line"
              onClick={addRow}
              disabled={rows.length >= MAX_ROWS}
              className="shrink-0"
            >
              Add row
            </Button>
          )}
        </div>
      }
      bodyClassName="p-0"
    >
      {/* Progress bar */}
      <div className="px-3 pt-2.5 pb-1.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-label text-xs text-foreground-600">
            {balanced
              ? "Time allocation complete"
              : remaining > 0
                ? `${remaining}% still to allocate`
                : `${Math.abs(remaining)}% over — reduce to stay within 100%`}
          </span>
          <span
            className={cn(
              "font-label text-xs font-bold",
              balanced
                ? "text-secondary-700"
                : totalPercent > 100
                  ? "text-red-600"
                  : "text-amber-700",
            )}
          >
            {totalPercent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-background-200">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              balanced
                ? "bg-secondary-500"
                : totalPercent > 100
                  ? "bg-red-500"
                  : "bg-amber-500",
            )}
            style={{ width: `${Math.min(totalPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 p-3 md:hidden">
        {rows.map((row, index) => {
          const hasText = row.text.trim().length > 0;
          const hasPercent = row.percent !== null && row.percent > 0;
          const rowComplete = hasText && hasPercent;

          return (
            <div
              key={row.id}
              className={cn(
                "rounded-lg border p-3",
                rowComplete
                  ? "border-background-200 bg-background-50"
                  : "border-background-200 bg-background-50/70",
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full font-label text-xs font-semibold",
                    rowComplete
                      ? "bg-primary-100 text-primary-700"
                      : "bg-background-200 text-foreground-500",
                  )}
                >
                  {index + 1}
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    title="Remove"
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-background-200 text-foreground-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <i className="ri-delete-bin-6-line text-sm" />
                  </button>
                )}
              </div>

              <label className="mb-1 block font-label text-[11px] font-semibold uppercase tracking-wide text-foreground-500">
                Key job responsibility
              </label>
              {readOnly ? (
                <p className="text-sm text-foreground-800">{row.text || "—"}</p>
              ) : (
                <textarea
                  value={row.text}
                  onChange={(e) => updateRow(row.id, { text: e.target.value })}
                  rows={3}
                  placeholder="Describe the responsibility, task or deliverable you own…"
                  className={cn(
                    "w-full resize-y rounded-lg border px-3 py-2.5 font-label text-sm text-foreground-900 placeholder:text-foreground-400",
                    "focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400",
                    hasText
                      ? "border-background-200 bg-white"
                      : "border-background-300 bg-background-50",
                  )}
                />
              )}

              <div className="mt-2.5 flex items-center justify-between gap-3">
                <span className="font-label text-[11px] font-semibold uppercase tracking-wide text-foreground-500">
                  % of time
                </span>
                {readOnly ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-1 font-label text-xs font-bold",
                      row.percent
                        ? "border-primary-200 bg-primary-50 text-primary-800"
                        : "border-background-200 bg-background-100 text-foreground-500",
                    )}
                  >
                    {row.percent === null ? "—" : `${row.percent}%`}
                  </span>
                ) : (
                  <PercentStepper
                    value={row.percent}
                    complete={balanced}
                    onChange={(v) => updateRow(row.id, { percent: v })}
                  />
                )}
              </div>
            </div>
          );
        })}

        <div className="flex flex-nowrap items-center justify-between gap-2 rounded-lg border border-background-200 bg-background-100 px-3 py-2.5">
          <div className="min-w-0">
            <span className="font-label text-xs font-semibold text-foreground-800">
              Total time allocation
            </span>
            <span
              className={cn(
                "ml-2 font-label text-sm font-bold",
                balanced
                  ? "text-secondary-700"
                  : totalPercent > 100
                    ? "text-red-600"
                    : "text-amber-700",
              )}
            >
              {totalPercent}%
              {balanced
                ? " · balanced"
                : remaining > 0
                  ? ` · ${remaining}% left`
                  : ` · ${Math.abs(remaining)}% over`}
            </span>
          </div>
          {!readOnly && (
            <Button
              variant="primary"
              size="sm"
              icon="ri-add-line"
              onClick={addRow}
              disabled={rows.length >= MAX_ROWS}
              className="shrink-0"
            >
              Add row
            </Button>
          )}
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-y border-background-200 bg-background-100">
              <th className="w-12 px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                #
              </th>
              <th className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                Key job responsibility
              </th>
              <th className="w-48 px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                % of time
              </th>
              {!readOnly && <th className="w-14 px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-background-100">
            {rows.map((row, index) => {
              const hasText = row.text.trim().length > 0;
              const hasPercent = row.percent !== null && row.percent > 0;
              const rowComplete = hasText && hasPercent;

              return (
                <tr
                  key={row.id}
                  className={cn(
                    "transition-colors",
                    rowComplete
                      ? "bg-background-50"
                      : "bg-background-50/60",
                  )}
                >
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full font-label text-xs font-semibold",
                        rowComplete
                          ? "bg-primary-100 text-primary-700"
                          : "bg-background-200 text-foreground-500",
                      )}
                    >
                      {index + 1}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    {readOnly ? (
                      <span className="text-sm text-foreground-800">
                        {row.text || "—"}
                      </span>
                    ) : (
                      <textarea
                        value={row.text}
                        onChange={(e) =>
                          updateRow(row.id, { text: e.target.value })
                        }
                        rows={2}
                        placeholder="Describe the responsibility, task or deliverable you own…"
                        className={cn(
                          "w-full resize-y rounded-lg border px-3 py-2.5 font-label text-sm text-foreground-900 placeholder:text-foreground-400 transition-colors",
                          "focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400",
                          hasText
                            ? "border-background-200 bg-white"
                            : "border-background-300 bg-background-50",
                        )}
                      />
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {readOnly ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-label text-xs font-bold",
                          row.percent
                            ? "border-primary-200 bg-primary-50 text-primary-800"
                            : "border-background-200 bg-background-100 text-foreground-500",
                        )}
                      >
                        {row.percent === null ? "—" : `${row.percent}%`}
                      </span>
                    ) : (
                      <PercentStepper
                        value={row.percent}
                        complete={balanced}
                        onChange={(v) => updateRow(row.id, { percent: v })}
                      />
                    )}
                  </td>

                  {!readOnly && (
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        title="Remove row"
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-background-200 text-foreground-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
                      >
                        <i className="ri-delete-bin-6-line text-sm" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-background-200 bg-background-100">
              <td />
              <td className="px-4 py-3">
                <div className="flex flex-nowrap items-center justify-between gap-3">
                  <span className="font-label text-sm font-semibold text-foreground-800">
                    Total time allocation
                  </span>
                  {!readOnly && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon="ri-add-line"
                      onClick={addRow}
                      disabled={rows.length >= MAX_ROWS}
                      className="shrink-0"
                    >
                      Add row
                    </Button>
                  )}
                </div>
              </td>
              <td className="px-4 py-3" colSpan={readOnly ? 1 : 2}>
                <span
                  className={cn(
                    "font-label text-sm font-bold",
                    balanced
                      ? "text-secondary-700"
                      : totalPercent > 100
                        ? "text-red-600"
                        : "text-amber-700",
                  )}
                >
                  {totalPercent}%
                  {balanced
                    ? " · balanced ✓"
                    : remaining > 0
                      ? ` · ${remaining}% remaining`
                      : ` · ${Math.abs(remaining)}% over`}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="border-t border-background-200 px-3 py-2.5 text-xs text-foreground-500">
        Up to {MAX_ROWS} responsibilities can be added. Use{" "}
        <strong className="text-foreground-700">−</strong> and{" "}
        <strong className="text-foreground-700">+</strong> buttons (5% steps) or
        type a value directly. Total must equal exactly{" "}
        <strong className="text-foreground-700">100%</strong> before you can
        submit.
      </p>
    </SectionCard>
  );
}