import { useEffect, useState } from "react";
import { SectionCard } from "@/components/base/Card";
import Button from "@/components/base/Button";
import { useToast } from "@/store/ToastContext";
import {
  ApiError,
  fetchSlaCampaign,
  saveSlaCampaign,
  type SlaCampaignSettings,
  type SlaStageSetting,
} from "@/services/api";
import { SLA_CONFIG } from "@/constants/clarity";
import { setRuntimeSlaStages } from "@/lib/sla";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-md border border-background-300 bg-background-50 px-3 font-label text-sm text-foreground-900 focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

function defaultsFromConstants(): SlaCampaignSettings {
  const stages: Record<string, SlaStageSetting> = {};
  for (const [key, value] of Object.entries(SLA_CONFIG)) {
    stages[key] = { ...value };
  }
  return { stages };
}

export default function SlaConfigPanel() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState<Record<string, SlaStageSetting>>(
    () => defaultsFromConstants().stages,
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const result = await fetchSlaCampaign();
        if (!alive) return;
        setStages(result.stages);
        setRuntimeSlaStages(result.stages);
      } catch (error) {
        if (!alive) return;
        pushToast({
          tone: "error",
          title: "Could not load SLA calendar",
          message:
            error instanceof ApiError ? error.message : "Please try again.",
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pushToast]);

  const updateStage = (
    key: string,
    field: "openFrom" | "dueOn",
    value: string,
  ) => {
    setStages((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveSlaCampaign({ stages });
      setStages(saved.stages);
      setRuntimeSlaStages(saved.stages);
      pushToast({
        tone: "success",
        title: "SLA calendar saved",
        message: "Campaign stage dates are updated for all open cases.",
      });
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Save failed",
        message: error instanceof ApiError ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Campaign SLA calendar"
      description="Configure open-from and due-on dates for each workflow stage. Changes apply to due badges and reminder logic immediately."
      icon="ri-calendar-schedule-line"
      action={
        <Button
          size="sm"
          icon="ri-save-line"
          loading={saving}
          disabled={loading}
          onClick={() => void handleSave()}
        >
          Save dates
        </Button>
      }
      bodyClassName="p-0"
    >
      {loading ? (
        <p className="px-4 py-6 text-sm text-foreground-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto scrollbar-slim">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-background-200">
                {["Stage", "Owner", "Open from", "Due on"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(stages).map(([key, value]) => (
                <tr key={key} className="border-b border-background-100">
                  <td className="px-4 py-3 text-sm font-medium text-foreground-800">
                    {value.label}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground-500">
                    {value.owner}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      className={cn(fieldClass, "max-w-[11rem]")}
                      value={value.openFrom}
                      onChange={(e) =>
                        updateStage(key, "openFrom", e.target.value)
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      className={cn(fieldClass, "max-w-[11rem]")}
                      value={value.dueOn}
                      onChange={(e) =>
                        updateStage(key, "dueOn", e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
