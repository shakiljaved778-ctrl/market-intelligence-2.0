"use client";

import { useEffect } from "react";

/**
 * Shrinks the sticky header once the page is scrolled (sets data-shrink on the
 * <header>; the height transition lives in CSS). Renders nothing.
 */
export function HeaderShrink() {
  useEffect(() => {
    const el = document.querySelector("header");
    if (!el) return;
    const onScroll = () => {
      if (window.scrollY > 12) el.setAttribute("data-shrink", "1");
      else el.removeAttribute("data-shrink");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return null;
}
