import "server-only";
import { NextResponse } from "next/server";
import { getAuth } from "./server";

export interface AuthGuardSuccess {
  ok: true;
  userEmail: string;
}

export interface AuthGuardFailure {
  ok: false;
  response: NextResponse;
}

export async function requireOwnerSession(): Promise<
  AuthGuardSuccess | AuthGuardFailure
> {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_BYPASS === "true"
  ) {
    return {
      ok: true,
      userEmail: process.env.OWNER_EMAIL || "dev-owner@local",
    };
  }

  try {
    const { data: session } = await getAuth().getSession();
    const user = session?.user;

    if (!user?.email) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "No autenticado. Iniciá sesión para continuar." },
          { status: 401 }
        ),
      };
    }

    const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
    if (ownerEmail && user.email.toLowerCase() !== ownerEmail) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Acceso denegado. Esta aplicación es de uso privado." },
          { status: 403 }
        ),
      };
    }

    return { ok: true, userEmail: user.email };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Error verificando la sesión." },
        { status: 401 }
      ),
    };
  }
}
