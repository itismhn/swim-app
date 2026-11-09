import { describe, expect, it } from "vitest";
import { sniffMediaType } from "@/server/media";

const bytes = (...xs: number[]) => new Uint8Array([...xs, ...new Array(16).fill(0)]);

describe("media upload signature check", () => {
  it("recognises allowed types by content, not by name", () => {
    expect(sniffMediaType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffMediaType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffMediaType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
    expect(sniffMediaType(bytes(0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70))).toBe("video/mp4");
  });
  it("rejects HTML, SVG and text disguised as images", () => {
    const enc = new TextEncoder();
    expect(sniffMediaType(enc.encode("<html><script>alert(1)</script>"))).toBeNull();
    expect(sniffMediaType(enc.encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniffMediaType(enc.encode("just text"))).toBeNull();
  });
});
