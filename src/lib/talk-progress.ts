export const PRODUCE_STEPS = [
  { phase: "images", label: "出图" },
  { phase: "speech", label: "口播" },
  { phase: "music", label: "配乐" },
  { phase: "html", label: "合成稿" },
  { phase: "assemble", label: "成片" },
  { phase: "cover", label: "封面" },
] as const;

export function isProduceDockPhase(phase: string): boolean {
  return PRODUCE_STEPS.some((step) => step.phase === phase);
}

export function produceStepIndex(phase: string): number {
  return PRODUCE_STEPS.findIndex((step) => step.phase === phase);
}
