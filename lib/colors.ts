import type { Category } from "./queries";

// Mirrors the tokens in app/globals.css — kept as literal hex here because
// chart primitives (conic-gradient / SVG stroke) need real color values, not CSS vars.
export const CATEGORY_COLOR: Record<Category, string> = {
  HAPPY: "#34d399",
  NETRAL: "#fbbf24",
  BADMOOD: "#fb923c",
};

export const CATEGORY_BG: Record<Category, string> = {
  HAPPY: "rgba(52, 211, 153, 0.14)",
  NETRAL: "rgba(251, 191, 36, 0.14)",
  BADMOOD: "rgba(251, 146, 60, 0.14)",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  HAPPY: "Happy",
  NETRAL: "Netral",
  BADMOOD: "Badmood",
};
