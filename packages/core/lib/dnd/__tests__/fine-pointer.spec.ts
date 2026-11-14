import { isFinePointer } from "../fine-pointer";

const withPointer = (coarse: boolean) =>
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: coarse && query.includes("coarse") }),
  });

describe("isFinePointer", () => {
  it("is true with a mouse and false on a coarse (touch) pointer", () => {
    withPointer(false);
    expect(isFinePointer()).toBe(true);
    withPointer(true);
    expect(isFinePointer()).toBe(false);
  });
});
