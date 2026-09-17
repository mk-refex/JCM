import { SectionCard } from "@/components/base/Card";
import { CLARITY_DIMENSIONS, RATING_SCALE } from "@/constants/clarity";
import { cn } from "@/lib/utils";

interface RatingDimensionsProps {
  value: Record<string, number | null>;
  onChange: (dimensionKey: string, score: number) => void;
  readOnly?: boolean;
  sectionTitle?: string;
  sectionDescription?: string;
  ratingLabel?: string;
}

const SCALE_COLORS: Record<number, string> = {
  1: "text-red-600 bg-red-50 border-red-200",
  2: "text-orange-600 bg-orange-50 border-orange-200",
  3: "text-amber-600 bg-amber-50 border-amber-200",
  4: "text-emerald-600 bg-emerald-50 border-emerald-200",
  5: "text-green-700 bg-green-50 border-green-200",
};

const SCALE_DOT: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-amber-500",
  4: "bg-emerald-500",
  5: "bg-green-600",
};

export function RatingScaleLegend() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {RATING_SCALE.map((option) => (
        <div
          key={option.score}
          className={cn(
            "rounded-md border p-2",
            SCALE_COLORS[option.score] ?? "border-background-200 bg-background-100",
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0",
                SCALE_DOT[option.score] ?? "bg-foreground-400",
              )}
            >
              {option.score}
            </span>
            <p className="font-label text-xs font-semibold">{option.label}</p>
          </div>
          <p className="text-[11px] leading-tight opacity-80">{option.definition}</p>
        </div>
      ))}
    </div>
  );
}

export default function RatingDimensions({
  value,
  onChange,
  readOnly = false,
  sectionTitle = "Section C — Role clarity rating",
  sectionDescription = "Rate your clarity on each of the 7 dimensions using the dropdown. Every dimension is mandatory.",
  ratingLabel = "Your clarity rating",
}: RatingDimensionsProps) {
  const ratedCount = CLARITY_DIMENSIONS.filter(
    (d) => typeof value[d.key] === "number" && value[d.key] !== null,
  ).length;

  return (
    <SectionCard
      title={sectionTitle}
      description={sectionDescription}
      icon="ri-star-half-line"
      compact
      action={
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-label text-xs font-semibold",
            ratedCount === CLARITY_DIMENSIONS.length
              ? "border-primary-200 bg-primary-100 text-primary-800"
              : "border-background-200 bg-background-100 text-foreground-600",
          )}
        >
          <i
            className={cn(
              "text-sm",
              ratedCount === CLARITY_DIMENSIONS.length
                ? "ri-checkbox-circle-fill text-primary-600"
                : "ri-time-line text-foreground-400",
            )}
          />
          {ratedCount}/{CLARITY_DIMENSIONS.length} rated
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        <RatingScaleLegend />

        <div className="flex flex-col gap-2">
          {CLARITY_DIMENSIONS.map((dimension) => {
            const selected = value[dimension.key] ?? null;
            const selectedOption = RATING_SCALE.find((r) => r.score === selected);
            const isRated = selected !== null;

            return (
              <div
                key={dimension.key}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  isRated
                    ? "border-primary-200 bg-primary-50/40"
                    : "border-background-200 bg-background-50",
                )}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  {/* Dimension info */}
                  <div className="flex items-start gap-3 min-w-0 lg:max-w-[60%]">
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-label text-xs font-bold",
                        isRated
                          ? "bg-primary-500 text-white"
                          : "bg-background-200 text-foreground-600",
                      )}
                    >
                      {dimension.order}
                    </span>
                    <div className="min-w-0">
                      <p className="font-label text-sm font-semibold text-foreground-900 leading-snug">
                        {dimension.name}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-foreground-600">
                        {dimension.definition}
                      </p>
                    </div>
                  </div>

                  {/* Rating select */}
                  <div className="flex flex-col gap-1.5 lg:min-w-[220px]">
                    <label className="font-label text-[11px] font-semibold uppercase tracking-wide text-foreground-500">
                      {ratingLabel}
                    </label>
                    {readOnly ? (
                      <div
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border px-3 py-2.5",
                          selectedOption
                            ? SCALE_COLORS[selectedOption.score]
                            : "border-background-200 bg-background-100 text-foreground-500",
                        )}
                      >
                        {selectedOption ? (
                          <>
                            <span
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                                SCALE_DOT[selectedOption.score],
                              )}
                            >
                              {selectedOption.score}
                            </span>
                            <span className="font-label text-sm font-semibold">
                              {selectedOption.label}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs italic">Not rated</span>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={selected ?? ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (!Number.isNaN(val) && val >= 1 && val <= 5) {
                              onChange(dimension.key, val);
                            }
                          }}
                          className={cn(
                            "w-full appearance-none rounded-lg border px-3 py-2.5 pr-9 font-label text-sm font-medium transition-colors cursor-pointer",
                            "focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400",
                            isRated && selectedOption
                              ? cn(SCALE_COLORS[selectedOption.score], "font-semibold")
                              : "border-background-300 bg-background-50 text-foreground-500",
                          )}
                        >
                          <option value="" disabled>
                            — Select a rating —
                          </option>
                          {RATING_SCALE.map((option) => (
                            <option key={option.score} value={option.score}>
                              {option.score} · {option.label}
                            </option>
                          ))}
                        </select>
                        {/* custom caret */}
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-foreground-500">
                          <i className="ri-arrow-down-s-line text-base" />
                        </span>
                      </div>
                    )}

                    {/* Inline colour bar under the select */}
                    {isRated && selectedOption && (
                      <div className="flex items-center gap-1.5">
                        {RATING_SCALE.map((opt) => (
                          <div
                            key={opt.score}
                            className={cn(
                              "h-1.5 flex-1 rounded-full transition-all",
                              opt.score <= selectedOption.score
                                ? SCALE_DOT[selectedOption.score]
                                : "bg-background-200",
                            )}
                          />
                        ))}
                        <span className="ml-1 font-label text-[11px] font-semibold text-foreground-600 whitespace-nowrap">
                          {selectedOption.score}/5
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}