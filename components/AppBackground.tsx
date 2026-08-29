import { DotPattern } from "@/components/ui/dot-pattern";

// App-wide backdrop: a faint yellow dot grid over the near-black ground
// (--background comes from <body>). Radial mask fades the dots at the edges
// so panels/content stay the focus. Shared across kiosk, login, dashboard and
// admin for one consistent look; safe to mount more than once per page.
export function AppBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <DotPattern
        width={22}
        height={22}
        cx={1}
        cy={1}
        cr={1.3}
        style={{ fill: "var(--accent)", opacity: 0.13 }}
        className="[mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
      />
    </div>
  );
}
