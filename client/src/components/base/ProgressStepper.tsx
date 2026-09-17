import { STEPPER_STEPS, currentStepIndex } from "@/lib/workflow";
import type { WorkflowStatus } from "@/types/domain";
import { cn } from "@/lib/utils";

interface ProgressStepperProps {
  status: WorkflowStatus;
  conversationRequired?: boolean;
  compact?: boolean;
  closedAtInitialCheck?: boolean;
}

export default function ProgressStepper({
  status,
  conversationRequired = false,
  compact = false,
  closedAtInitialCheck = false,
}: ProgressStepperProps) {
  const currentIndex = currentStepIndex(status);
  const completed = status === "COMPLETED";
  const lastIndex = STEPPER_STEPS.length - 1;

  return (
    <ol className="flex w-full items-start overflow-x-auto scrollbar-slim">
      {STEPPER_STEPS.map((step, index) => {
        const isConversationStep = step.key === "conversation";
        const skipped = closedAtInitialCheck
          ? index > 0 && index < lastIndex
          : isConversationStep && !conversationRequired && index < currentIndex;
        const isDone = closedAtInitialCheck
          ? index === 0 || index === lastIndex
          : completed
            ? true
            : skipped
              ? false
              : index < currentIndex;
        const isCurrent = !completed && index === currentIndex && !skipped;
        const isPending = !isDone && !isCurrent;
        const connectorTone = isDone || isCurrent ? "bg-secondary-300" : "bg-background-300";

        return (
          <li
            key={step.key}
            className="flex min-w-[52px] flex-1 flex-col items-center px-0.5 text-center sm:min-w-[80px]"
          >
            <div className="flex w-full items-center">
              <span
                className={cn(
                  "h-px flex-1",
                  index === 0 ? "bg-transparent" : connectorTone,
                )}
              />
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-label text-[10px] font-semibold transition-colors sm:h-7 sm:w-7 sm:text-[11px]",
                  isDone &&
                    "border-secondary-500 bg-secondary-500 text-white dark:text-foreground-950",
                  isCurrent &&
                    "border-primary-500 bg-primary-100 text-primary-700 ring-2 ring-primary-100",
                  isPending &&
                    !skipped &&
                    "border-background-300 bg-background-100 text-foreground-500",
                  skipped &&
                    "border-dashed border-background-300 bg-background-50 text-foreground-400",
                )}
              >
                {isDone ? (
                  <i className="ri-check-line text-xs" />
                ) : skipped ? (
                  <i className="ri-subtract-line text-xs" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "h-px flex-1",
                  index === lastIndex
                    ? "bg-transparent"
                    : isDone
                      ? "bg-secondary-300"
                      : "bg-background-300",
                )}
              />
            </div>
            <span
              className={cn(
                "mt-1 font-label text-[10px] font-medium leading-tight sm:text-xs",
                isCurrent
                  ? "text-primary-700"
                  : isDone
                    ? "text-foreground-800"
                    : "text-foreground-500",
              )}
            >
              {step.label}
            </span>
            {!compact && (
              <span className="mt-0.5 text-[11px] leading-tight text-foreground-500">
                {skipped ? "Not required" : step.hint}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}