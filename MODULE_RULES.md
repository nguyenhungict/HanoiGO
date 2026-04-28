# HanoiGO Module Development Rules

> **Version 1.0** - Guidelines for implementing and completing new modules in the HanoiGO project.
> These rules must be followed by any AI agent working on the codebase.

---

## 🏗️ 1. Technical Stack & Architecture

- **Backend:** NestJS (Node.js) + TypeScript.
- **Frontend:** Next.js 14+ (App Router) + TypeScript.
- **Database:** PostgreSQL with PostGIS for geospatial queries.
- **ORM:** Prisma.
- **Maps:** Leaflet.js + Goong Maps API (for routing/distance/search).
- **Realtime:** Socket.io (WebSocket) + Redis for Pub/Sub.

---

## 🎨 2. Design & UX Standards

- **Visual Excellence:** Use premium aesthetics (Glassmorphism, smooth gradients, modern typography).
- **Dynamic UI:** Implement hover effects, micro-animations, and responsive layouts.
- **Map Integration:** Interactive maps are core. Markers must be color-coded by day/category.
- **No Placeholders:** Generate real assets using `generate_image` tool if needed.

---

## ⚙️ 3. Implementation Patterns

### 3.1. Backend (NestJS)
- **DTOs:** Use `class-validator` for all input DTOs.
- **Service-Oriented:** Keep logic in Services, controllers for routing only.
- **Geospatial:** Use `ST_Distance`, `ST_DWithin`, and `ST_AsGeoJSON` for location logic.
- **Time Handling:** Convert DB `TIME` to minutes-from-midnight for internal calculations.

### 3.2. Frontend (Next.js)
- **Component Design:** Modular, reusable components in `client/components`.
- **GPS Awareness:** Always check for `userLocation` from the Map state before calling APIs.
- **Loading States:** Every async action must have a visual loading indicator (Skeleton or Spinner).

---

## 🧪 4. Testing & Quality Assurance

- **MANDATORY:** Every new feature/algorithm must have a `.spec.ts` test file.
- **Test Coverage:**
    - Edge cases (closed days, invalid coordinates).
    - API Fallbacks (what happens if Goong API fails?).
    - Performance (large clusters, many participants).
- **Execution:** Run `npm test` or specific `jest` commands to verify changes before reporting.

---

## 📝 5. Documentation Protocol

- **Synchronous Updates:** When code changes, the following must be updated:
    - `HanoiGO.tex`: The main thesis file (Vietnamese).
    - `docs/moduleX_name.tex`: Dedicated technical report (English).
    - `docs/moduleX_name_vn.tex`: Dedicated technical report (Vietnamese).
- **Structure:** Documentation must include:
    - Problem description.
    - Algorithm/Logic flow.
    - Architecture diagram (verbatim/mermaid).
    - Detailed test cases results.

---

## 🚀 6. Workflow for New Modules

1. **Plan:** Understand requirements and design the algorithm.
2. **Implement Backend:** Create entities, DTOs, and Service logic.
3. **Verify Logic:** Write and run unit tests.
4. **Implement Frontend:** Build the UI and integrate with Backend.
5. **Final Audit:** Run manual checks on UX and responsiveness.
6. **Document:** Update `.tex` files with the final implementation details.

---

> [!IMPORTANT]
> **Real-time & GPS-First:** If a module involves location, it MUST prioritize the user's current GPS position for the best UX. Always provide a fallback (like Haversine) for API failures.
