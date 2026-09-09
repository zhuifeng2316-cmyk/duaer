/** Always lock cinema stills to the original crop, not a generated or HD redraw. */
export function identityHeadRel(face: { crop?: string; file: string }): string {
  return face.crop || face.file;
}

/** Head twice, plus the source photo. Never append a generated still. */
export function cinemaRefPaths(headAbs: string, sourceAbs?: string | null): string[] {
  if (sourceAbs && sourceAbs !== headAbs) return [headAbs, headAbs, sourceAbs];
  return [headAbs, headAbs];
}
