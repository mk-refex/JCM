import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "@/components/feature/Logo";
import { Badge } from "@/components/base/Badge";
import Button from "@/components/base/Button";
import { useApp } from "@/store/AppContext";
import {
  ApiError,
  fetchPublicSsoProviders,
  requestLoginOtp,
  verifyLoginOtp,
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

type Step = "email" | "otp";

export default function Login() {
  const { loginWithToken, currentUser, authReady } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [providers, setProviders] = useState<PublicSsoProvider[]>([]);
  const otpInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "otp") {
      window.setTimeout(() => otpInputRef.current?.focus(), 50);
    }
  }, [step]);

  if (authReady && currentUser) {
    return <Navigate to={homePathFor(currentUser.role)} replace />;
  }

  const sendOtp = async (targetEmail: string) => {
    const result = await requestLoginOtp(targetEmail);
    setEmail(result.email);
    setMaskedEmail(result.maskedEmail);
    setStep("otp");
    setOtp("");
    setCooldown(45);
    setInfo(`We sent a 6-digit code to ${result.maskedEmail}.`);
  };

  const handleRequestOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);
    try {
      await sendOtp(email.trim());
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not send the sign-in code. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await verifyLoginOtp(email.trim(), otp.trim());
      const session = await loginWithToken(result.token, result.user);
      navigate(session.redirectTo || homePathFor(session.user.role), {
        replace: true,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not verify the code. Please try again.";
      setError(message);
      if (
        err instanceof ApiError &&
        /expired|new one-time code|No active code/i.test(err.message)
      ) {
        setCooldown(0);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setError("");
    setResending(true);
    try {
      await sendOtp(email.trim());
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not resend the code. Please try again.",
      );
    } finally {
      setResending(false);
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
            Sign in to continue your Role Clarity Review and keep role
            expectations aligned across the organisation.
          </p>
          <ul className="mt-8 flex flex-col gap-3">
            {[
              "Complete your Initial Role Clarity Check and self assessment",
              "Managers, HOD and HRBP work only on their scoped cases",
              "Track alignment, conversations and final HOD sign-off",
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
          Secure organisational sign-in for Refex Group
        </div>
      </div>

      <div className="flex w-full flex-1 flex-col justify-center px-4 py-6 sm:px-6 sm:py-10 md:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden">
            <Logo />
          </div>

          <div className="mt-5 lg:mt-0">
            <Badge tone="progress" icon="ri-shield-user-line">
              Employee &amp; Leadership
            </Badge>
            <h2 className="mt-3 font-heading text-xl font-semibold text-foreground-950 sm:mt-4 sm:text-2xl">
              {step === "email" ? "Sign in to continue" : "Enter verification code"}
            </h2>
            <p className="mt-2 text-sm text-foreground-600">
              {step === "email"
                ? "Enter your work email. We’ll send a one-time code if your account is registered."
                : `Enter the 6-digit code sent to ${maskedEmail || "your email"}.`}
            </p>
          </div>

          {error && (
            <p className="mt-6 rounded-md border border-accent-200 bg-accent-50 px-3 py-2 text-sm text-accent-800">
              {error}
            </p>
          )}
          {!error && info && (
            <p className="mt-6 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-800">
              {info}
            </p>
          )}

          {step === "email" ? (
            <form
              className="mt-6 flex flex-col gap-4 sm:mt-8"
              onSubmit={(event) => void handleRequestOtp(event)}
            >
              <label className="flex flex-col gap-1.5">
                <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-600">
                  Work email
                </span>
                <input
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoFocus
                  className="h-11 rounded-lg border border-background-300 bg-background-50 px-3 font-label text-base text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 sm:text-sm"
                  placeholder="you@refex.co.in"
                />
              </label>
              <Button
                type="submit"
                size="lg"
                loading={submitting}
                className="w-full"
              >
                Continue
              </Button>
            </form>
          ) : (
            <form
              className="mt-6 flex flex-col gap-4 sm:mt-8"
              onSubmit={(event) => void handleVerifyOtp(event)}
            >
              <label className="flex flex-col gap-1.5">
                <span className="font-label text-xs font-semibold uppercase tracking-wide text-foreground-600">
                  One-time code
                </span>
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  className="h-12 rounded-lg border border-background-300 bg-background-50 px-3 text-center font-label text-2xl font-semibold tracking-[0.35em] text-foreground-900 placeholder:text-foreground-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  placeholder="••••••"
                />
              </label>
              <Button
                type="submit"
                size="lg"
                loading={submitting}
                disabled={otp.length !== 6}
                className="w-full"
              >
                Verify and sign in
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <button
                  type="button"
                  className="cursor-pointer font-medium text-foreground-600 hover:text-foreground-900"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setError("");
                    setInfo("");
                  }}
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || resending}
                  className="cursor-pointer font-medium text-primary-700 hover:text-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => void handleResend()}
                >
                  {resending
                    ? "Sending…"
                    : cooldown > 0
                      ? `Resend in ${cooldown}s`
                      : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {providers.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-background-200" />
                <span className="font-label text-xs font-medium uppercase tracking-wide text-foreground-400">
                  OR
                </span>
                <div className="h-px flex-1 bg-background-200" />
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                {providers.map((provider) => {
                  const label = provider.displayName?.trim() || provider.provider;
                  const href = `/auth/sso/${encodeURIComponent(provider.provider)}?state=${encodeURIComponent(window.location.origin)}`;
                  return (
                    <a
                      key={provider.provider}
                      href={href}
                      className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-background-300 bg-background-50 px-4 font-label text-sm font-medium text-foreground-900 hover:bg-background-100"
                    >
                      {provider.iconUrl?.trim() ? (
                        <img
                          src={provider.iconUrl}
                          alt=""
                          className="h-5 w-5 shrink-0 object-contain"
                        />
                      ) : (
                        <i className="ri-shield-keyhole-line shrink-0 text-lg text-primary-600" />
                      )}
                      <span>Sign in with {label}</span>
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
