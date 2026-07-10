import { describe, expect, it } from "vitest";
import { joinNatural } from "./text";

describe("joinNatural", () => {
  it("returns an empty string for no items", () => {
    expect(joinNatural([])).toBe("");
  });

  it("returns the single item as-is", () => {
    expect(joinNatural(["London"])).toBe("London");
  });

  it("joins two items with 'and'", () => {
    expect(joinNatural(["London", "Edinburgh"])).toBe("London and Edinburgh");
  });

  it("joins three or more items with commas and a trailing 'and'", () => {
    expect(joinNatural(["London", "Edinburgh", "Paris"])).toBe("London, Edinburgh, and Paris");
  });
});
