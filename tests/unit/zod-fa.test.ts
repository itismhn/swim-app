import { describe, expect, it } from "vitest";
import { z } from "zod";
import { optInt, req } from "@/lib/zod-fa";

const msgs = (schema: z.ZodTypeAny, value: unknown) =>
  Object.fromEntries(schema.safeParse(value).error!.issues.map((i) => [i.path.join("."), i.message]));

describe("Persian validation messages", () => {
  it("translates zod defaults and keeps explicit messages", () => {
    const m = msgs(
      z.object({ text: z.string().max(3), level: optInt("سختی", 1, 10), email: z.string().email(), name: req("نام"), n: z.number() }),
      { text: "abcdef", level: "۸۶", email: "x", name: "", n: undefined },
    );
    expect(m.text).toBe("حداکثر ۳ کاراکتر مجاز است");
    expect(m.level).toBe("سختی حداکثر ۱۰");
    expect(m.email).toBe("ایمیل معتبر نیست");
    expect(m.name).toBe("نام الزامی است");
    expect(m.n).toBe("این فیلد الزامی است");
  });

  it("accepts Persian digits in numbers", () => {
    expect(optInt("سختی", 1, 10).parse("۷")).toBe(7);
  });
});
