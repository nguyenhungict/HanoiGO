# HanoiGO Thesis Presentation - Slide Content Generation Rules

This document defines the rules, style constraints, and step-by-step workflow for translating contents from the thesis report `Reports/HanoiGO-report.tex` into presentation slide content. 

---

## 📋 1. Core Objective
Analyze a visual slide template from the `studybuddymatch` project (provided as an image) and extract text from `Reports/HanoiGO-report.tex` to generate matching slides for **HanoiGO**. The generated slide content must match the layout, structure, and text density of the sample image.

---

## 🏛️ 2. Writing Style & Tone Rules (P0)

To ensure the slides look like they were written by an honest, high-quality, undergraduate student rather than generic AI marketing:

### IELTS 6.0 - 6.5 Vocabulary Level:
- Use simple, clear, and direct English words.
- **Banned complex academic words:** *ubiquitous, cognitive overload, intractable, paramount, leverage, utilize, showcase, paradigm shift, meticulously, testament*.
- **Allowed simple replacements:** *widespread, mental effort, difficult, important, use, show, change, carefully, proof/sign*.

### Student Tone & Sentence Structure:
- Write in an active, simple, and direct voice.
- Avoid long, complex, compound sentences.
- Avoid overly promotional or exaggerated text.
- Do NOT use marketing buzzwords like *cutting-edge, revolutionary, seamless, state-of-the-art, game-changing*. Instead, use *useful, convenient, practical, simple, efficient*.

---

## 📐 3. Template Image Analysis Heuristics

When the user uploads the template slide image, the AI agent must perform a silent visual audit:
1. **Identify the Slide Layout:**
   - Single column vs. Two-column layout.
   - Presence of side panels, stat blocks, or progress steps.
   - Location of header, subtitle, and footer tags.
2. **Determine Information Density:**
   - Count the number of bullet points on the slide.
   - Count the average number of words per bullet point (aim for 6–10 words).
   - Identify whether the slide uses short phrases or full sentences.
3. **Analyze Visual Cues:**
   - Are key phrases bolded? (e.g., `\textbf{}` or Markdown bold `**`).
   - Are there specific icons, code snippets, or inline formula formatting?

---

## 🗺️ 4. Report Content Mapping

The agent must map the slide topics to the appropriate sections in `Reports/HanoiGO-report.tex` before summarizing:

| Slide Topic | Corresponding LaTeX Section |
|---|---|
| **Context / Problem** | `\section{Context}` |
| **Motivation** | `\section{Motivation}` |
| **Objectives** | `\section{Objectives}` |
| **System Architecture / Tech Stack** | Chapter 3 / System Design sections |
| **Key Features / Modules** | Chapter 4 / Implementation sections (User, Discovery, Planner, Chat) |
| **Future Work** | Future Work section (Redis, Gemini integration) |

---

## ✍️ 5. Content Reduction & Layout Matching Rules

- **Strict Bullet Limits:** Do not exceed the number of bullet points shown in the template image slide. If the template has 3 bullets, the generated slide must have exactly 3 bullets.
- **Formatting Match:** If the template slide highlights key terms in bold at the start of each bullet point, replicate this pattern (e.g., **Key Concept**: explanation).
- **No Placeholders:** All content must be fully written out based on real project facts from `HanoiGO-report.tex` and the codebase. Do not use placeholders like `[Insert details here]`.

---

## 🔄 6. Step-by-Step Execution Workflow (For the Agent)

1. **Step 1: Read the Template Image:**
   - Analyze the visual layout, bullet point structure, and formatting.
2. **Step 2: Read `Reports/HanoiGO-report.tex`:**
   - Find the matching chapter or section for the slide.
3. **Step 3: Draft Slide Content:**
   - Summarize the text using IELTS 6.0 - 6.5 student-level vocabulary.
   - Refine sentences to match the exact word count and structure of the template.
4. **Step 4: Format and Output:**
   - Output the slides in clean Markdown format.
   - Use `---` to separate slides.
   - For each slide, write a short metadata block indicating:
     - `Target Slide Layout:` (e.g., 2-column, 4-bullet list)
     - `Source Report Lines:` (e.g., Context, lines 177-186)
