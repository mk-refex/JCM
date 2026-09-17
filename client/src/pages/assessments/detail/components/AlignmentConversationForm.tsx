import { useState } from "react";
import Button from "@/components/base/Button";
import { SectionCard } from "@/components/base/Card";
import { cn } from "@/lib/utils";
import type { Assessment } from "@/types/domain";

interface AlignmentConversationFormProps {
  assessment: Assessment;
  employeeName: string;
  canEditHod: boolean;
  canEditHrbp: boolean;
  submitting?: boolean;
  onSave: (input: {
    hodComments?: string;
    hrbpComments?: string;
    complete?: boolean;
  }) => void;
}

export default function AlignmentConversationForm({
  assessment,
  employeeName,
  canEditHod,
  canEditHrbp,
  submitting = false,
  onSave,
}: AlignmentConversationFormProps) {
  const existing = assessment.alignmentConversation;
  const [hodComments, setHodComments] = useState(
    existing?.hodComments || assessment.hodComments || "",
  );
  const [hrbpComments, setHrbpComments] = useState(
    existing?.hrbpComments || assessment.hrbpComments || "",
  );

  const hodValue = canEditHod
    ? hodComments
    : existing?.hodComments || assessment.hodComments || "";
  const hrbpValue = canEditHrbp
    ? hrbpComments
    : existing?.hrbpComments || assessment.hrbpComments || "";
  const hodReady = hodValue.trim().length > 0;
  const canComplete = (canEditHod || canEditHrbp) && hodReady && !submitting;

  const payload = () => {
    const input: {
      hodComments?: string;
      hrbpComments?: string;
    } = {};
    if (canEditHod) input.hodComments = hodComments.trim();
    if (canEditHrbp) input.hrbpComments = hrbpComments.trim();
    return input;
  };

  return (
    <SectionCard
      title="Role Alignment Conversation"
      description={`This stage is a constructive conversation to reach a shared understanding of ${employeeName}'s role — not a conflict or escalation. The Employee, Reporting Manager, HOD and HRBP discuss the areas of difference together.`}
      icon="ri-group-line"
      accent
    >
      <div className="mb-5 rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2.5">
        <p className="text-xs leading-relaxed text-foreground-700">
          Discuss the areas of difference and arrive at a common understanding of
          the role, responsibilities and expectations. The HOD records the final
          comments from the discussion. HRBP captures observations separately.
        </p>
      </div>

      <label className="mb-1.5 block font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
        HOD final comments / clarifications
      </label>
      {canEditHod ? (
        <textarea
          value={hodComments}
          onChange={(event) => setHodComments(event.target.value.slice(0, 1500))}
          rows={5}
          maxLength={1500}
          placeholder="Record the final comments and clarifications arising from the Role Alignment Conversation…"
          className="w-full resize-y rounded-lg border border-background-300 bg-white px-4 py-3 font-label text-sm leading-relaxed text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
        />
      ) : (
        <p className="rounded-lg border border-background-200 bg-background-100 px-4 py-3 text-sm text-foreground-700">
          {hodValue || "The HOD has not recorded comments yet."}
        </p>
      )}
      {canEditHod && (
        <p className="mt-1.5 text-right font-label text-[11px] text-foreground-400">
          {hodComments.length}/1500
        </p>
      )}

      <label className="mb-1.5 mt-5 block font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
        HRBP / HR observations
      </label>
      {canEditHrbp ? (
        <textarea
          value={hrbpComments}
          onChange={(event) => setHrbpComments(event.target.value.slice(0, 1500))}
          rows={5}
          maxLength={1500}
          placeholder="Capture relevant observations or notes from the conversation…"
          className="w-full resize-y rounded-lg border border-background-300 bg-white px-4 py-3 font-label text-sm leading-relaxed text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
        />
      ) : (
        <p className="rounded-lg border border-background-200 bg-background-100 px-4 py-3 text-sm text-foreground-700">
          {hrbpValue || "The HRBP has not recorded observations yet."}
        </p>
      )}
      {canEditHrbp && (
        <p className="mt-1.5 text-right font-label text-[11px] text-foreground-400">
          {hrbpComments.length}/1500
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p
          className={cn(
            "text-xs",
            hodReady ? "text-foreground-500" : "text-foreground-500",
          )}
        >
          HOD comments are required before this conversation can be completed.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            icon="ri-save-line"
            loading={submitting}
            disabled={submitting}
            onClick={() => onSave(payload())}
          >
            Save notes
          </Button>
          <Button
            type="button"
            icon="ri-check-double-line"
            loading={submitting}
            disabled={!canComplete}
            onClick={() => onSave({ ...payload(), complete: true })}
          >
            Complete conversation
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
