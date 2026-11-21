import { getAuth } from "@/lib/auth/server";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

let _handlers: ReturnType<ReturnType<typeof getAuth>["handler"]> | null = null;

function getHandlers() {
  if (!_handlers) {
    _handlers = getAuth().handler();
  }
  return _handlers;
}

export async function GET(req: Request, ctx: RouteContext) {
  return getHandlers().GET(req, ctx);
}

export async function POST(req: Request, ctx: RouteContext) {
  return getHandlers().POST(req, ctx);
}

export async function PUT(req: Request, ctx: RouteContext) {
  return getHandlers().PUT(req, ctx);
}

export async function DELETE(req: Request, ctx: RouteContext) {
  return getHandlers().DELETE(req, ctx);
}

export async function PATCH(req: Request, ctx: RouteContext) {
  return getHandlers().PATCH(req, ctx);
}

