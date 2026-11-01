import type { NextRequest } from "next/server";
export const runtime = "nodejs";
async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (
    path[0] !== "v1" ||
    path.some((part) => part === "." || part === ".." || part.includes("/"))
  )
    return Response.json({ message: "API không hợp lệ" }, { status: 404 });
  const target = new URL(
    `/api/${path.map(encodeURIComponent).join("/")}`,
    process.env.API_ORIGIN || "http://127.0.0.1:4000",
  );
  target.search = request.nextUrl.search;
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        ...(request.headers.get("cookie")
          ? { Cookie: request.headers.get("cookie")! }
          : {}),
        ...(request.headers.get("origin")
          ? { Origin: request.headers.get("origin")! }
          : {}),
      },
      ...(["GET", "HEAD"].includes(request.method)
        ? {}
        : { body: await request.text() }),
      cache: "no-store",
      redirect: "manual",
      signal: request.signal,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
        ...(upstream.headers.get("set-cookie")
          ? { "Set-Cookie": upstream.headers.get("set-cookie")! }
          : {}),
      },
    });
  } catch {
    return Response.json(
      {
        message:
          "Không kết nối được backend. Vui lòng kiểm tra API và thử lại.",
      },
      { status: 503 },
    );
  }
}
export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
};
