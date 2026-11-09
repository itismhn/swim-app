# Permissions matrix

Enforced in `src/server/authz.ts` (Prisma `where` builders + assertions) and re-checked inside every server action (`src/server/action-guard.ts`). Hidden UI is never the only control. Records outside scope return **404**, the same as non-existent ones.

Legend: **R** read · **W** create/edit · **—** no access · *scope* in parentheses

| Resource | Admin | Head coach | Group coach | Nutritionist | Athlete | Guardian |
|---|---|---|---|---|---|---|
| Users & roles | W | — | — | — | — | — |
| Academy settings | W | — | — | — | — | — |
| Groups, weekly slots, coach assignment | W | R (all) | R (own groups) | — | — | — |
| Generate / add / cancel / reschedule sessions | W | W (all) | W (own groups) | — | R (own group) | R (verified children's groups) |
| Athlete profile | W (all) | W (all) | W (own groups) | — | R (self) | R (verified links) |
| Coach notes | W | W | W (own groups) | — | R shared only (self) | R shared only |
| Medical / restrictions | W* | W* | W* (own groups) | — | R (self) | W first entry with consent, R (verified) |
| Attendance | W | W | W (own groups) | — | R (self) | R (verified) |
| Workout & dryland plans | W | W | W (own groups/athletes) | — | R published (self/group) | R published |
| Workout completion / dryland log | R | R + reply | R + reply (own) | — | W (self) | R |
| Performance results & targets | W | W | W (own groups) | — | R (self) | R (verified) |
| Nutrition articles | W | — | — | W | R | R |
| Nutrition requests | R + assign (no allergy details) | — | — | R/W assigned only | W/R (self) | W/R (verified) |
| Allergy details in requests | — | — | — | R (assigned + consent) | R | R |
| Messages | own threads | own threads | own threads (athletes/guardians in scope) | own threads | own threads (own coaches) | own threads (children's coaches) |
| Guardian link verification | W | W | — | — | — | request only |
| Seasons, milestones, competitions | W | W (milestones, competitions) | R via dashboards | — | — | — |
| Public content, inquiries | W | R inquiries | — | — | — | — |
| Exercise library & media upload | W | W | W | — | R | R |
| Own password & sessions | W | W | W | W | W | W |
| Audit log | R | — | — | — | — | — |

\* Staff may update existing medical data; the first record must come from a verified guardian giving consent. The values are never copied into the audit log.

**Minor oversight:** when enabled (default) and the athlete is under 18, every thread that includes the athlete automatically adds their verified guardians as visible "observer" participants.
