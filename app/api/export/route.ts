import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createExport, serialiseExport } from "@/lib/export/build-export";

/**
 * GET /api/export
 *
 * Streams the signed-in user's complete data set as a JSON download.
 *
 * SECURITY
 *  - The identity comes from the session cookie, never from a parameter. There
 *    is no `userId` query string, so this endpoint cannot be pointed at another
 *    account.
 *  - `Cache-Control: no-store` is also set globally for /api/* in next.config.ts;
 *    it is repeated here so the guarantee travels with the handler.
 *  - The filename is generated server-side from the current date, so nothing
 *    user-supplied reaches the Content-Disposition header (no header injection).
 *
 * The export builder excludes every credential and cryptographic artefact;
 * see lib/export/build-export.ts.
 */
export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await createExport(user.id);

  if (!result) {
    return NextResponse.json(
      { error: "Account not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return new NextResponse(serialiseExport(result.payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
