import { describe, expect, it } from "vitest";
import { formatDoctorName } from "../formatters";

describe("formatDoctorName", () => {
  it("adds Dr prefix for dermatologists", () => {
    expect(formatDoctorName("Ana", "Anić", "DERMATOLOG")).toBe("Dr Ana Anić");
  });

  it("returns full name without prefix for admin users", () => {
    expect(formatDoctorName("Maja", "Majić", "ADMIN")).toBe("Maja Majić");
  });

  it("handles missing role by returning plain name", () => {
    expect(formatDoctorName("Petar", "Petrović")).toBe("Petar Petrović");
  });
});
