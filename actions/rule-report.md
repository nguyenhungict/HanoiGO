# HanoiGO Thesis Report - Rule & Notes Documentation

This file compiles all the architectural rules, formatting notes, and project specifications established for the **HanoiGO Bachelor's Thesis Report**.

---

## 📋 General Thesis Parameters

- **Academic Level:** Bachelor's Thesis in Information and Communication Technology (ICT)
- **Institution:** University of Science and Technology of Hanoi (USTH)
- **Language:** **English** (Standard for all ICT thesis reports and technical documents)
- **Target File:** `Reports/HanoiGO-report.tex` (focusing on Chapter I: Introduction)
- **Implementation Exclusions:** Redis (planned for WebSocket scaling) and the AI assistant module (Gemini) are **not implemented** in the current scope of the application/report. They must only be discussed under Future Work.

---

## 🏛️ Writing Style & Tone Rules (P0)

> [!IMPORTANT]
> **No Over-Praising Adjectives:** Do NOT use words like **"intelligent"**, **"smart"**, or **"perfect"** to praise the project. Instead, use objective and humble terms like **"convenient"**, **"useful"**, **"practical"**, **"common"**, or **"user-friendly"**.
> 
> **Vocabulary Level (IELTS 6.0):** Use simple, clear, and academic words suitable for an undergraduate thesis. Avoid overly complex C1/C2 words (e.g., *ubiquitous*, *monumental*, *intractable*, *cognitive overload*) and use common academic terms (e.g., *widespread*, *significant*, *difficult*, *mental effort*).

---

## 🏛️ Structural Mapping Rule (P0)

> [!IMPORTANT]
> **Constraint:** The introduction must strictly follow the paragraph-by-paragraph and sentence-by-sentence structure of the `studybuddymatch.tex` template, only adapting the content to match **HanoiGO**.

### Mapping Blueprint:
1. **Preamble:** Clean and standard LaTeX setup using standard report packages (`report` document class, standard margins, hyperref, graphicx).
2. **Section 1: Study Background:**
   - **Introduction:** Digital Tourism context, Hanoi as an international tourist hub, and the challenges solo travelers face.
   - **Motivation Statement:** *"The decision to undertake this project is driven by both practical travel navigation needs and technical aspirations."*
   - **Motivation 1 (Practical - Optimization):** Resolving the multi-day trip sequencing problem (TSPTW) using K-Means and time-window heuristics.
   - **Motivation 2 (Practical - Social):** Creating an interactive location-based social platform with real-time matching and trip cloning instead of static copy-pasting.
   - **Motivation 3 (Technical Goals):** Applying NestJS backend, WebSockets, Redis messaging, PostGIS geospatial queries, and Gemini LLM integration.
3. **Section 2: Objectives:**
   - **Primary Objective:** Developing a fully functional web platform that facilitates convenient travel planning and social matchmaking for tourists.
   - **Functional Objectives:** Automated trip generator, WebSocket-Redis real-time messaging, interactive social feed with deep cloning, and coordinate-aware AI assistant.
   - **Technical Objectives:** Stateless JWT/HttpOnly cookie authentication, NestJS/Next.js stack, PostgreSQL/PostGIS databases, and K-Means/TSPTW performance.
4. **Spacing Resets:** Standard paragraph offsets and line spacing setups before closing the document.

---

## 🛠️ HanoiGO System Specifications (Modules 0-5)

These core components must be accurately referenced in all technical chapters:

| Module | Core Technology | Key Functions & Concepts |
|---|---|---|
| **Module 0: User & Security** | NestJS, Stateless JWT, HttpOnly Cookies | RBAC Role Access (USER/ADMIN), RolesGuard, password reset via Nodemailer, dedicated Admin management panel. |
| **Module 1: Places Discovery** | PostgreSQL + PostGIS | Landmark spatial point geometries (`Point, 4326`), SQL-level nearby proximity queries (`ST_DWithin`), parsed multi-dimensional opening hours. |
| **Module 2: Trip Planner** | NestJS, Goong Maps Distance Matrix API | Heuristic clustering (K-Means++), sequencing (Greedy Nearest Neighbor with Time Windows cost score), GPS Coordinate Cascade, Gap Insertion conflict resolution, API Exponential Backoff & Haversine fallbacks. |
| **Module 3: Activity & Group Chat** | WebSocket Gateway (Socket.io in-memory), Leaflet | Proximity matchmaking, smart Leaflet marker state animations (Upcoming, Live, Ongoing, Ended), In-memory online presence and room mapping. |
| **Module 4: Shared Trips** | PostgreSQL transaction cloning | Split feed tabs (Groups/Shared Trips/Joined), Optimistic UI like/comments, Deep-transaction deep query replication (cloning `trip_days` and `trip_stops`). |
| **Module 5: AI assistant** | `[FUTURE WORK]` Gemini 2.5 Flash API (stub only) | Spatial coordinates injection, local contextual recommendation system, and cultural storytelling. |

---

## ✍️ Authentic Writing & Style Guidelines (P1)

To ensure the thesis report reads like an honest, high-quality, student-written technical document rather than generic AI marketing:

- **Sentence Structure:** Prefer simple, direct, and active sentences. Avoid long paragraphs that sound like promotional text.
- **Banned Words & Phrases:** Do NOT use marketing or hyperbolic phrases such as *"cutting-edge"*, *"revolutionary"*, *"seamless experience"*, *"in today's fast-paced digital world"*, or *"this paper delves into"*.
- **Use Transitions Cautiously:** Do not overuse transitions like *"Furthermore"*, *"Moreover"*, or *"Additionally"*. Vary paragraph lengths naturally.
- **Explain Limitations & Trade-offs:** Real engineering projects have limitations. Be natural and concrete when describing trade-offs (e.g., in-memory WebSocket rooms without Redis scaling, API fallbacks, or data sparsity).
- **Tone for Unverified Ideas:** Use cautious wording for unmeasured or planned parts: *"The system is designed to"*, *"In the current implementation"*, or *"This was not measured yet"*.

---

## 🧩 Feature & Technology Description Pattern

Do not describe system features as a flat list. For every major feature/technology, explain it using this structure:

1. **Overview:** 1-2 simple sentences explaining what the feature does for the user.
2. **User Flow:** Who uses it, where they start, what inputs they provide, and what they see.
3. **Backend Flow:** Controller/service entry point, validation, database operation, socket events, or external APIs used.
4. **Frontend Flow:** Next.js page, form, Zustand store, component, and UI/loading states.
5. **Tool/Library/Technique:** The specific tool/technique used.
6. **Grounded Rationale:** Why it was chosen for this project (e.g., PostGIS for proximity calculations, Goong Maps for local routing API compatibility, Socket.io for immediate delivery of message packets without polling). Avoid claiming a tool was chosen "because it is the best".
7. **Limitation/Trade-off:** What the tool doesn't solve by itself or future improvements needed.

---

## 📚 Source Code Discipline

Every technical claim, schema design, or API description in the thesis report must be backed by evidence in the HanoiGO codebase:

| Report Content | Allowed Source Files in Repository |
|---|---|
| **Tech Stack & Overview** | `package.json` (root, client, actions), `docker-compose.yml`, `README.md`, `CLAUDE.md` |
| **Database Schema** | `actions/prisma/schema.prisma` |
| **Authentication & RBAC** | `actions/src/auth/` (JWT, Guards, session metadata) |
| **Trip Planner (K-Means/TSPTW)** | `actions/src/trips/` (clustering and routing heuristics) |
| **Real-time Gateway** | `actions/src/group-chat/` (Socket.io gateways) |
| **Geospatial & Discovery** | `actions/src/places/` (PostGIS geometry queries) |
| **Admin Panel & Moderation** | `actions/src/admin/` |
| **Interactive Maps UI** | `client/components/` and `client/app/` (Leaflet wrapper components) |

---

## 📊 Data, Figures, & LaTeX Placement Rules

- **Zero Numeric Invention:** Do not invent user counts, survey numbers, latency speed, or evaluation results. If a value was not measured, state that clearly.
- **LaTeX Formatting for Emphasis:**
  - **No `\textbf{}` or `\textit{}` in body paragraphs.** If emphasis is needed, rewrite the sentence instead. Bold/italic are reserved only for headers, subheaders, or template-defined elements.
  - Use `\texttt{}` strictly for code elements, file names, libraries, commands, API endpoints, and technical identifiers (e.g., `\texttt{GroupChatGateway}`).
- **Figure & Table Placement:**
  - Put figures/tables immediately after the first paragraph that introduces them.
  - Refer to every figure, diagram, and table in the text *before* it appears using `Figure~\ref{...}` and `Table~\ref{...}`. Never write "the figure below" or "the table above".
  - Chose a clear, descriptive caption that tells the reader what to notice.
  - Simplified vs Detailed: Use appendices for detailed, large-scale code snippets, database schemas, or long lists. Keep the main chapters focused on high-level architecture.

---

## 🛑 Forbidden Claims

Unless concrete evidence exists in the repository, do not claim:
1. *"The system is fully secure."* (State instead what security measures, e.g., JWT HttpOnly cookies, are implemented).
2. *"The platform improves tourist retention by X%."*
3. *"The routing/sequencing algorithm guarantees optimal results in all conditions."* (It is a heuristic approximation).
4. *"The application has been deployed for real public production users."*
5. *"The AI assistant is fully complete and operational."* (It is currently a stub/Future Work).
