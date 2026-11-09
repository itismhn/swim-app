# Sitemap

## Public website (no private data, no login)
| Path | Page |
|---|---|
| `/` | Home: introduction, pool/session defaults, services |
| `/about` | About the academy, safeguarding approach |
| `/coaches` | Public coach profiles and training groups |
| `/programs` | Programs and services |
| `/faq` | Frequently asked questions |
| `/contact` | Contact information |
| `/register` | Registration / initial-consultation request form (saved as `InquiryRequest`) |
| `/login` | Sign in |

## Application (`/app`, login required; every page re-checks authorization on the server)
| Path | Who | Purpose |
|---|---|---|
| `/app` | all | Role dashboard (admin / coach / nutritionist / athlete & guardian) |
| `/app/athletes` | staff | Search & filter athletes in scope; athletes are redirected to their own profile, guardians to `/app/family` |
| `/app/athletes/new` | staff | Create athlete (coach: only into own groups) |
| `/app/athletes/[id]` | staff, athlete (self), verified guardian | Profile, goals, guardians, notes, restricted medical data, attendance, PBs, season chart |
| `/app/groups`, `/app/groups/[id]` | staff (coach: own groups) | Roster, weekly slots, coaches, generate sessions |
| `/app/calendar` | all except nutritionist | Weekly sessions; staff cancel / reschedule / add sessions |
| `/app/attendance/[sessionId]` | staff (own groups) | Poolside one-tap attendance sheet + edit history |
| `/app/reports` | staff, athlete, guardian | Weekly / monthly attendance report |
| `/app/workouts`, `/new`, `/[id]` | staff edit; athletes & guardians read published | In-water plan builder, live volume, drafts, publish, revisions, completion logs & replies |
| `/app/dryland`, `/[id]` | staff edit; athletes log | Exercise library, dryland plans, completion / difficulty / pain flag |
| `/app/performance` | staff record; athletes & guardians read | Results, PBs, season chart, baseline & target |
| `/app/nutrition`, `/[id]` | admin (assign), nutritionist (assigned only), athlete, guardian | Education + consultation requests |
| `/app/messages`, `/[id]` | all | Threads with read/unread, guardian oversight for minors |
| `/app/notifications` | all | In-app notifications, read/unread |
| `/app/family` | guardian | Linked athletes, request a link |
| `/app/admin` | admin | Admin hub |
| `/app/admin/users` | admin | Users, roles, activation, password reset |
| `/app/admin/guardians` | admin, head coach | Verify / reject / revoke guardian links |
| `/app/admin/seasons` | admin, head coach | Seasons, editable milestones (weeks 8 & 16 seeded), competitions |
| `/app/admin/settings` | admin | Pool length, sessions/week, minutes, oversight, contact info, external-service status |
| `/app/admin/inquiries` | admin, head coach | Public registration / consultation requests |
| `/app/admin/content` | admin | Public coach profiles, programs, FAQ |
| `/app/admin/audit` | admin | Audit trail of sensitive changes |
