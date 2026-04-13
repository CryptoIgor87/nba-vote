import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/auth/signin",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "USER";
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminPath = nextUrl.pathname.startsWith("/admin");
      const isAuthPath = nextUrl.pathname.startsWith("/auth");
      const isApiPath = nextUrl.pathname.startsWith("/api");

      const isHome = nextUrl.pathname === "/";
      if (isApiPath || isAuthPath || isHome) return true;

      if (isAdminPath) {
        if (!isLoggedIn)
          return Response.redirect(new URL("/auth/signin", nextUrl));
        const isAdmin =
          (auth?.user as { role?: string })?.role === "ADMIN";
        if (!isAdmin) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      if (!isLoggedIn)
        return Response.redirect(new URL("/auth/signin", nextUrl));

      return true;
    },
  },
};
