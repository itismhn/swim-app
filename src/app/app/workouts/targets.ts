import { db } from "@/server/db";
import { athleteWhere, groupWhere } from "@/server/authz";
import type { Viewer } from "@/server/viewer";

/** Groups and individual athletes a staff member may assign plans to. */
export async function assignableTargets(v: Viewer) {
  const [groups, athletes] = await Promise.all([
    db.group.findMany({ where: groupWhere(v), select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.athlete.findMany({ where: { AND: [athleteWhere(v), { status: { in: ["ACTIVE", "TRIAL"] } }] }, select: { id: true, user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);
  return [
    ...groups.map((g) => ({ value: `group:${g.id}`, label: `گروه: ${g.name}` })),
    ...athletes.map((a) => ({ value: `athlete:${a.id}`, label: `فردی: ${a.user.name}` })),
  ];
}
