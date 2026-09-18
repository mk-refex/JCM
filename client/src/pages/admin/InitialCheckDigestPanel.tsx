import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/base/Card";
import Button from "@/components/base/Button";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/store/ToastContext";
import {
  ApiError,
  dispatchInitialCheckDigest,
  fetchInitialCheckDigest,
  saveInitialCheckDigest,
  type InitialCheckDigestSettings,
} from "@/services/api";
import { cn, formatDateTime } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-md border border-background-300 bg-background-50 px-3 font-label text-sm text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

const areaClass =
  "w-full resize-y rounded-md border border-background-300 bg-background-50 px-3 py-2.5 font-label text-sm text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

const EMPTY: InitialCheckDigestSettings = {
  enabled: false,
  timezone: "Asia/Kolkata",
  scheduleTimes: ["09:00"],
  scheduleDates: [],
  activeFrom: "2026-09-18",
  activeTo: "2026-09-22",
  recipientIds: [],
  extraEmails: "",
  subject: "Daily reminder: Employees yet to start Initial Role Clarity Check",
  bodyIntro:
    "The following employees have not yet started their Initial Role Clarity Check. Please follow up so they complete it within the campaign window.",
  bodyOutro:
    "This is an automated digest from Job Clarity Management. You can update recipients and schedule from Admin → SLA & Notifications.",
  lastAutoSentKey: null,
  lastAutoSentAt: null,
};

export default function InitialCheckDigestPanel() {
  const { employees } = useApp();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState<InitialCheckDigestSettings>(EMPTY);
  const [timesText, setTimesText] = useState("09:00");
  const [datesText, setDatesText] = useState("");
  const [recipientQuery, setRecipientQuery] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const result = await fetchInitialCheckDigest();
        if (!alive) return;
        setForm(result);
        setTimesText((result.scheduleTimes || []).join(", "));
        setDatesText((result.scheduleDates || []).join(", "));
      } catch (error) {
        if (!alive) return;
        pushToast({
          tone: "error",
          title: "Could not load digest settings",
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

  const selectedRecipients = useMemo(
    () =>
      form.recipientIds
        .map((id) => employees.find((e) => e.id === id))
        .filter(Boolean),
    [employees, form.recipientIds],
  );

  const recipientOptions = useMemo(() => {
    const q = recipientQuery.trim().toLowerCase();
    const list = employees.filter((e) => !form.recipientIds.includes(e.id));
    if (!q) return list.slice(0, 30);
    return list
      .filter((e) =>
        `${e.name} ${e.empId} ${e.email} ${e.designation}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 30);
  }, [employees, form.recipientIds, recipientQuery]);

  const patch = <K extends keyof InitialCheckDigestSettings>(
    key: K,
    value: InitialCheckDigestSettings[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveInitialCheckDigest({
        ...form,
        scheduleTimes: timesText
          .split(/[,;\s]+/)
          .map((v) => v.trim())
          .filter(Boolean),
        scheduleDates: datesText
          .split(/[,;\s]+/)
          .map((v) => v.trim())
          .filter(Boolean),
      });
      setForm(saved);
      setTimesText((saved.scheduleTimes || []).join(", "));
      setDatesText((saved.scheduleDates || []).join(", "));
      pushToast({
        tone: "success",
        title: "Digest reminder saved",
        message: saved.enabled
          ? "Automatic daily digest is enabled for the configured times."
          : "Settings saved. Automatic digest is currently off.",
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

  const handleDispatch = async () => {
    setSending(true);
    try {
      const result = await dispatchInitialCheckDigest();
      pushToast({
        tone: result.sent ? "success" : "warning",
        title: result.sent ? "Digest sent" : "Digest not sent",
        message: result.sent
          ? `Sent to ${result.recipientCount} recipient(s). ${result.pendingCount} employee(s) have not started.`
          : `No mail was delivered. Check SMTP settings. Pending employees: ${result.pendingCount}.`,
      });
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Send failed",
        message: error instanceof ApiError ? error.message : "Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <SectionCard
      title="Initial check — not started digest"
      description="Email selected stakeholders a daily list of employees who have not yet answered the Initial Role Clarity Check. Supports manual send and scheduled auto-trigger."
      icon="ri-mail-send-line"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon="ri-send-plane-line"
            loading={sending}
            disabled={loading}
            onClick={() => void handleDispatch()}
          >
            Send now
          </Button>
          <Button
            size="sm"
            icon="ri-save-line"
            loading={saving}
            disabled={loading}
            onClick={() => void handleSave()}
          >
            Save settings
          </Button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-foreground-500">Loading…</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-background-200 bg-background-100 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground-900">
                Automatic daily trigger
              </p>
              <p className="text-xs text-foreground-500">
                Cron checks every minute and sends at the configured local times
                within the active date window.
              </p>
            </div>
            <button
              type="button"
              onClick={() => patch("enabled", !form.enabled)}
              className={cn(
                "relative h-6 w-11 cursor-pointer rounded-full transition-colors",
                form.enabled ? "bg-primary-500" : "bg-background-300",
              )}
              aria-label="Toggle automatic digest"
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
                  form.enabled ? "left-[22px]" : "left-0.5",
                )}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                Timezone
              </span>
              <input
                className={fieldClass}
                value={form.timezone}
                onChange={(e) => patch("timezone", e.target.value)}
                placeholder="Asia/Kolkata"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                Daily times (HH:mm, comma-separated)
              </span>
              <input
                className={fieldClass}
                value={timesText}
                onChange={(e) => setTimesText(e.target.value)}
                placeholder="09:00, 17:00"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                Active from
              </span>
              <input
                type="date"
                className={fieldClass}
                value={form.activeFrom}
                onChange={(e) => patch("activeFrom", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                Active to
              </span>
              <input
                type="date"
                className={fieldClass}
                value={form.activeTo}
                onChange={(e) => patch("activeTo", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                Specific dates only (optional, YYYY-MM-DD)
              </span>
              <input
                className={fieldClass}
                value={datesText}
                onChange={(e) => setDatesText(e.target.value)}
                placeholder="Leave empty to run every day in the active window"
              />
              <span className="text-xs text-foreground-500">
                If set, auto-send runs only on these dates at the times above.
              </span>
            </label>
          </div>

          <p className="rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2.5 text-xs text-foreground-700">
            Email stays short (count only). The attached Excel has one sheet per
            workflow status (e.g.{" "}
            <code className="text-foreground-800">INITIAL_CLARITY_CHECK</code>
            ). Only active employees are included (
            <code className="text-foreground-800">employment_status = 1</code> and{" "}
            <code className="text-foreground-800">
              employment_status_description = Active
            </code>
            ).
          </p>

          <div className="flex flex-col gap-2">
            <p className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Digest recipients
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedRecipients.length === 0 ? (
                <span className="text-xs text-foreground-500">
                  No users selected yet.
                </span>
              ) : (
                selectedRecipients.map((person) => (
                  <span
                    key={person!.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-800"
                  >
                    {person!.name}
                    <button
                      type="button"
                      className="cursor-pointer text-primary-700 hover:text-accent-700"
                      onClick={() =>
                        patch(
                          "recipientIds",
                          form.recipientIds.filter((id) => id !== person!.id),
                        )
                      }
                    >
                      <i className="ri-close-line text-sm" />
                    </button>
                  </span>
                ))
              )}
            </div>
            <input
              className={fieldClass}
              value={recipientQuery}
              onChange={(e) => setRecipientQuery(e.target.value)}
              placeholder="Search employees to add as digest recipients"
            />
            {recipientQuery.trim() && (
              <ul className="max-h-40 overflow-y-auto rounded-md border border-background-200 bg-background-50 scrollbar-slim">
                {recipientOptions.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-foreground-500">
                    No matches
                  </li>
                ) : (
                  recipientOptions.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        className="flex w-full cursor-pointer flex-col gap-0.5 px-3 py-2 text-left hover:bg-background-100"
                        onClick={() => {
                          patch("recipientIds", [
                            ...form.recipientIds,
                            option.id,
                          ]);
                          setRecipientQuery("");
                        }}
                      >
                        <span className="text-sm font-medium text-foreground-900">
                          {option.name}
                        </span>
                        <span className="text-xs text-foreground-500">
                          {option.empId}
                          {option.email ? ` · ${option.email}` : ""}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
            <label className="mt-1 flex flex-col gap-1.5">
              <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                Extra emails (optional)
              </span>
              <input
                className={fieldClass}
                value={form.extraEmails}
                onChange={(e) => patch("extraEmails", e.target.value)}
                placeholder="hr@company.com, ops@company.com"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                Email subject
              </span>
              <input
                className={fieldClass}
                value={form.subject}
                onChange={(e) => patch("subject", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                Intro text
              </span>
              <textarea
                className={areaClass}
                rows={3}
                value={form.bodyIntro}
                onChange={(e) => patch("bodyIntro", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
                Closing text
              </span>
              <textarea
                className={areaClass}
                rows={2}
                value={form.bodyOutro}
                onChange={(e) => patch("bodyOutro", e.target.value)}
              />
            </label>
          </div>

          <p className="text-xs text-foreground-500">
            Last auto send:{" "}
            {form.lastAutoSentAt
              ? `${formatDateTime(form.lastAutoSentAt)}${
                  form.lastAutoSentKey ? ` (${form.lastAutoSentKey})` : ""
                }`
              : "Never"}
          </p>
        </div>
      )}
    </SectionCard>
  );
}
