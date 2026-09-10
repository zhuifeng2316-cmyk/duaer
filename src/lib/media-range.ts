import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { NextResponse } from "next/server";

/** Parse `Range: bytes=…` for a file of `size` bytes. */
export function parseByteRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header || size <= 0) return null;
  const m = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!m) return null;
  const hasStart = m[1] !== "";
  const hasEnd = m[2] !== "";
  if (!hasStart && !hasEnd) return null;
  let start: number;
  let end: number;
  if (!hasStart) {
    const suffix = Number(m[2]);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = hasEnd ? Number(m[2]) : size - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || start > end) return null;
  return { start, end: Math.min(end, size - 1) };
}

/** Stream a project/voice media file with Content-Length and optional 206 Range. */
export async function mediaFileResponse(
  abs: string,
  req: Request,
  contentType: string,
  cacheControl = "private, no-store",
): Promise<NextResponse> {
  const st = await stat(abs);
  const size = st.size;
  const range = parseByteRange(req.headers.get("range"), size);
  const base = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl,
  };

  if (!range) {
    const stream = createReadStream(abs);
    return new NextResponse(Readable.toWeb(stream) as unknown as ReadableStream, {
      status: 200,
      headers: { ...base, "Content-Length": String(size) },
    });
  }

  const { start, end } = range;
  const length = end - start + 1;
  const stream = createReadStream(abs, { start, end });
  return new NextResponse(Readable.toWeb(stream) as unknown as ReadableStream, {
    status: 206,
    headers: {
      ...base,
      "Content-Length": String(length),
      "Content-Range": `bytes ${start}-${end}/${size}`,
    },
  });
}
