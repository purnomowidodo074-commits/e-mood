"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

// Layered "3D-feeling" backdrop without WebGL: drifting gradient blobs, a
// perspective floor grid, and a few floating glossy orbs (same glass-sphere
// trick as the mood-result emoji badge). All CSS + GSAP — cheap on a kiosk
// PC with no GPU (PRD 8.5), no network-loaded scene, no new render engine.
export function KioskBackground() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.to(".kiosk-bg-blob-1", { x: 60, y: 40, duration: 22, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".kiosk-bg-blob-2", { x: -50, y: -30, duration: 26, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".kiosk-bg-blob-3", { x: 40, y: -50, duration: 30, repeat: -1, yoyo: true, ease: "sine.inOut" });

      gsap.utils.toArray<HTMLElement>(".kiosk-bg-orb").forEach((orb, i) => {
        gsap.to(orb, {
          y: -18,
          duration: 3 + i * 0.6,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.4,
        });
      });
    },
    { scope }
  );

  return (
    <div ref={scope} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* photo base layer, desaturated then re-tinted yellow via color-blend
          (reliable regardless of the source image's own hue, no hue-rotate guesswork) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/0e2dbea0-c0a9-413f-a57b-af279633c0df_3840w.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-60 grayscale"
      />
      <div className="absolute inset-0" style={{ background: "var(--accent)", mixBlendMode: "color", opacity: 0.6 }} />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />

      {/* drifting gradient blobs */}
      <div
        className="kiosk-bg-blob-1 absolute -top-40 left-[10%] h-96 w-96 rounded-full opacity-[0.18] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
      />
      <div
        className="kiosk-bg-blob-2 absolute top-1/3 right-[8%] h-80 w-80 rounded-full opacity-[0.14] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--secondary), transparent 70%)" }}
      />
      <div
        className="kiosk-bg-blob-3 absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full opacity-[0.12] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
      />

      {/* perspective floor grid — the "3D" cue */}
      <div
        className="absolute inset-x-0 bottom-0 h-72 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          transform: "perspective(500px) rotateX(62deg)",
          transformOrigin: "bottom",
          maskImage: "linear-gradient(to top, black, transparent)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent)",
        }}
      />

      {/* a few floating glossy orbs, same material as the mood-result badge */}
      {[
        { color: "var(--primary)", top: "18%", left: "16%", size: 22 },
        { color: "var(--accent)", top: "62%", left: "82%", size: 16 },
        { color: "var(--secondary)", top: "74%", left: "22%", size: 14 },
      ].map((o, i) => (
        <span
          key={i}
          className="kiosk-bg-orb absolute rounded-full"
          style={{
            top: o.top,
            left: o.left,
            width: o.size,
            height: o.size,
            background: `radial-gradient(circle at 32% 26%, rgba(255,255,255,0.9), rgba(255,255,255,0) 45%), ${o.color}`,
            boxShadow: `0 8px 20px -6px ${o.color}`,
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}
