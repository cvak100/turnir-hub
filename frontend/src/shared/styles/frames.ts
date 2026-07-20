/**
 * Sketch border frames — ONLY these classes draw borders.
 * Pair: "border-frame border-frame--{sm|md|lg|xl}"
 */
export const FRAME = {
  sm: "border-frame border-frame--sm",
  md: "border-frame border-frame--md",
  lg: "border-frame border-frame--lg",
  xl: "border-frame border-frame--xl",
} as const;

export type FrameSize = keyof typeof FRAME;
