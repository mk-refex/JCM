import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "@/store/AppContext";
import { homePathFor } from "@/lib/utils";
import type { User } from "@/types/domain";

export default function SsoCallbackPage() {
  const { loginWithToken, currentUser, authReady } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const rawUser = searchParams.get("user_data");
    if (!token) {
      setError("Missing SSO token.");
      return;
    }

    let user: User | null = null;
    if (rawUser) {
      try {
        user = JSON.parse(rawUser) as User;
      } catch {
        user = null;
      }
    }

    void loginWithToken(token, user)
      .then((session) => {
        navigate(session.redirectTo || homePathFor(session.user.role), {
          replace: true,
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "SSO sign-in failed.");
      });
  }, [loginWithToken, navigate, searchParams]);

  if (authReady && currentUser && !error) {
    return <Navigate to={homePathFor(currentUser.role)} replace />;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-background-200 bg-background-50 p-6 text-center">
        {error ? (
          <>
            <p className="font-heading text-lg font-semibold text-foreground-950">
              SSO sign-in failed
            </p>
            <p className="mt-2 text-sm text-foreground-600">{error}</p>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-lg bg-primary-500 px-4 py-2 font-label text-sm font-medium text-white"
            >
              Back to login
            </button>
          </>
        ) : (
          <>
            <i className="ri-loader-4-line animate-spin text-2xl text-primary-600" />
            <p className="mt-3 font-label text-sm text-foreground-700">
              Completing SSO sign-in…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
