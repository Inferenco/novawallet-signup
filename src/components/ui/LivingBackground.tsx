import { useEffect, useRef } from "react";

export function LivingBackground() {
  const blob1Ref = useRef<HTMLDivElement>(null);
  const blob2Ref = useRef<HTMLDivElement>(null);
  const blob3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate blobs using Web Animations API for guaranteed animation
    const blob1 = blob1Ref.current;
    const blob2 = blob2Ref.current;
    const blob3 = blob3Ref.current;

    if (!blob1 || !blob2 || !blob3) return;

    // Blob 1: Blue - moves and scales
    blob1.animate(
      [
        { transform: "translate(0, 0) scale(1)" },
        { transform: "translate(10vw, 8vh) scale(1.15)" },
        { transform: "translate(-5vw, 5vh) scale(1)" },
        { transform: "translate(5vw, -5vh) scale(1.1)" },
        { transform: "translate(0, 0) scale(1)" },
      ],
      {
        duration: 25000,
        iterations: Infinity,
        easing: "ease-in-out",
      }
    );

    // Blob 2: Cyan - moves and scales
    blob2.animate(
      [
        { transform: "translate(0, 0) scale(1)" },
        { transform: "translate(-12vw, -10vh) scale(1.2)" },
        { transform: "translate(8vw, -5vh) scale(1)" },
        { transform: "translate(-5vw, 8vh) scale(1.15)" },
        { transform: "translate(0, 0) scale(1)" },
      ],
      {
        duration: 28000,
        iterations: Infinity,
        easing: "ease-in-out",
      }
    );

    // Blob 3: Violet - moves and scales
    blob3.animate(
      [
        { transform: "translate(0, 0) scale(1)" },
        { transform: "translate(8vw, 15vh) scale(1.25)" },
        { transform: "translate(-10vw, -8vh) scale(1)" },
        { transform: "translate(5vw, -10vh) scale(1.2)" },
        { transform: "translate(0, 0) scale(1)" },
      ],
      {
        duration: 31000,
        iterations: Infinity,
        easing: "ease-in-out",
      }
    );
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {/* Blob 1: Blue - Top right */}
      <div
        ref={blob1Ref}
        style={{
          position: "absolute",
          width: "min(70vw, 700px)",
          height: "min(70vw, 700px)",
          borderRadius: "50%",
          background: "var(--nova-blue, #3D7AFF)",
          filter: "blur(120px)",
          opacity: 0.2,
          top: "-15%",
          right: "-10%",
          willChange: "transform",
        }}
      />
      {/* Blob 2: Cyan - Bottom right */}
      <div
        ref={blob2Ref}
        style={{
          position: "absolute",
          width: "min(60vw, 600px)",
          height: "min(60vw, 600px)",
          borderRadius: "50%",
          background: "var(--nova-cyan, #22E8FF)",
          filter: "blur(120px)",
          opacity: 0.2,
          bottom: "-10%",
          right: "-5%",
          willChange: "transform",
        }}
      />
      {/* Blob 3: Violet - Center left */}
      <div
        ref={blob3Ref}
        style={{
          position: "absolute",
          width: "min(50vw, 500px)",
          height: "min(50vw, 500px)",
          borderRadius: "50%",
          background: "var(--nova-violet, #8B5CF6)",
          filter: "blur(120px)",
          opacity: 0.2,
          top: "40%",
          left: "-5%",
          willChange: "transform",
        }}
      />
    </div>
  );
}
