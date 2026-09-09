import { upscaleHead } from "./head-crop";

/**
 * HD is a retouch of the original crop pixels.
 * Do not send the head to an image model — those APIs redraw a new face.
 */
export async function retouchHead(src: string, dest: string): Promise<void> {
  await upscaleHead(src, dest);
}
