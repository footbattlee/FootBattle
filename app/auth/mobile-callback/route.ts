import { NextResponse } from "next/server";

function mobileCallbackUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const callback = new URL("footbattle://auth/callback");

  for (const key of ["code", "error", "error_code", "error_description"]) {
    const value = requestUrl.searchParams.get(key);
    if (value) callback.searchParams.set(key, value);
  }

  return callback.toString();
}

export async function GET(request: Request) {
  return NextResponse.redirect(mobileCallbackUrl(request), 302);
}
