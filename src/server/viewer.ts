import type { Role } from "@prisma/client";

/** The authenticated principal every authorization decision is made for. */
export interface Viewer {
  id: string;
  role: Role;
  name: string;
}

export const STAFF: Role[] = ["ADMIN", "HEAD_COACH", "COACH"];
export const ACADEMY_WIDE: Role[] = ["ADMIN", "HEAD_COACH"];
export const isStaff = (v: Viewer) => STAFF.includes(v.role);
export const isAcademyWide = (v: Viewer) => ACADEMY_WIDE.includes(v.role);

export class ForbiddenError extends Error {
  constructor(msg = "دسترسی مجاز نیست") {
    super(msg);
    this.name = "ForbiddenError";
  }
}
