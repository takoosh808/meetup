# Pulse — Live Local Event Coordination (Working Title)

> A browser-based, hyperlocal, real-time app for organizing casual events, hangouts,
> and recurring meetups (sports pickup games, clubs, social gatherings) — replacing
> group-chat chaos with a live map, one-tap hosting, and automatic geofenced check-ins.

---

## 1. Problem Statement

Organizing recurring or casual in-person gatherings (pickup sports, hobby groups,
spontaneous hangouts) today relies on group chats, which suffer from:

- **Coordination fatigue**: repeated "where are we meeting?" / "is this still happening?" messages.
- **No live ground truth**: no one knows in real time who's actually there or how many people showed up.
- **High friction for hosts**: hosts have to manually announce, manually confirm, and manually signal when they leave (or the event "lives on" awkwardly in the chat after they've left).
- **High friction for newcomers**: joining an unfamiliar group chat/community to attend a single casual event is socially awkward and discourages new people from showing up.

**Core hypothesis:** if hosting an event is as easy as "press a button and broadcast my
location," and attendees can see it live on a map and get auto-checked-in just by
showing up, both organizing and joining casual recurring meetups become dramatically
lower-friction — which drives more spontaneous community building.

---

## 2. Vision / Elevator Pitch

"Press one button, and everyone within range instantly knows what's happening, where,
and how many people are already there. Show up, and you're automatically checked in.
Leave, and hosting winds down on its own — no group chat required."

**Long-term vision (post-MVP):** beyond the live map, the app becomes a passive,
opt-in signal layer for your social/interest graph — friends and groups you follow
can automatically ping you ("🏐 Sunday Beach Volleyball is happening right now")
the moment they go live, and you can subscribe to entire *categories* of activity
(e.g., "any volleyball session within 5 miles") without needing to follow a specific
person or club. This turns the app from something you have to check into something
that proactively tells you when it's worth showing up.

---

## 3. Target Audience

- **Primary**: Casual/recreational sports & hobby communities — pickup basketball,
  soccer, ultimate frisbee, running clubs, board game meetups, dog park regulars,
  campus/neighborhood social groups.
- **Secondary**: Newcomers to a city/campus/neighborhood looking to meet people
  through low-commitment, drop-in activities (a community-building & loneliness-reduction angle).
- **Tertiary (later)**: Recurring club organizers (run clubs, cycling groups, meetup
  organizers) who want a lightweight alternative to heavier platforms (Meetup.com,
  Discord, WhatsApp groups) for "this week's session."

**Explicitly not (for MVP)**: large ticketed events, paid events, venues/businesses
posting promotions, national/virtual events — this is about **in-person, hyperlocal,
informal gatherings** happening *now* or *very soon*.

---

## 4. Core Concepts & Terminology

| Term | Definition |
|---|---|
| **Session / Event** | A single instance of a gathering (e.g., "Tuesday night pickup soccer"). |
| **Host** | The user who creates and broadcasts a session; their device location anchors the event. |
| **Attendee** | A user who discovers and joins a session, physically or via RSVP. |
| **Broadcast Radius** | The radius shown on the map representing "the event is roughly here" (obfuscated for privacy — not the host's exact GPS pin). |
| **Check-in Radius** | The (typically small) radius within which an attendee's arrival is auto-detected and counted. |
| **Auto-Shutoff Radius** | The radius the host must exceed (i.e., leave) for hosting to automatically end. |
| **Club / Group** | An optional persistent entity (e.g., "Downtown Pickup Basketball") that owns recurring sessions and a follower list. |
| **Live Count** | The real-time number of currently checked-in attendees, shown to everyone viewing the event. |

---

## 5. MVP Scope

### 5.1 Must-Have (MVP)

1. **Account & Profile**
   - Sign up / log in (email or OAuth), basic profile (name, avatar, optional interests).
2. **Host a Session**
   - One-tap "Start Hosting" flow: pick activity type/title, optional description, set broadcast radius, check-in radius, and auto-shutoff radius (sane defaults provided).
   - Session appears live on the map immediately.
3. **Live Map Discovery**
   - Map view (mobile-web-first, responsive) showing nearby active sessions as pins/blobs with activity type icon, title, and live attendee count.
   - Filter by activity type / distance / starting soon.
4. **Join / RSVP**
   - Tap a session for details (title, host, description, live count, distance, directions).
   - "I'm heading there" soft RSVP (optional, not required to attend).
5. **Geofenced Auto Check-in**
   - Using browser Geolocation API, when an attendee's device enters the check-in radius, they are automatically marked "checked in" and the live count updates for all viewers in real time.
   - Auto check-out if they leave the radius for a sustained period (avoids stale counts).
6. **Host Auto-Shutoff**
   - When the host's device exits the auto-shutoff radius, the session automatically transitions to "ended" (or "host left, event may still be going" state) for everyone viewing it.
   - Host can also manually end the session at any time.
7. **Session Lifecycle & History**
   - Sessions have clear states: `scheduled` → `live` → `ended`.
   - Basic history: past sessions a user hosted or attended (for streaks/recurring habits later).
8. **Privacy & Location Controls**
   - Location sharing is opt-in per session, only active while hosting/checked-in.
   - Host's *exact* GPS is never shown to attendees — only an obfuscated pin/area (see §7).
   - Ability to stop sharing / leave a session at any time, instantly.
9. **Notifications (lightweight)**
   - Browser push/notification when: a followed club goes live, a session you RSVP'd to is starting, or the session you're at just got shut off.
10. **Basic Safety**
   - Report/block a user or session; minimum-age gate; community guidelines acceptance at signup.

### 5.2 Nice-to-Have (Post-MVP / v1.1+)

- Recurring/scheduled sessions ("every Tuesday 7pm") vs. spontaneous "right now" sessions.
- Clubs/Groups with membership, roles (co-hosts), and follower feeds.
- **Friend graph + auto-ping notifications**: add friends directly (not just clubs), and automatically notify them "this is happening right now" the moment you go live, if they've opted in.
- **Category-based notification subscriptions**: let a user subscribe to an activity type within a radius (e.g., "any volleyball session within 5 miles") rather than only following specific people/clubs — surfaces relevant sessions from strangers too.
- In-app lightweight chat scoped to a single live session (auto-archived after it ends).
- Reputation/attendance streaks, "regulars" badges.
- Photos/recap after a session ends.
- Calendar integration (add to Google/Apple calendar).
- Web push + native mobile app (iOS/Android) wrapping the PWA.
- Weather-aware suggestions/auto-cancel prompts for outdoor sports.

### 5.3 Explicitly Out of Scope (for MVP)

- Payments/ticketing.
- Business/venue advertising placements.
- Native mobile apps (MVP is a responsive web app / PWA only).
- Public precise-location display of any individual user (host or attendee) to anyone.

---

## 6. Example End-to-End Workflow

**Scenario: Sunday volleyball meetup, every week at 2 PM**

1. **Maria (Host)** has a recurring session set up: "Sunday Beach Volleyball 🏐,"
   every Sunday at 2:00 PM at her usual beach park courts. At 1:50 PM she opens the
   app, sees the upcoming recurring session, and taps **"Start Hosting."**
2. She leaves the default broadcast radius (~150m), check-in radius (~40m), and
   auto-shutoff radius (~300m) as suggested for this venue (saved from last week).
3. She taps **Go Live**. Her session instantly appears as a volleyball pin on the
   map for nearby users and for her club's followers, showing "Just started · 1 here."
4. **Devon**, who follows Maria's volleyball group, gets a notification: "🏐 Sunday
   Beach Volleyball is starting now." He taps it, sees "1 here, starting now," and
   taps **"Heading there."**
5. Devon walks to the courts. As his phone crosses into the 40m check-in radius, the
   app automatically marks him checked in — no button press needed. The live count
   updates to "2 here" for everyone viewing, including Maria. The app's location
   polling automatically ramps up briefly as he nears the radius, then backs off
   again once he's checked in (see §7.2) to conserve his battery.
6. Over the next 30 minutes, 10 more people who saw the pin or got notified show up
   and are auto-checked-in the same way. The event now shows "11 here."
7. At 4 PM, the game wraps up and Maria walks back to her car, which is ~350m away —
   beyond her 300m auto-shutoff radius. The app automatically ends her hosting
   session; the pin disappears from the live map and the session moves to "ended"
   in history, automatically scheduled to reappear next Sunday at 2 PM.
8. Attendees who are still lingering are auto-checked-out after leaving the check-in
   radius for a few minutes. The session's final recap shows "12 attended" in
   everyone's history.

---

## 7. Key Technical & UX Requirements

### 7.1 Location & Geofencing

- Use the browser **Geolocation API** (`watchPosition`) with appropriate accuracy/battery tradeoffs; must work reliably on mobile Safari/Chrome (primary use case).
- Perform geofence radius checks **server-side** (client sends periodic position updates; server computes distance) to prevent spoofing of check-ins and to keep a consistent source of truth.
- **Location obfuscation**: the map pin shown to attendees should represent a fuzzed/rounded location or a radius circle, not the host's literal lat/lng, until an attendee is within the broadcast area or the session start point is otherwise intentionally precise (configurable by host, e.g., "show exact pin" vs "show general area").
- Debounce/hysteresis on enter/exit radius checks to avoid flicker (e.g., require signal to persist for N seconds before check-in/out).
- Background location updates are limited in browsers — MVP should assume **foreground/active-tab hosting** with clear UX indicating "keep this tab open / stay on this page while hosting"; a PWA with a service worker can improve this but true background geofencing may require a future native app.

### 7.2 Battery-Conscious Location Strategy (priority requirement)

Minimizing battery drain is a first-class design constraint, since continuous location
polling is the biggest power risk in this app:

- **Adaptive polling frequency ("distance-aware throttling")**: don't poll at a fixed high frequency at all times. Use coarse, low-power positioning (`enableHighAccuracy: false`, longer intervals, e.g. 30-60s) while a user is far from any relevant session, and only ramp up to short-interval/high-accuracy polling when they're near a broadcast radius or actively hosting. Back off again immediately after check-in/check-out is confirmed.
- **Prefer coarse network/Wi-Fi-based positioning over GPS** by default (`enableHighAccuracy: false`), only escalating to GPS-level accuracy briefly when the coarse position suggests the user is close to a relevant radius.
- **Pause polling when the tab isn't visible** using the `visibilitychange` event, and resume at a low rate when it becomes visible again, rather than tracking continuously in the background.
- **Host-side heartbeat throttling**: once a host is live and stationary (position hasn't changed meaningfully across recent samples), drop to an infrequent "heartbeat" ping instead of continuous tracking; only re-tighten polling if movement is detected (i.e., they may be approaching the shutoff radius).
- **Attendee-side idle throttling**: attendees not near any live session should poll rarely, or only on-demand when the map is actively open, rather than continuously.
- **Client-side pre-filtering**: only send a position update to the server when it differs meaningfully from the last sent point (minimum distance/time delta), reducing both battery drain and network/server load.
- **Graceful handling of background timer throttling**: browsers already throttle timers in backgrounded tabs; surface a clear UI state ("Paused — reopen the app to keep tracking") instead of silently failing.
- **No background geofencing in MVP**: this reinforces the foreground/active-tab model above and is also the more battery-safe choice, since always-on background geofencing (like native OS geofencing APIs) isn't reliably available from the browser anyway.

### 7.3 Real-Time Updates

- Live count and pin updates must propagate to all viewers within ~1-3 seconds — implies WebSockets or a managed real-time channel (not polling), at least for anyone with an open session detail view or map in the visible viewport.

### 7.4 Data Privacy & Safety (critical, non-negotiable for MVP)

- Location data is **highly sensitive**; store only what's needed, for only as long as needed (e.g., purge granular location pings after a session ends, retain only aggregate attendance counts/history).
- Clear, explicit consent flow before any location sharing begins.
- No user's precise live location is ever exposed to another individual user — only aggregate/anonymized signals (counts, fuzzed pins).
- Rate-limit and authenticate all location-update API calls; validate they're plausible (e.g., reject GPS jumps that imply impossible speeds) to reduce spoofed check-ins.
- Minimal PII collection at signup; support account deletion & data export (GDPR/CCPA-minded even if not immediately required).
- Age gate + basic content/community moderation tools (report/block) from day one given the in-person-meetup nature of the product.

### 7.5 Performance & Reliability

- Map with many concurrent live pins must remain performant (clustering for dense areas).
- Graceful degradation if geolocation permission is denied (manual check-in fallback).
- Works well on mid-range mobile devices and mobile browsers; this is a **mobile-web-first** responsive design, secondarily usable on desktop for browsing/planning.

---

## 8. Proposed Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | React (or SvelteKit) + TypeScript, installable as a **PWA** | Browser-based per your requirement; PWA gives installability, offline shell, and push notifications without going native yet. |
| **Map rendering** | Mapbox GL JS or MapLibre GL (open-source) + vector tiles | Smooth pin clustering, custom radius overlays, good mobile performance. |
| **Real-time layer** | WebSockets (e.g., Socket.IO) or a managed service (Ably/Pusher/Supabase Realtime) | Needed for live attendee counts and pin state pushed to all viewers instantly. |
| **Backend API** | Node.js + TypeScript (NestJS or Express) | Shared language with frontend, strong ecosystem for geospatial + real-time. |
| **Database** | PostgreSQL + **PostGIS** extension | Native geospatial queries (radius/distance, "sessions near me") are core to the whole product. |
| **Geospatial queries** | PostGIS `ST_DWithin` / spatial indexes | Efficient "who is within X meters" checks server-side. |
| **Auth** | Auth provider (Auth0/Clerk/Supabase Auth) or custom JWT | Speeds up MVP; supports OAuth (Google/Apple sign-in) which lowers signup friction. |
| **Push notifications** | Web Push API (VAPID) via service worker | For "session going live" / "shutting off" alerts without needing native app stores. |
| **Hosting/Infra** | Vercel/Netlify (frontend) + Render/Fly.io/Railway or AWS (API + DB) | Fast MVP iteration, scale later. |
| **Background jobs** | Lightweight queue (BullMQ w/ Redis) | For radius-check batch jobs, stale-session cleanup, auto-checkout timers. |
| **Analytics** | PostHog (self-hostable, privacy-conscious) | Understand activation/retention without heavy third-party trackers given the sensitivity of the app. |

*Note: A monolith (single Node/TS backend + Postgres) is recommended for MVP —
microservices/native mobile apps are premature until the core loop (host → discover →
auto check-in → auto shut-off) is validated with real users.*

---

## 9. High-Level Data Model (conceptual, not final schema)

- **User**: id, name, avatar, auth info, privacy settings, created_at.
- **Session**: id, host_id, club_id (nullable), title, activity_type, description, status (`scheduled`/`live`/`ended`), broadcast_radius_m, checkin_radius_m, shutoff_radius_m, anchor_location (fuzzed + precise, precise restricted access), started_at, ended_at.
- **Attendance**: id, session_id, user_id, checked_in_at, checked_out_at, rsvp_status (`interested`/`heading_there`/`checked_in`).
- **Club** (post-MVP-ready but simple in MVP): id, name, description, owner_id, member list.
- **LocationPing** (ephemeral, short retention): session_id, user_id (host or attendee), lat/lng, accuracy, timestamp — purged shortly after session ends, only aggregates retained.
- **Report/Block**: reporter_id, target_user_id or target_session_id, reason, created_at.

---

## 10. Success Metrics (for validating MVP)

- **Activation**: % of new users who either host or attend a session within their first week.
- **Coordination-friction reduction**: average time from "session goes live" to "first attendee checked in."
- **Retention**: % of hosts who host a second session within 14 days (habit formation for recurring meetups).
- **Trust/safety**: report rate per session, % of sessions ended via auto-shutoff vs. manual vs. abandoned.
- **Network effect**: average attendees per session over time (community growth signal).

---

## 11. Open Questions / Risks

1. **Foreground-only geolocation limitation**: browsers heavily restrict background location — MVP UX needs to make "keep the app open while hosting/traveling to the event" natural rather than annoying, and the battery-conscious adaptive polling strategy (§7.2) needs to hold up on real devices. May push toward a native app sooner than planned.
2. **Cold-start / density problem**: the app is only useful where there's a critical mass of nearby users — MVP needs a go-to-market wedge (e.g., launch hyperlocal in one campus/neighborhood/sport community) rather than a broad launch.
3. **Safety of "showing strangers your general location"**: even fuzzed, this is a sensitive category — needs careful default radii, clear consent, and abuse-reporting from day one.
4. **Spoofing/incentive to fake attendance counts** (e.g., inflate a session's popularity) — server-side validation and plausibility checks are required, not just client-reported check-ins.
5. **Naming/branding**: "Pulse" is a placeholder — worth deciding on a real name before building out branded UI.
6. **Friend-graph auto-ping notification fatigue** (post-MVP): once friends/categories can auto-ping "this is happening now," over-notification could quickly become the same annoyance the app is trying to solve (group-chat spam) — will need per-friend/per-category granular controls and smart batching before this ships.

---

## 12. Suggested Setup / Project Structure (for when we do start building)

```
/apps
  /web            → React/SvelteKit PWA frontend
  /api            → Node.js/TypeScript backend (REST + WebSocket gateway)
/packages
  /shared-types   → Shared TS types/DTOs between frontend & backend
/infra            → IaC / deployment config
PROJECT.md         → This document
```

Recommended build order for MVP:
1. Auth + basic profile.
2. Session CRUD (create/host/end) without real-time geofencing (manual check-in button first).
3. Map view + live session discovery.
4. Real-time layer (WebSockets) for live counts.
5. Geolocation-based auto check-in/check-out (replace manual button).
6. Host auto-shutoff radius logic.
7. Notifications, safety/report tooling, polish.

---

## 13. Next Steps

- Confirm/adjust MVP scope above (anything to cut further or add back?).
- Pick a real product name.
- Decide on initial "wedge" community/geography to launch with.
- Once locked, we can scaffold the actual project (frontend + backend + DB schema).
