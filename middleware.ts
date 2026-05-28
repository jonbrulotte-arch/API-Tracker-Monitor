import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Let public routes and auth callbacks through unconditionally
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/pending") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/.well-known")
  ) {
    return NextResponse.next();
  }

  // Block disabled accounts
  if (req.auth?.user?.status === "DISABLED") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Block pending accounts from everything except their waiting room
  if (req.auth?.user?.status === "PENDING") {
    if (pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Account pending approval" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    return NextResponse.redirect(new URL("/pending", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
