# Data model

Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma). PostgreSQL; instants are `timestamptz` (UTC), calendar dates use `date`. The UI renders Jalali dates in Asia/Tehran.

```
User ─┬─ Session (hashed token)          AcademySetting (singleton: pool 25 m, 3×/week, 120 min, oversight)
      ├─ Athlete ─┬─ AthleteMedical (consent required, restricted)
      │           ├─ GuardianLink ── User(GUARDIAN)  [PENDING | VERIFIED | REJECTED]
      │           ├─ CoachNote [STAFF_ONLY | SHARED]
      │           ├─ Attendance ── AttendanceHistory
      │           ├─ PerformanceResult (stroke, distance, course, timeMs, type, splitsMs[], isBaseline)
      │           ├─ SeasonTarget ── Season ─┬─ Milestone (week 8, 16 …)
      │           │                          └─ Competition
      │           ├─ WorkoutCompletion (actualMeters, rpe, feedback, coachReply)
      │           ├─ DrylandLog (completed, difficulty, pain, painNote)
      │           └─ NutritionRequest ── NutritionReply
      ├─ GroupCoach ── Group ─┬─ WeeklySlot (weekday 0=Sat, HH:MM Tehran, minutes)
      │                       └─ TrainingSession [SCHEDULED | COMPLETED | CANCELLED]
      ├─ Notification (readAt)
      ├─ ThreadParticipant (lastReadAt, oversight) ── Thread ── Message
      └─ AuditLog (actor, action, entity, before/after JSON)

WorkoutPlan (group XOR athlete, status, version, plannedMeters)
  ├─ WorkoutSection (WARMUP, TECHNIQUE, KICK_PULL, MAIN, SKILLS, COOLDOWN)
  │    └─ WorkoutSet (rounds, reps, stroke, intensity, restSec, sendOffSec, focus, notes)
  │         ├─ SetSegment (meters, description)   ← "20 m + 5 m" = two segments of one 25 m rep
  │         └─ SetEquipment ── Equipment (fins, kickboard, pull buoy, paddles, snorkel + custom)
  ├─ WorkoutPlanRevision (JSON snapshot per save)
  └─ WorkoutCompletion
DrylandPlan ── DrylandItem (sets, reps, durationSec, restSec) ── Exercise (library)
NutritionArticle (general education)
Public: PublicCoachProfile, PublicGroupInfo, Program, Faq, InquiryRequest
```

## Calculation rules
- **Planned volume** = Σ rounds × reps × Σ segment metres, always recomputed on the server; **actual volume** lives only in `WorkoutCompletion.actualMeters`.
- **Attendance rate** = (present + late + left early) ÷ recorded, non-cancelled sessions. Excused absences are excluded from the denominator unless `countExcusedAsAbsent` is set. Cancelled sessions never count.
- **Personal best** = fastest `timeMs` within the same (stroke, distance, course); 25 m and 50 m pool results are never compared.
