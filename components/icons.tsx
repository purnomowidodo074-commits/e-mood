// Hand-authored outline icon set — one stroke family (1.75, round caps/joins)
// across the whole app. No emoji, no icon-font glyphs (craft-floor rule).
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </Svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-4.14 3.36-7 7.5-7s7.5 2.86 7.5 7" />
    </Svg>
  );
}

export function IconScanFrame(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" />
      <path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" />
      <path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" />
      <path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <path d="M4.5 12h15" strokeDasharray="1.5 3" />
    </Svg>
  );
}

export function IconKeypad(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="6" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="6" cy="18" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 12H5" />
      <path d="M11 18l-6-6 6-6" />
    </Svg>
  );
}

export function IconBackspace(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 4h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H9l-6.5-7.3a1 1 0 0 1 0-1.4L9 4z" />
      <path d="M13.5 9.5l5 5M18.5 9.5l-5 5" />
    </Svg>
  );
}

export function IconFaceHappy(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8" />
      <path d="M8.5 9.5h.01M15.5 9.5h.01" strokeWidth={2.4} />
    </Svg>
  );
}

export function IconFaceNeutral(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5h7" />
      <path d="M8.5 9.5h.01M15.5 9.5h.01" strokeWidth={2.4} />
    </Svg>
  );
}

export function IconFaceSad(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 15.8c.9-1.2 2.1-1.8 3.5-1.8s2.6.6 3.5 1.8" />
      <path d="M8.5 9.5h.01M15.5 9.5h.01" strokeWidth={2.4} />
    </Svg>
  );
}

export function IconLogOut(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Svg>
  );
}

export function IconCamera(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8a1 1 0 0 1 1-1h2.2l1-1.6A1 1 0 0 1 9 5h6a1 1 0 0 1 .86.4L17 7h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8z" />
      <circle cx="12" cy="13" r="3.5" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
      <path d="M16 8.2a3.25 3.25 0 1 1 2.4 5.4" />
      <path d="M15.5 14.3c2.9.4 5 2.6 5 5.7" />
    </Svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

export function IconUserCog(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9.5" cy="7.5" r="3.25" />
      <path d="M3 20c0-3.3 2.9-5.8 6.5-5.8" />
      <circle cx="17.5" cy="16.5" r="2.6" />
      <path d="M17.5 12.3v1.1M17.5 19.6v1.1M21.2 14.4l-.95.55M14.75 18.05l-.95.55M21.2 18.6l-.95-.55M14.75 15l-.95-.55" />
    </Svg>
  );
}

export function IconLayoutDashboard(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="8" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.5" />
      <rect x="13.5" y="10.5" width="7" height="10" rx="1.5" />
      <rect x="3.5" y="13" width="8" height="7.5" rx="1.5" />
    </Svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.6-4.6" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconRotateCcw(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.9-6.4" />
      <path d="M3.5 4.5v4.5h4.5" />
    </Svg>
  );
}

export function IconAlertTriangle(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5l9.5 16.5H2.5L12 3.5z" strokeLinejoin="round" />
      <path d="M12 10v4" />
      <path d="M12 17.2h.01" strokeWidth={2.6} />
    </Svg>
  );
}
