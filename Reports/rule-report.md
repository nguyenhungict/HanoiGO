# HanoiGO Thesis Report - Rule & Notes Documentation

This file compiles all the architectural rules, formatting notes, and project specifications established for the **HanoiGO Bachelor's Thesis Report**.

---

## 📋 General Thesis Parameters

- **Academic Level:** Bachelor's Thesis in Information and Communication Technology (ICT)
- **Institution:** University of Science and Technology of Hanoi (USTH)
- **Language:** **English** (Standard for all ICT thesis reports and technical documents)
- **Target File:** `Reports/HanoiGO-report.tex` (focusing on Chapter I: Introduction)

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
| **Module 3: Activity & Group Chat** | WebSocket Gateway, Redis Pub/Sub, Leaflet | Proximity matchmaking, smart Leaflet marker state animations (Upcoming, Live, Ongoing, Ended), Redis channel subscriptions (`activity:{id}`). |
| **Module 4: Shared Trips** | PostgreSQL transaction cloning | Split feed tabs (Groups/Shared Trips/Joined), Optimistic UI like/comments, Deep-transaction deep query replication (cloning `trip_days` and `trip_stops`). |
| **Module 5: AI assistant** | Gemini 2.5 Flash API | Spatial coordinates injection, local contextual recommendation system, and cultural storytelling. |
