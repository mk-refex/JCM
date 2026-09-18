import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/base/Card";
import { Badge } from "@/components/base/Badge";
import Button from "@/components/base/Button";
import Modal from "@/components/base/Modal";
import EmptyState from "@/components/base/EmptyState";
import Pagination from "@/components/base/Pagination";
import { useToast } from "@/store/ToastContext";
import { usePagination } from "@/hooks/usePagination";
import {
  ApiError,
  createSsoProvider,
  deleteSsoProvider,
  fetchSsoProviders,
  updateSsoProvider,
  type SsoProvider,
  type SsoProviderInput,
} from "@/services/api";

const EMPTY_FORM: SsoProviderInput = {
  provider: "",
  displayName: "",
  iconUrl: "",
  sortOrder: 0,
  isActive: true,
  clientId: "",
  clientSecret: "",
  redirectUri: "",
  frontendBaseUrl: "",
  discoveryUrl: "",
  authorizationUrl: "",
  tokenUrl: "",
  userInfoUrl: "",
  scopes: "openid email profile",
};

const fieldClass =
  "h-10 w-full rounded-md border border-background-300 bg-background-50 px-3 font-label text-sm text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

export default function SsoConfigPanel() {
  const { pushToast } = useToast();
  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SsoProvider | null>(null);
  const [form, setForm] = useState<SsoProviderInput>(EMPTY_FORM);
  const paging = usePagination(providers);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSsoProviders();
      setProviders(result.providers);
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Could not load SSO providers",
        message: error instanceof ApiError ? error.message : "Request failed.",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (provider: SsoProvider) => {
    setEditing(provider);
    setForm({
      provider: provider.provider,
      displayName: provider.displayName || "",
      iconUrl: provider.iconUrl || "",
      sortOrder: provider.sortOrder,
      isActive: provider.isActive,
      clientId: provider.clientId,
      clientSecret: "",
      redirectUri: provider.redirectUri,
      frontendBaseUrl: provider.frontendBaseUrl,
      discoveryUrl: provider.discoveryUrl,
      authorizationUrl: provider.authorizationUrl,
      tokenUrl: provider.tokenUrl,
      userInfoUrl: provider.userInfoUrl,
      scopes: provider.scopes || "openid email profile",
    });
    setOpen(true);
  };

  const setField = <K extends keyof SsoProviderInput>(key: K, value: SsoProviderInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await updateSsoProvider(editing.id, form);
        pushToast({
          tone: "success",
          title: "SSO provider updated",
          message: `${form.displayName || form.provider} saved.`,
        });
      } else {
        await createSsoProvider(form);
        pushToast({
          tone: "success",
          title: "SSO provider created",
          message: `${form.displayName || form.provider} is ready for login.`,
        });
      }
      setOpen(false);
      await load();
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Save failed",
        message: error instanceof ApiError ? error.message : "Could not save provider.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (provider: SsoProvider) => {
    if (!window.confirm(`Delete SSO provider “${provider.displayName || provider.provider}”?`)) {
      return;
    }
    setDeletingId(provider.id);
    try {
      await deleteSsoProvider(provider.id);
      pushToast({
        tone: "success",
        title: "SSO provider deleted",
        message: `${provider.displayName || provider.provider} removed.`,
      });
      await load();
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Delete failed",
        message: error instanceof ApiError ? error.message : "Could not delete provider.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const callbackHint =
    typeof window !== "undefined"
      ? `${window.location.origin.replace(/:\d+$/, ":4000")}/auth/sso/{provider}/callback`
      : "/auth/sso/{provider}/callback";

  return (
    <>
      <SectionCard
        title="SSO configuration"
        description="Configure OIDC providers for login. Active providers with a client ID appear on the sign-in page."
        icon="ri-shield-keyhole-line"
        bodyClassName="p-0"
        action={
          <Button size="sm" icon="ri-add-line" onClick={openCreate}>
            Add provider
          </Button>
        }
      >
        <div className="border-b border-background-200 bg-background-100 px-4 py-3 text-xs text-foreground-600">
          Callback URL pattern:{" "}
          <code className="rounded bg-background-50 px-1.5 py-0.5 text-foreground-800">
            {callbackHint}
          </code>
          . Leave redirect URI empty to auto-generate from the API host.
        </div>

        {loading ? (
          <p className="p-6 text-sm text-foreground-600">Loading SSO providers…</p>
        ) : providers.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="ri-shield-keyhole-line"
              title="No SSO providers yet"
              description="Add an OIDC provider (for example RefexOne or Azure AD) to enable SSO on the login page."
              action={
                <Button icon="ri-add-line" onClick={openCreate}>
                  Add provider
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto scrollbar-slim">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-background-200">
                    {["Order", "Provider", "Slug", "Status", "Client ID", "Actions"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 font-label text-xs font-semibold uppercase tracking-wide text-foreground-500"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paging.pageItems.map((provider) => (
                    <tr key={provider.id} className="border-b border-background-100">
                      <td className="px-4 py-3 text-sm text-foreground-700">
                        {provider.sortOrder}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {provider.iconUrl ? (
                            <img
                              src={provider.iconUrl}
                              alt=""
                              className="h-6 w-6 rounded object-contain"
                            />
                          ) : (
                            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary-50 text-primary-700">
                              <i className="ri-shield-keyhole-line text-sm" />
                            </span>
                          )}
                          <span className="text-sm font-medium text-foreground-900">
                            {provider.displayName || provider.provider}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-label text-sm text-foreground-700">
                        {provider.provider}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={provider.isActive ? "success" : "danger"}>
                          {provider.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-label text-xs text-foreground-600">
                        {provider.clientId
                          ? `${provider.clientId.slice(0, 12)}${provider.clientId.length > 12 ? "…" : ""}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            icon="ri-edit-line"
                            onClick={() => openEdit(provider)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon="ri-delete-bin-line"
                            loading={deletingId === provider.id}
                            disabled={Boolean(deletingId)}
                            onClick={() => void handleDelete(provider)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={paging.page}
              pageSize={paging.pageSize}
              totalItems={paging.totalItems}
              totalPages={paging.totalPages}
              from={paging.from}
              to={paging.to}
              onPageChange={paging.setPage}
              onPageSizeChange={paging.setPageSize}
              itemLabel="providers"
            />
          </>
        )}
      </SectionCard>

      <Modal
        open={open}
        onClose={() => {
          if (!saving) setOpen(false);
        }}
        preventClose={saving}
        title={editing ? "Edit SSO provider" : "Add SSO provider"}
        description="OIDC authorization-code settings used for login."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              icon="ri-save-line"
              loading={saving}
              onClick={() => void handleSave()}
              disabled={!form.provider.trim() || !form.clientId?.trim()}
            >
              {editing ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Provider slug *
            </span>
            <input
              className={fieldClass}
              value={form.provider}
              disabled={Boolean(editing)}
              onChange={(e) => setField("provider", e.target.value)}
              placeholder="refex-one"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Display name
            </span>
            <input
              className={fieldClass}
              value={form.displayName || ""}
              onChange={(e) => setField("displayName", e.target.value)}
              placeholder="RefexOne"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Sort order
            </span>
            <input
              type="number"
              className={fieldClass}
              value={form.sortOrder ?? 0}
              onChange={(e) => setField("sortOrder", Number(e.target.value) || 0)}
            />
          </label>
          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={form.isActive !== false}
              onChange={(e) => setField("isActive", e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
            <span className="font-label text-sm text-foreground-800">Active on login page</span>
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Icon URL
            </span>
            <input
              className={fieldClass}
              value={form.iconUrl || ""}
              onChange={(e) => setField("iconUrl", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Client ID *
            </span>
            <input
              className={fieldClass}
              value={form.clientId || ""}
              onChange={(e) => setField("clientId", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Client secret
            </span>
            <input
              type="password"
              className={fieldClass}
              value={form.clientSecret || ""}
              onChange={(e) => setField("clientSecret", e.target.value)}
              placeholder={editing?.hasClientSecret ? "Leave blank to keep current" : ""}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Redirect URI
            </span>
            <input
              className={fieldClass}
              value={form.redirectUri || ""}
              onChange={(e) => setField("redirectUri", e.target.value)}
              placeholder="https://your-api.com/auth/sso/refex-one/callback"
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Frontend base URL
            </span>
            <input
              className={fieldClass}
              value={form.frontendBaseUrl || ""}
              onChange={(e) => setField("frontendBaseUrl", e.target.value)}
              placeholder="https://jcm.example.com"
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Discovery URL
            </span>
            <input
              className={fieldClass}
              value={form.discoveryUrl || ""}
              onChange={(e) => setField("discoveryUrl", e.target.value)}
              placeholder="https://.../.well-known/openid-configuration"
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Authorization URL
            </span>
            <input
              className={fieldClass}
              value={form.authorizationUrl || ""}
              onChange={(e) => setField("authorizationUrl", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Token URL
            </span>
            <input
              className={fieldClass}
              value={form.tokenUrl || ""}
              onChange={(e) => setField("tokenUrl", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              UserInfo URL
            </span>
            <input
              className={fieldClass}
              value={form.userInfoUrl || ""}
              onChange={(e) => setField("userInfoUrl", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-500">
              Scopes
            </span>
            <input
              className={fieldClass}
              value={form.scopes || ""}
              onChange={(e) => setField("scopes", e.target.value)}
            />
          </label>
        </div>
      </Modal>
    </>
  );
}
