import { afterEach, describe, expect, it, vi } from "vitest";
import { paneIdFromPoint } from "./dropTarget";

const mount = () => {
  document.body.innerHTML = `
    <div>
      <div data-pane-id="p0"><span id="left">a</span></div>
      <div data-pane-id="p1"><span id="right">b</span></div>
      <div id="sidebar">c</div>
    </div>
  `;
};

describe("paneIdFromPoint", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("returns the pane that contains the point", () => {
    mount();
    vi.spyOn(document, "elementFromPoint").mockReturnValue(
      document.getElementById("right") as Element,
    );
    expect(paneIdFromPoint(900, 200)).toBe("p1");
  });

  it("returns null when the point lands outside any pane", () => {
    mount();
    vi.spyOn(document, "elementFromPoint").mockReturnValue(
      document.getElementById("sidebar") as Element,
    );
    expect(paneIdFromPoint(10, 10)).toBeNull();
  });
});
