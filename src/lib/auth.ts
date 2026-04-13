import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Yandex from "next-auth/providers/yandex";
import { SupabaseAdapter } from "./auth-adapter";
import { authConfig } from "./auth.config";
import { supabase } from "./supabase";

const ROLE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: SupabaseAdapter(),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Yandex({
      clientId: process.env.AUTH_YANDEX_ID!,
      clientSecret: process.env.AUTH_YANDEX_SECRET!,
      authorization: "https://oauth.yandex.ru/authorize?scope=login:email+login:info+login:avatar",
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) {
        const { data: dbUser } = await supabase
          .from("nba_users")
          .select("role")
          .eq("id", user.id)
          .single();
        token.role = dbUser?.role ?? "USER";
        token.id = user.id;
        token.roleCheckedAt = Date.now();
        return token;
      }

      const lastChecked = (token.roleCheckedAt as number) || 0;
      if (token.id && Date.now() - lastChecked > ROLE_REFRESH_INTERVAL_MS) {
        const { data: dbUser } = await supabase
          .from("nba_users")
          .select("role")
          .eq("id", token.id as string)
          .single();
        if (dbUser) {
          token.role = dbUser.role;
        }
        token.roleCheckedAt = Date.now();
      }

      return token;
    },
  },
});
