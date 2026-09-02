// Three bouncing dots, brand-yellow. CSS-only (project animates with GSAP/CSS,
// not framer-motion) so it stays a server-safe component with no deps.
// Keyframes + .loader-one-dot live in app/globals.css.

const LoaderOne = () => {
  return (
    <div className="flex items-center justify-center gap-1.5" role="status" aria-label="Memuat">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="loader-one-dot h-3 w-3 rounded-full bg-primary"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
};

export default LoaderOne;
