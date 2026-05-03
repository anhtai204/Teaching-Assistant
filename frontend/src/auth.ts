import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import authConfig from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { rows } = await db.query(
          "SELECT * FROM users WHERE email = $1",
          [credentials.email]
        );

        const user = rows[0];

        if (user && bcrypt.compareSync(credentials.password as string, user.password_hash)) {
          return {
            id: user.id,
            email: user.email,
            name: user.full_name,
            role: user.role,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      console.log("🔹 Sign-in attempt for:", user.email, "via", account?.provider);
      if (account?.provider === "google") {
        try {
          const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [user.email]);
          if (rows.length === 0) {
            console.log("✨ Creating new OAuth user in DB:", user.email);
            await db.query(
              "INSERT INTO users (email, full_name, role, password_hash) VALUES ($1, $2, $3::user_role, $4)",
              [user.email, user.name, "student", "OAUTH_USER"]
            );
          } else {
            console.log("✅ OAuth user already exists in DB:", user.email);
          }
          return true;
        } catch (error) {
          console.error("❌ Error saving OAuth user:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Initial sign in
        if (account?.provider === "google") {
          const { rows } = await db.query("SELECT id, role FROM users WHERE email = $1", [user.email]);
          if (rows[0]) {
            token.id = rows[0].id;
            token.role = rows[0].role;
          }
        } else {
          token.role = (user as any).role;
          token.id = (user as any).id;
        }
      } else if (token.email && !token.role) {
        // Subsequent sessions
        const { rows } = await db.query("SELECT id, role FROM users WHERE email = $1", [token.email]);
        if (rows[0]) {
          token.role = rows[0].role;
          token.id = rows[0].id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
});
