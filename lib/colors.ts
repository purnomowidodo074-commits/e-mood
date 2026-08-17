import type { Category } from "./queries";

// Mirrors the tokens in app/globals.css — kept as literal hex here because
// chart primitives (conic-gradient / SVG stroke) need real color values, not CSS vars.
export const CATEGORY_COLOR: Record<Category, string> = {
  HAPPY: "#059669",
  NETRAL: "#d97706",
  BADMOOD: "#ea580c",
};

export const CATEGORY_BG: Record<Category, string> = {
  HAPPY: "#ecfdf5",
  NETRAL: "#fffbeb",
  BADMOOD: "#fff7ed",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  HAPPY: "Happy",
  NETRAL: "Netral",
  BADMOOD: "Badmood",
};
