import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

const authMiddleware = auth.middleware({
  loginUrl: "/auth/sign-in",
  publicRoutes: ["/api/public", "/manifest.webmanifest"],
});

export default function proxy(req: NextRequest) {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_BYPASS === "true"
  ) {
    return NextResponse.next();
  }
  return authMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
};
