import { ATTENDANCE_LABEL, PLAN_STATUS_LABEL, RESULT_TYPE_LABEL, SESSION_STATUS_LABEL } from "@/lib/domain/labels";
import { Medal, Timer } from "lucide-react";
import { Badge, type Tone } from "./ui";

const att: Record<string, Tone> = { PRESENT: "green", LATE: "amber", LEFT_EARLY: "amber", ABSENT: "red", EXCUSED: "violet" };
export const AttendanceBadge = ({ s }: { s: keyof typeof ATTENDANCE_LABEL }) => <Badge tone={att[s]}>{ATTENDANCE_LABEL[s]}</Badge>;

const ses: Record<string, Tone> = { SCHEDULED: "blue", COMPLETED: "gray", CANCELLED: "red" };
export const SessionBadge = ({ s }: { s: keyof typeof SESSION_STATUS_LABEL }) => <Badge tone={ses[s]}>{SESSION_STATUS_LABEL[s]}</Badge>;

const pl: Record<string, Tone> = { DRAFT: "amber", PUBLISHED: "green", ARCHIVED: "gray" };
export const PlanBadge = ({ s }: { s: keyof typeof PLAN_STATUS_LABEL }) => <Badge tone={pl[s]}>{PLAN_STATUS_LABEL[s]}</Badge>;

export const ResultTypeBadge = ({ s }: { s: keyof typeof RESULT_TYPE_LABEL }) =>
  <Badge tone={s === "OFFICIAL" ? "blue" : "gray"}>{s === "OFFICIAL" ? <Medal aria-hidden className="size-3" /> : <Timer aria-hidden className="size-3" />}{RESULT_TYPE_LABEL[s]}</Badge>;
