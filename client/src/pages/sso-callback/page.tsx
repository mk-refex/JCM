import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "@/store/AppContext";
import { homePathFor } from "@/lib/utils";
import type { User } from "@/types/domain";

export default function SsoCallbackPage() {
  const { loginWithToken } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const userDataStr = searchParams.get("user_data");

  useEffect(() => {
    if (!token || !userDataStr) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const userData = JSON.parse(decodeURIComponent(userDataStr)) as User;
      void loginWithToken(token, userData)
        .then((session) => {
          navigate(session.redirectTo || homePathFor(session.user.role), {
            replace: true,
          });
        })
        .catch(() => {
          navigate("/login", { replace: true });
        });
    } catch {
      navigate("/login", { replace: true });
    }
  }, [token, userDataStr, loginWithToken, navigate]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background-50 px-4">
      <i className="ri-loader-4-line animate-spin text-2xl text-primary-600" />
      <p className="font-label text-sm text-foreground-600">Signing you in…</p>
    </div>
  );
}
