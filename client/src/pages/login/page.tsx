import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import Logo from "@/components/feature/Logo";
import { Badge } from "@/components/base/Badge";
import { useApp } from "@/store/AppContext";
import {
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
  const { currentUser, authReady } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
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
              Sign in to continue
            </h2>
            <p className="mt-2 text-sm text-foreground-600">
              Use your organisation account to access Job Clarity.
            </p>
          </div>

          {error && (
            <p className="mt-6 rounded-md border border-accent-200 bg-accent-50 px-3 py-2 text-sm text-accent-800">
              {error}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-2.5">
            {providers.length === 0 ? (
              <p className="rounded-md border border-background-200 bg-background-100 px-3 py-3 text-sm text-foreground-600">
                SSO is not configured yet. Please contact HR Admin.
              </p>
            ) : (
              providers.map((provider) => {
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
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
