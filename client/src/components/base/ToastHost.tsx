import { useToast, type ToastTone } from "@/store/ToastContext";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<ToastTone, { wrap: string; icon: string }> = {
  success: {
    wrap: "border-primary-200 bg-primary-50",
    icon: "ri-checkbox-circle-fill text-primary-600",
  },
  error: {
    wrap: "border-accent-300 bg-accent-50",
    icon: "ri-error-warning-fill text-accent-600",
  },
  info: {
    wrap: "border-secondary-200 bg-secondary-50",
    icon: "ri-information-fill text-secondary-600",
  },
};

export default function ToastHost() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((toast) => {
        const styles = TONE_STYLES[toast.tone];
        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex animate-slide-in-right items-start gap-3 rounded-lg border p-3.5 shadow-none",
              styles.wrap,
            )}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <i className={cn(styles.icon, "text-lg")} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-label text-sm font-semibold text-foreground-950">
                {toast.title}
              </p>
              {toast.message && (
                <p className="mt-0.5 text-xs text-foreground-700">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-foreground-500 hover:bg-background-100"
            >
              <i className="ri-close-line text-base" />
            </button>
          </div>
        );
      })}
    </div>
  );
}