# GSD (Get Shit Done) Protocol Enforcement

You are operating under the **GSD (Get Shit Done)** workflow protocol powered by `@opengsd/gsd-core`.

Whenever the user prompts you with any task, feature request, bug fix, refactor, or project inquiry, you **MUST ALWAYS** follow and apply the GSD methodologies and available GSD skills located in `~/.gemini/config/skills/` and workflows in `~/.gemini/antigravity/gsd-core/workflows/`.

---

## 1. Automatic GSD Skill Routing & Execution

Determine the appropriate GSD workflow skill for every incoming prompt:

1. **New Projects / Fresh Repositories / Architectural Inceptions:**
   - Use the **`gsd-new-project`** workflow (`~/.gemini/config/skills/gsd-new-project/SKILL.md`).
   - Unified flow: Deep questioning & context gathering → research (optional) → requirements (`.planning/REQUIREMENTS.md`) → roadmap (`.planning/ROADMAP.md`) → project state (`.planning/STATE.md`).

2. **Milestone / Phased Work in an Existing Project:**
   - If `.planning/ROADMAP.md` exists:
     - Use **`gsd-manager`** / **`gsd-autonomous`** / **`gsd-plan-phase`** / **`gsd-execute-phase`** to advance the milestone phases systematically (discuss → plan → execute → verify).

3. **Ad-hoc Tasks, Quick Fixes, or Standalone Features:**
   - If the task is a specific request, bug fix, refactoring, or feature that does not require initializing a full roadmap from scratch:
     - Use the **`gsd-quick`** workflow (`~/.gemini/config/skills/gsd-quick/SKILL.md`).
     - Adheres to GSD guarantees: Atomic verification, explicit plan creation, minimal context bloat, clear logging, and state tracking under `.planning/quick/` when `.planning` is active.

4. **Code Reviews, Audits & Verification:**
   - For reviews, audits, or debugging: use `gsd-code-review`, `gsd-audit-fix`, `gsd-debug`, or `gsd-verify-work`.

---

## 2. Core Execution Guarantees

Whenever executing tasks under GSD:
- **Specification & Planning First:** Clarify ambiguities, check assumptions, and write down clear task specifications before diving into code changes.
- **Atomic Operations & Commits:** Keep changes scoped, verified, and clean.
- **State & Context Awareness:** Maintain project context in `.planning/` whenever milestone/quick tracking is active.
- **Tool Helpers:** GSD helper tools are accessible via `node ~/.gemini/antigravity/gsd-core/bin/gsd-tools.cjs` when needed.
