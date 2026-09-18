import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "@/components/feature/Logo";
import { Badge } from "@/components/base/Badge";
import Button from "@/components/base/Button";
import { useApp } from "@/store/AppContext";
import {
  ApiError,
  fetchPublicSsoProviders,
  type PublicSsoProvider,
} from "@/services/api";
import { homePathFor } from "@/lib/utils";

const SSO_ERROR_MESSAGES: Record<string, string> = {
  no_code: "SSO did not return an authorization code. Please try again.",
  not_configured: "SSO is not configured. Contact your administrator.",
  token_failed: "Could not exchange the SSO authorization code.",
  profile_failed: "Could not load your profile from the identity provider.",
  no_email: "SSO profile did not include an email address.",
  user_not_found: "No Job Clarity account matches your SSO email.",
  login_failed: "SSO sign-in failed. Please try again.",
};

export default function Login() {
  const { login, currentUser, authReady } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [providers, setProviders] = useState<PublicSsoProvider[]>([]);

  useEffect(() => {
    const code = searchParams.get("error");
    if (code) {
      setError(SSO_ERROR_MESSAGES[code] || "SSO sign-in failed. Please try again.");
      setSearchParams(
        (params) => {
          const next = new URLSearchParams(params);
          next.delete("error");
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    void fetchPublicSsoProviders()
      .then((list) => setProviders(Array.isArray(list) ? list : []))
      .catch(() => setProviders([]));
  }, []);

  if (authReady && currentUser) {
    return <Navigate to={homePathFor(currentUser.role)} replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const session = await login(email.trim(), password);
      navigate(session.redirectTo || homePathFor(session.user.role), { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not sign in. Check that the API is running.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background-50 lg:flex-row">
      <div className="relative hidden w-full overflow-hidden lg:flex lg:w-[45%] lg:flex-col lg:justify-between">
        <img
          src="https://readdy.ai/api/search-image?query=abstract%20minimal%20geometric%20gradient%20artwork%20with%20warm%20coral%2C%20soft%20terracotta%20and%20cream%20tones%2C%20soft%20flowing%20organic%20shapes%2C%20premium%20enterprise%20brand%20visual%2C%20elegant%20clean%20composition%2C%20no%20text&width=1200&height=1600&seq=jcs-login-hero&orientation=portrait&nocache=true"
          alt="Abstract gradient artwork"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground-950/70 via-foreground-950/55 to-foreground-950/80" />

        <div className="relative z-10 p-10">
          <Logo invert />
        </div>

        <div className="relative z-10 p-10">
          <h1 className="max-w-md font-heading text-3xl font-semibold leading-tight text-background-50">
            Job Clarity Management System
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-background-200">
            Sign in to load your Job Clarity workspace and continue role clarity
            assessments across the organisation.
          </p>
          <ul className="mt-8 flex flex-col gap-3">
            {[
              "Sign in with your RefexOne email or SSO",
              "Managers, HOD and HRBP see only their scoped work",
              "HR Admin manages masters, SLA and SSO providers",
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-3 text-sm text-background-100"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                  <i className="ri-checkbox-circle-fill text-primary-300" />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-3 p-10 text-xs text-background-300">
          <i className="ri-shield-check-line text-base" />
          Node.js API · MySQL · RefexOne user master
        </div>
      </div>

      <div className="flex w-full flex-1 flex-col justify-center px-4 py-6 sm:px-6 sm:py-10 md:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden">
            <Logo />
          </div>

          <div className="mt-5 lg:mt-0">
            <Badge tone="progress" icon="ri-shield-user-line">
              Employee & Admin
            </Badge>
            <h2 className="mt-3 font-heading text-xl font-semibold text-foreground-950 sm:mt-4 sm:text-2xl">
              Sign in to continue
            </h2>
            <p className="mt-2 text-sm text-foreground-600">
              Use your work email and password, or continue with SSO.
            </p>
          </div>

          <form className="mt-6 flex flex-col gap-3.5 sm:mt-8 sm:gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-600">
                Email
              </span>
              <input
                type="text"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-11 rounded-lg border border-background-300 bg-background-50 px-3 font-label text-base text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 sm:text-sm"
                placeholder="you@refex.co.in"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-600">
                Password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-11 w-full rounded-lg border border-background-300 bg-background-50 px-3 pr-11 font-label text-base text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 sm:text-sm"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-foreground-500 hover:text-foreground-800"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i
                    className={
                      showPassword ? "ri-eye-off-line text-lg" : "ri-eye-line text-lg"
                    }
                  />
                </button>
              </div>
            </label>

            {error && (
              <p className="rounded-md border border-accent-200 bg-accent-50 px-3 py-2 text-sm text-accent-800">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full">
              Sign in
            </Button>
          </form>

          {providers.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-background-200" />
                <span className="font-label text-xs uppercase tracking-wide text-foreground-500">
                  Or sign in with
                </span>
                <div className="h-px flex-1 bg-background-200" />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                {providers.map((provider) => {
                  const label = provider.displayName?.trim() || provider.provider;
                  const href = `/auth/sso/${encodeURIComponent(provider.provider)}?state=${encodeURIComponent(window.location.origin)}`;
                  return (
                    <a
                      key={provider.provider}
                      href={href}
                      title={label}
                      aria-label={label}
                      className="inline-flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-background-300 bg-background-50 p-0 hover:bg-background-100"
                    >
                      {provider.iconUrl?.trim() ? (
                        <img
                          src={provider.iconUrl}
                          alt=""
                          className="h-7 w-7 object-contain"
                        />
                      ) : (
                        <i className="ri-shield-keyhole-line text-2xl text-primary-600" />
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
