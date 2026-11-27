import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CoverArt } from "./CoverArt";

const PHOTO =
  "https://images.pexels.com/photos/1/pexels-photo-1.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";

describe("CoverArt photo loading", () => {
  it("offers responsive sizes and loads lazily by default", () => {
    const html = renderToStaticMarkup(
      createElement(CoverArt, { section: "markets", seed: "s", imageUrl: PHOTO }),
    );
    expect(html).toContain("srcSet=");
    expect(html).toContain("320w");
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain('fetchPriority="high"');
  });

  it("loads the page's largest image first when marked priority", () => {
    const html = renderToStaticMarkup(
      createElement(CoverArt, {
        section: "markets",
        seed: "s",
        imageUrl: PHOTO,
        priority: true,
      }),
    );
    expect(html).toContain('loading="eager"');
    expect(html.toLowerCase()).toContain('fetchpriority="high"');
  });
});
