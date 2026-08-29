import type { Category } from "./queries";

// Mirrors the tokens in app/globals.css — kept as literal hex here because
// chart primitives (conic-gradient / SVG stroke) need real color values, not CSS vars.
// Deliberately off the brand-yellow hue (--primary/--secondary/--accent are
// all gold) so a mood badge or chart segment never gets lost in a wall of
// brand chrome; BADMOOD reuses the app's destructive red since "needs
// follow-up" is the same signal.
export const CATEGORY_COLOR: Record<Category, string> = {
  HAPPY: "#4ade80",
  NETRAL: "#94a3b8",
  BADMOOD: "#f87171",
};

export const CATEGORY_BG: Record<Category, string> = {
  HAPPY: "rgba(74, 222, 128, 0.14)",
  NETRAL: "rgba(148, 163, 184, 0.14)",
  BADMOOD: "rgba(248, 113, 113, 0.14)",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  HAPPY: "Happy",
  NETRAL: "Netral",
  BADMOOD: "Badmood",
};
