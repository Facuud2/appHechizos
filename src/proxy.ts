import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";

let _authMiddleware: ReturnType<ReturnType<typeof getAuth>["middleware"]> | null =
  null;

function getAuthMiddleware() {
  if (!_authMiddleware) {
    _authMiddleware = getAuth().middleware({
      loginUrl: "/auth/sign-in",
      publicRoutes: [
        "/api/public",
        "/manifest.webmanifest",
        "/sw.js",
        "/icon.svg",
        "/icon-192.png",
        "/icon-512.png",
        "/icon-maskable-512.png",
        "/apple-touch-icon.png",
      ],
    });
  }
  return _authMiddleware;
}

export default function proxy(req: NextRequest) {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_BYPASS === "true"
  ) {
    return NextResponse.next();
  }
  return getAuthMiddleware()(req);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|icon.*\\.png|icon\\.svg|apple-touch-icon\\.png).*)",
  ],
};

