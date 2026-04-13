import { signIn } from "@/lib/auth";

export const metadata = {
  title: "Войти - NBA Predictions",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const rawCallback = sp.callbackUrl ?? "/predictions";
  const callbackUrl =
    rawCallback.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : "/predictions";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-2xl mb-4 shadow-2xl shadow-accent/25">
            <span className="text-white font-black text-xl font-display">NBA</span>
          </div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Predictions</h1>
          <p className="text-muted mt-1 text-sm">
            Прогнозы на плей-офф с друзьями
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border">
          {sp.error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium">
              Ошибка входа. Попробуйте ещё раз.
            </div>
          )}

          <div className="space-y-3">
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: callbackUrl });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border border-border hover:border-muted bg-surface hover:bg-card-hover transition-all text-foreground font-semibold cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Войти через Google
              </button>
            </form>

            <form
              action={async () => {
                "use server";
                await signIn("yandex", { redirectTo: callbackUrl });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-[#FC3F1D] hover:bg-[#e03519] transition-all text-white font-semibold cursor-pointer"
              >
                <span className="w-5 h-5 flex items-center justify-center font-black text-base leading-none">Я</span>
                Войти через Яндекс
              </button>
            </form>
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-muted">
          Войдите чтобы делать прогнозы и соревноваться с друзьями
        </p>
      </div>
    </div>
  );
}
