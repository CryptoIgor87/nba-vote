import type { Adapter, AdapterUser, AdapterAccount, AdapterSession } from "next-auth/adapters";
import { supabase } from "./supabase";

export function SupabaseAdapter(): Adapter {
  return {
    async createUser(user) {
      // First user becomes admin
      const { count } = await supabase
        .from("nba_users")
        .select("*", { count: "exact", head: true });

      const role = count === 0 ? "ADMIN" : "USER";

      const { data, error } = await supabase
        .from("nba_users")
        .insert({
          email: user.email,
          name: user.name,
          image: user.image,
          email_verified: user.emailVerified?.toISOString(),
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return toAdapterUser(data);
    },

    async getUser(id) {
      const { data } = await supabase
        .from("nba_users")
        .select()
        .eq("id", id)
        .single();
      return data ? toAdapterUser(data) : null;
    },

    async getUserByEmail(email) {
      const { data } = await supabase
        .from("nba_users")
        .select()
        .eq("email", email)
        .single();
      return data ? toAdapterUser(data) : null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const { data: account } = await supabase
        .from("nba_accounts")
        .select("user_id")
        .eq("provider", provider)
        .eq("provider_account_id", providerAccountId)
        .single();

      if (!account) return null;

      const { data: user } = await supabase
        .from("nba_users")
        .select()
        .eq("id", account.user_id)
        .single();

      return user ? toAdapterUser(user) : null;
    },

    async updateUser(user) {
      const { data, error } = await supabase
        .from("nba_users")
        .update({
          name: user.name,
          email: user.email,
          image: user.image,
          email_verified: user.emailVerified?.toISOString(),
        })
        .eq("id", user.id!)
        .select()
        .single();

      if (error) throw error;
      return toAdapterUser(data);
    },

    async deleteUser(userId) {
      await supabase.from("nba_users").delete().eq("id", userId);
    },

    async linkAccount(account) {
      await supabase.from("nba_accounts").insert({
        user_id: account.userId,
        type: account.type,
        provider: account.provider,
        provider_account_id: account.providerAccountId,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state as string,
      });
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await supabase
        .from("nba_accounts")
        .delete()
        .eq("provider", provider)
        .eq("provider_account_id", providerAccountId);
    },

    async createSession(session) {
      const { data, error } = await supabase
        .from("nba_sessions")
        .insert({
          session_token: session.sessionToken,
          user_id: session.userId,
          expires: session.expires.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return toAdapterSession(data);
    },

    async getSessionAndUser(sessionToken) {
      const { data: session } = await supabase
        .from("nba_sessions")
        .select()
        .eq("session_token", sessionToken)
        .single();

      if (!session) return null;

      const { data: user } = await supabase
        .from("nba_users")
        .select()
        .eq("id", session.user_id)
        .single();

      if (!user) return null;

      return {
        session: toAdapterSession(session),
        user: toAdapterUser(user),
      };
    },

    async updateSession(session) {
      const { data, error } = await supabase
        .from("nba_sessions")
        .update({
          expires: session.expires?.toISOString(),
        })
        .eq("session_token", session.sessionToken)
        .select()
        .single();

      if (error) throw error;
      return toAdapterSession(data);
    },

    async deleteSession(sessionToken) {
      await supabase
        .from("nba_sessions")
        .delete()
        .eq("session_token", sessionToken);
    },

    async createVerificationToken(token) {
      const { data, error } = await supabase
        .from("nba_verification_tokens")
        .insert({
          identifier: token.identifier,
          token: token.token,
          expires: token.expires.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async useVerificationToken({ identifier, token }) {
      const { data } = await supabase
        .from("nba_verification_tokens")
        .delete()
        .eq("identifier", identifier)
        .eq("token", token)
        .select()
        .single();

      return data;
    },
  };
}

function toAdapterUser(data: Record<string, unknown>): AdapterUser {
  return {
    id: data.id as string,
    email: data.email as string,
    name: data.name as string | null,
    image: data.image as string | null,
    emailVerified: data.email_verified
      ? new Date(data.email_verified as string)
      : null,
    role: data.role as string,
  } as AdapterUser;
}

function toAdapterSession(data: Record<string, unknown>): AdapterSession {
  return {
    sessionToken: data.session_token as string,
    userId: data.user_id as string,
    expires: new Date(data.expires as string),
  };
}
