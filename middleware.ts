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

  // Redirect any session belonging to a disabled account
  if (req.auth?.user?.status === "DISABLED") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
