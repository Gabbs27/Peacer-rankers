import { describe, it, expect } from "vitest";
import { regionFromClient } from "./region";

describe("regionFromClient", () => {
  it("maps platform ids and short region codes", () => {
    expect(regionFromClient("LA1")).toBe("la1");
    expect(regionFromClient("LAN")).toBe("la1");
    expect(regionFromClient("euw1")).toBe("euw1");
    expect(regionFromClient(" EUNE ")).toBe("eun1");
    expect(regionFromClient("OC1")).toBe("oc1");
  });

  it("returns null for anything unknown", () => {
    expect(regionFromClient("PBE1")).toBeNull();
    expect(regionFromClient("")).toBeNull();
    expect(regionFromClient(undefined)).toBeNull();
    expect(regionFromClient(42)).toBeNull();
  });
});
