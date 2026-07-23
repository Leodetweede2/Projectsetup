import { describe, it, expect } from "vitest";
import { buildInitialFilters, listDrillHref } from "@/lib/assets/listParams";

const columns = ["Afdeling", "Type", "OS"];

describe("buildInitialFilters", () => {
  it("keeps a valid col/val pair", () => {
    expect(buildInitialFilters({ col: "Afdeling", val: "Radiologie" }, columns)).toEqual({
      Afdeling: "Radiologie",
    });
  });

  it("keeps both pairs when present", () => {
    expect(
      buildInitialFilters(
        { col: "Afdeling", val: "Radiologie", col2: "Type", val2: "Laptop" },
        columns,
      ),
    ).toEqual({ Afdeling: "Radiologie", Type: "Laptop" });
  });

  it("drops unknown columns and empty values", () => {
    expect(buildInitialFilters({ col: "Nope", val: "x" }, columns)).toEqual({});
    expect(buildInitialFilters({ col: "Type", val: "" }, columns)).toEqual({});
  });
});

describe("listDrillHref", () => {
  it("encodes a single filter", () => {
    expect(listDrillHref([{ col: "OS", val: "Windows 11" }])).toBe(
      "/list?col=OS&val=Windows+11",
    );
  });

  it("encodes two filters and extra params", () => {
    expect(
      listDrillHref([{ col: "Afdeling", val: "ICT" }, { col: "Type", val: "Desktop" }], {
        located: "no",
      }),
    ).toBe("/list?col=Afdeling&val=ICT&col2=Type&val2=Desktop&located=no");
  });

  it("caps at two filters", () => {
    const href = listDrillHref([
      { col: "A", val: "1" },
      { col: "B", val: "2" },
      { col: "C", val: "3" },
    ]);
    expect(href).not.toContain("C");
  });
});
