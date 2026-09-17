import { useState } from "react";
import Button from "@/components/base/Button";
import { SectionCard } from "@/components/base/Card";
import { cn } from "@/lib/utils";

interface HodSignoffFormProps {
  employeeName: string;
  submitting?: boolean;
  onSubmit: (comments: string) => void;
}

export default function HodSignoffForm({
  employeeName,
  submitting = false,
  onSubmit,
}: HodSignoffFormProps) {
  const [comments, setComments] = useState("");
  const ready = comments.trim().length > 0 && !submitting;

  return (
    <SectionCard
      title="HOD final comments and sign-off"
      description={`Review the case, add your comments, then close the Role Clarity Review for ${employeeName}. Sign-off is terminal — the case cannot reopen.`}
      icon="ri-verified-badge-line"
      accent
    >
      <label className="mb-1.5 block font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
        HOD comments / clarifications
      </label>
      <textarea
        value={comments}
        onChange={(event) => setComments(event.target.value.slice(0, 1500))}
        rows={6}
        maxLength={1500}
        placeholder="Record your final comments, any clarifications, and the basis for closing this case…"
        className="w-full resize-y rounded-lg border border-background-300 bg-white px-4 py-3 font-label text-sm leading-relaxed text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-foreground-500">
          <i className="ri-information-line mr-1" />
          Required before the case can be closed.
        </p>
        <span
          className={cn(
            "font-label text-[11px] font-medium",
            comments.length > 1350 ? "text-accent-700" : "text-foreground-400",
          )}
        >
          {comments.length}/1500
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          icon="ri-checkbox-circle-line"
          loading={submitting}
          disabled={!ready}
          onClick={() => onSubmit(comments.trim())}
        >
          Sign off and close case
        </Button>
      </div>
    </SectionCard>
  );
}
