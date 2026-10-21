import { describe, expect, it } from "vitest";
import { firstSearchParam } from "./search-params";

describe("firstSearchParam", () => {
  it("returns the first value of duplicate params", () => {
    expect(firstSearchParam("motor")).toBe("motor");
    expect(firstSearchParam(["motor", "dsg"])).toBe("motor");
  });

  it("normalizes empty values", () => {
    expect(firstSearchParam(undefined)).toBeUndefined();
    expect(firstSearchParam("   ")).toBeUndefined();
    expect(firstSearchParam([])).toBeUndefined();
  });
});
