import { describe, expect, it } from "vitest";
import { canExportIocs } from "@/lib/ioc-export";

describe("IoC export availability", () => {
  it("rejects an empty collection instead of producing objects: []", () => {
    expect(canExportIocs(0, false, null)).toBe(false);
  });
  it("waits for indicators to finish loading", () => {
    expect(canExportIocs(1, true, null)).toBe(false);
  });
  it("rejects exports after a failed load", () => {
    expect(canExportIocs(1, false, "Erreur réseau")).toBe(false);
  });
  it("allows exporting a loaded nonempty collection", () => {
    expect(canExportIocs(1, false, null)).toBe(true);
  });
});