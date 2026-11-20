import { describe, expect, it } from "vitest";
import { eurekaArticles, eurekaCoverQueries } from "./authored";

describe("Eureka cover searches", () => {
  it("follow the prize field in the nobelprize.org link", () => {
    expect(
      eurekaCoverQueries(
        "https://www.nobelprize.org/prizes/physics/1903/marie-curie/facts/",
      )[0],
    ).toBe("physics laboratory");
    expect(
      eurekaCoverQueries(
        "https://www.nobelprize.org/prizes/economic-sciences/1994/nash/facts/",
      )[0],
    ).toBe("mathematics chalkboard");
    expect(eurekaCoverQueries("https://example.org/x")).toEqual(["science laboratory"]);
  });

  it("covers every authored explainer's field", () => {
    for (const a of eurekaArticles()) {
      expect(eurekaCoverQueries(a.url).length).toBeGreaterThan(0);
    }
  });
});
