import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Logo from "@/components/feature/Logo";
import { Badge } from "@/components/base/Badge";
import Button from "@/components/base/Button";
import { useApp } from "@/store/AppContext";
import { ApiError } from "@/services/api";
import { homePathFor } from "@/lib/utils";

export default function DeveloperLogin() {
  const { login, currentUser, authReady } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (authReady && currentUser) {
    return <Navigate to={homePathFor(currentUser.role)} replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const session = await login(email.trim(), password);
      navigate(session.redirectTo || homePathFor(session.user.role), {
        replace: true,
      });
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
            Developer sign-in
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-background-200">
            Email and password access for development and internal testing. The
            main login page uses organisation SSO only.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 p-10 text-xs text-background-300">
          <i className="ri-code-s-slash-line text-base" />
          Internal use — not for employee sign-in
        </div>
      </div>

      <div className="flex w-full flex-1 flex-col justify-center px-4 py-6 sm:px-6 sm:py-10 md:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden">
            <Logo />
          </div>

          <div className="mt-5 lg:mt-0">
            <Badge tone="warning" icon="ri-code-box-line">
              Developer login
            </Badge>
            <h2 className="mt-3 font-heading text-xl font-semibold text-foreground-950 sm:mt-4 sm:text-2xl">
              Sign in with email
            </h2>
            <p className="mt-2 text-sm text-foreground-600">
              Use an admin or test account password. Employees should use{" "}
              <Link
                to="/login"
                className="font-medium text-primary-700 hover:underline"
              >
                SSO sign-in
              </Link>
              .
            </p>
          </div>

          <form
            className="mt-6 flex flex-col gap-3.5 sm:mt-8 sm:gap-4"
            onSubmit={handleSubmit}
          >
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
                      showPassword
                        ? "ri-eye-off-line text-lg"
                        : "ri-eye-line text-lg"
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

            <Button
              type="submit"
              size="lg"
              loading={submitting}
              className="mt-2 w-full"
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
