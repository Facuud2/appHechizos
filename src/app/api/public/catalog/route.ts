import { NextRequest, NextResponse } from "next/server";
import {
  buildPublicCatalogCorsHeaders,
  getPublicCatalog,
} from "@/lib/public-catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function OPTIONS(req: NextRequest) {
  const headers = buildPublicCatalogCorsHeaders(req.headers.get("origin"));
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(req: NextRequest) {
  const headers = buildPublicCatalogCorsHeaders(req.headers.get("origin"));
  try {
    const catalog = await getPublicCatalog();
    return NextResponse.json(catalog, { status: 200, headers });
  } catch (err) {
    console.error("[public/catalog] error:", err);
    return NextResponse.json(
      { error: "No se pudo cargar el catálogo público." },
      { status: 500, headers }
    );
  }
}
