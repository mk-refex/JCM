import { useState } from "react";
import Button from "@/components/base/Button";
import { SectionCard } from "@/components/base/Card";
import { cn } from "@/lib/utils";
import type { InitialClarityResponse } from "@/types/domain";

interface InitialCheckProps {
  onResolve: (response: InitialClarityResponse) => void;
}

const OPTIONS: Array<{
  value: InitialClarityResponse;
  label: string;
  icon: string;
  description: string;
  consequence: string;
}> = [
  {
    value: "YES",
    label: "Yes",
    icon: "ri-checkbox-circle-line",
    description:
      "I have complete clarity on my current role and what is expected of me.",
    consequence:
      "The review will be marked completed and closed at this initial check.",
  },
  {
    value: "PARTIALLY",
    label: "Partially",
    icon: "ri-contrast-2-line",
    description:
      "I understand some aspects, but several areas of my role need clarification.",
    consequence:
      "The detailed Self Assessment across the 7 clarity dimensions will open.",
  },
  {
    value: "NO",
    label: "No",
    icon: "ri-close-circle-line",
    description:
      "I do not have clarity on my current role and expectations.",
    consequence:
      "The detailed Self Assessment across the 7 clarity dimensions will open.",
  },
];

export default function InitialCheck({ onResolve }: InitialCheckProps) {
  const [selected, setSelected] = useState<InitialClarityResponse | null>(null);

  return (
    <SectionCard
      title="Initial Role Clarity Check"
      description="Before you begin, answer this first question honestly. Your response determines the next step of the review."
      icon="ri-question-answer-line"
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-md border border-secondary-200 bg-secondary-50 p-4">
          <p className="font-heading text-sm font-semibold text-foreground-900 md:text-base">
            Do you have clarity on your current role and expectations?
          </p>
          <p className="mt-1 text-xs text-foreground-600 md:text-sm">
            This is your starting point. There is no right or wrong answer — the
            process adapts to what you select.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {OPTIONS.map((option) => {
            const active = selected === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelected(option.value)}
                className={cn(
                  "flex cursor-pointer flex-col gap-3 rounded-lg border p-4 text-left transition-colors",
                  active
                    ? "border-primary-400 bg-primary-50 ring-2 ring-primary-100"
                    : "border-background-200 bg-background-50 hover:border-primary-300 hover:bg-background-100",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md",
                      active
                        ? "bg-primary-500 text-white dark:text-foreground-950"
                        : "bg-background-100 text-foreground-600",
                    )}
                  >
                    <i className={cn(option.icon, "text-xl")} />
                  </span>
                  {active && (
                    <i className="ri-checkbox-circle-fill text-lg text-primary-600" />
                  )}
                </div>
                <div>
                  <p className="font-heading text-sm font-semibold text-foreground-950">
                    {option.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground-600">
                    {option.description}
                  </p>
                </div>
                <p className="mt-auto border-t border-background-200 pt-3 text-[11px] leading-relaxed text-foreground-500">
                  {option.consequence}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-background-200 pt-5">
          <p className="text-xs text-foreground-500">
            {selected
              ? "Confirm to record your response and continue."
              : "Select an option to continue."}
          </p>
          <Button
            variant="primary"
            icon="ri-arrow-right-line"
            disabled={!selected}
            onClick={() => selected && onResolve(selected)}
          >
            Confirm and continue
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}