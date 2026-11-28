import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CoverArt } from "./CoverArt";

const render = (imageUrl: string | null) =>
  renderToStaticMarkup(
    createElement(CoverArt, { section: "markets", seed: "s1", imageUrl }),
  );

describe("CoverArt page weight (2026-11-28)", () => {
  it("draws the generative art when it is the cover", () => {
    const html = render(null);
    expect(html).toContain("<svg");
    expect(html).not.toContain("<img");
  });

  it("puts only a light wash under a photo, not the full art", () => {
    const withPhoto = render("https://images.pexels.com/photos/1/pexels-photo-1.jpeg");
    expect(withPhoto).toContain("<img");
    expect(withPhoto).not.toContain("<svg");
    // The art was ~3 KB per card; the photo cover is now a fraction of it.
    expect(withPhoto.length).toBeLessThan(render(null).length / 2);
  });
});
