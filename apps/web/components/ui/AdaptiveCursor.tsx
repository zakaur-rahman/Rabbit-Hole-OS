"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function AdaptiveCursor() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 350 };

  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [mouseX, mouseY]);

  useEffect(() => {
    const updateHoverables = () => {
      const hoverables = document.querySelectorAll("a, button, [role='button']");

      const enter = () => {
        document.body.classList.add("cursor-hover");
      };

      const leave = () => {
        document.body.classList.remove("cursor-hover");
      };

      hoverables.forEach((el) => {
        el.addEventListener("mouseenter", enter);
        el.addEventListener("mouseleave", leave);
      });

      return () => {
        hoverables.forEach((el) => {
          el.removeEventListener("mouseenter", enter);
          el.removeEventListener("mouseleave", leave);
        });
      };
    };

    // Initial run
    const cleanup = updateHoverables();

    // Re-bind on dynamic changes (simplistic approach for now)
    const observer = new MutationObserver(() => {
      cleanup();
      updateHoverables();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cleanup();
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* core dot */}
      <motion.div
        style={{ x, y }}
        className="adaptive-cursor-dot"
      />

      {/* outer ring */}
      <motion.div
        style={{ x, y }}
        className="adaptive-cursor-ring"
      />
    </>
  );
}
