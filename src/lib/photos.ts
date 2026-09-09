export const MAX_PHOTOS = 8;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const ALLOWED_PHOTO_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export function extForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  return "jpg";
}

export function assertPhoto(file: File): void {
  if (!ALLOWED_PHOTO_MIME.has(file.type.toLowerCase())) {
    throw new Error("只要 jpg / png / webp");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("单张照片不能超过 8MB");
  }
}
