import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import NextAuth from "next-auth";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

export default async function middleware(request: NextRequest) {
  // Refresh Supabase session
  const supabaseResponse = await updateSession(request)
  
  // Run NextAuth auth middleware
  return auth(async (req) => {
    return supabaseResponse
  })(request, {} as any)
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
