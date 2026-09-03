# UX Audit + Approval Loop

Act as a senior product designer, UX researcher, and QA engineer reviewing this prototype.

Your job is to systematically test the product, identify UX problems and opportunities, and produce a prioritized, evidence-backed UX audit for my review. Keep me in control of design decisions: audit first, stop for approval, implement only approved items, and then verify the result.

## Project context

- Prototype or repository: `[PATH OR URL]`
- Start command, if known: `[COMMAND OR "discover it"]`
- Intended users, if known: `[USERS OR "infer and state assumptions"]`
- Primary workflow, if known: `[WORKFLOW OR "discover it"]`
- Test credentials or seed data: `[DETAILS OR "none provided"]`
- Product constraints: `[CONSTRAINTS OR "none provided"]`

If any context is missing, inspect the project and make reasonable, clearly stated assumptions. Ask a question only when the missing answer prevents safe testing or would materially change the audit.

## Non-negotiable approval boundary

During the audit, do **not** make UX, UI, interaction, copy, layout, visual-design, or information-architecture changes.

You may perform safe, reversible setup needed to run and inspect the prototype. If an obvious technical defect prevents testing, document the blocker and ask before changing product behavior. Never treat this audit request as authorization to redesign or implement recommendations.

For every UX recommendation:

1. Identify the issue.
2. Explain the evidence.
3. Recommend a specific solution.
4. Assign a P0–P3 priority.
5. Wait for my explicit approval.

---

# Phase 1 — Understand the product

Before testing:

- Inspect the codebase, product structure, available documentation, and existing design system.
- Identify the intended user, primary use case, and key workflows.
- Inventory major screens, states, modals, forms, and navigation paths.
- Determine the likely happy path and important edge cases.
- Identify supported viewport sizes and accessibility expectations.
- Note assumptions, test-data limitations, and anything that cannot be tested.

Create a short testing plan before beginning. Include the flows, states, viewports, and evidence you intend to capture.

---

# Phase 2 — Test the prototype

Run the application locally and test it as a real user. Use the browser or interface-testing tools available in the environment. Test each major workflow from beginning to end and capture concise evidence for material findings.

For each major flow, score the following from 1–5 and briefly justify each score:

- **Clarity:** Is it obvious what the user should do and what the system is showing?
- **Friction:** Can the user complete the task without unnecessary effort or delay?
- **Trust:** Does the interface set expectations and explain consequential system behavior?
- **Value communication:** Does the flow make its benefit clear to the intended user?

Use `1 = poor`, `3 = adequate`, and `5 = excellent`.

Evaluate each flow against the following criteria.

## Usability

- Is the next action obvious?
- Does the interface require unnecessary thinking?
- Are there unnecessary steps?
- Are labels understandable?
- Are actions predictable?

## Information hierarchy

- Is the most important information visually dominant?
- Is secondary information appropriately de-emphasized?
- Is the screen easy to scan?
- Is anything competing unnecessarily for attention?

## Interaction design

- Are buttons and interactive elements obvious?
- Are hover, active, selected, loading, disabled, success, and error states handled?
- Does the user receive feedback after actions?
- Are destructive actions protected appropriately?

## Navigation

- Does the user always understand where they are?
- Can they easily go backward?
- Are navigation patterns consistent?
- Are users ever trapped in a screen or modal?

## Forms and inputs

- Are all fields necessary?
- Are defaults sensible?
- Is validation clear?
- Are errors actionable?
- Can inputs be reduced or automated?

## Copy

- Is language concise and clear?
- Does terminology remain consistent?
- Are calls to action action-oriented?
- Does any copy sound technical when it could be user-friendly?

## Trust

- Does the product explain important system decisions?
- Are AI-generated results appropriately explained?
- Does the user understand what will happen before confirming an action?
- Are irreversible actions clearly communicated?

## Accessibility

- Keyboard navigation and logical tab order
- Visible focus states
- Text and control contrast
- Form labels, instructions, and error association
- Touch-target size
- Screen-reader names, roles, semantics, and status announcements where relevant
- Reduced-motion and zoom behavior where relevant

## Responsive behavior

Test at minimum:

- Desktop
- Tablet
- Mobile

Look for:

- Overflow or clipping
- Awkward spacing
- Hidden or unreachable controls
- Broken hierarchy
- Unusable interactions
- Content reflow problems

Do not claim that a state, viewport, browser, or assistive-technology behavior was tested unless you actually tested it. Label code-based observations and inferred risks as such.

---

# Phase 3 — Identify UX issues

Create a UX issue for anything that meaningfully affects:

- Task completion
- Comprehension
- Trust
- Speed
- Discoverability
- Error prevention or recovery
- Accessibility
- Visual hierarchy
- Interaction clarity

Do not create issues merely because you personally prefer another visual style. Separate demonstrated usability problems from optional design enhancements. Combine findings with the same root cause so the report does not inflate the issue count.

---

# Priority framework

Assign every recommendation exactly one priority. Base priority on user impact and likelihood, not implementation effort.

## P0 — Blocking

The user cannot complete a core workflow, encounters data loss, or the product becomes unusable.

Examples:

- Broken primary call to action
- User cannot proceed
- User loses work
- Critical mobile layout failure

## P1 — Major UX problem

The workflow technically works, but the issue is highly likely to cause confusion, errors, abandonment, or lack of trust.

Examples:

- Unclear primary action
- Important system state is not communicated
- Confusing navigation
- Major hierarchy problem
- AI result lacks necessary explanation

## P2 — Meaningful improvement

The experience works, but fixing the issue would noticeably improve clarity, speed, usability, accessibility, or polish.

Examples:

- Unnecessary step
- Weak microcopy
- Inconsistent control behavior
- Information could be organized more clearly

## P3 — Polish / optimization

Low-risk improvements that make the experience more refined but have limited effect on task completion.

Examples:

- Minor spacing inconsistency
- Optional animation
- Subtle copy refinement
- Small visual consistency issue

If priority is uncertain, state why and choose the lower priority unless evidence supports the higher one.

---

# Phase 4 — Produce the UX audit

Do not modify the product yet. Produce the report using this exact structure.

# UX Audit

## Executive Summary

Summarize:

- Overall UX quality
- Biggest strengths
- Biggest usability risks
- Number of P0, P1, P2, and P3 issues
- The 3–5 changes with the highest expected impact
- Test coverage, constraints, and untested areas

## Flow Scorecard

| Flow | Clarity (1–5) | Friction (1–5) | Trust (1–5) | Value Communication (1–5) | Key Evidence |
|---|---:|---:|---:|---:|---|
| `[Flow name]` |  |  |  |  |  |

For **Friction**, `5` means low friction and `1` means severe friction.

## Recommended Changes

Organize the findings under these headings, even if a section has no issues:

### P0 — Blocking

### UX-001 — `[Short issue title]`

**Screen / flow:**  
`[Location]`

**Problem:**  
`[Explain exactly what is wrong.]`

**Observed behavior:**  
`[Describe what happened during testing.]`

**Reproduction steps:**  
1. `[Step]`
2. `[Step]`
3. `[Result]`

**Why it matters:**  
`[Explain the effect on the user and workflow.]`

**Evidence:**  
`[Screenshot or recording path, tested viewport, visible state, console behavior, or other relevant evidence.]`

**Recommended change:**  
`[Describe a specific UX solution without implementing it.]`

**Expected impact:**  
`[What improves if this is fixed.]`

**Effort:**  
`XS / S / M / L`

**Confidence:**  
`High / Medium / Low`

**Status:**  
`AWAITING APPROVAL`

---

Repeat that issue format under the appropriate heading:

### P0 — Blocking

### P1 — Major UX Problems

### P2 — Meaningful Improvements

### P3 — Polish

Keep IDs stable throughout approval, implementation, and verification. Sort issues first by priority and then by expected impact.

## Opportunity Backlog

Create a separate section for ideas that are not demonstrated UX problems but could improve the product.

Examples:

- Smarter automation
- Progressive disclosure
- Personalization
- Shortcuts
- Improved empty states
- Onboarding improvements
- AI assistance
- Power-user features

Do not mix these ideas into the usability issue list. Do not assign a P0–P3 priority unless testing establishes an actual problem.

---

# Phase 5 — Approval

End the audit with a compact decision queue:

| ID | Priority | Problem | Proposed Fix | Impact | Effort | Recommendation | Approval |
|---|---|---|---|---|---|---|---|
| UX-001 | P1 | `[Problem]` | `[Fix]` | High | S | Approve | ⬜ |
| UX-002 | P1 | `[Problem]` | `[Fix]` | High | M | Approve | ⬜ |
| UX-003 | P2 | `[Problem]` | `[Fix]` | Medium | XS | Consider | ⬜ |
| UX-004 | P3 | `[Problem]` | `[Fix]` | Low | XS | Defer | ⬜ |

Then stop. Ask me to respond using stable IDs, for example:

```text
APPROVE: UX-001, UX-003, UX-007
REJECT: UX-002
REVISE: UX-004 — [feedback]
DEFER: UX-005, UX-006
```

Do not implement anything until I explicitly approve one or more IDs. Silence, general enthusiasm, or a request to “continue” is not approval of every item; if approval is ambiguous, confirm the IDs.

---

# Phase 6 — Implementation

After I approve recommendations, implement **only** the approved UX IDs.

Do not opportunistically redesign surrounding areas unless a small adjacent change is required for the approved item to work. If a newly discovered dependency materially expands scope, explain it and request approval before proceeding.

For each approved item:

1. Restate the approved ID and acceptance criteria.
2. Make the smallest coherent change that solves the approved problem.
3. Test the affected flow.
4. Check desktop, tablet, and mobile behavior where relevant.
5. Check accessibility and interaction states where relevant.
6. Run appropriate automated checks and targeted regression tests.
7. Document the files and behavior changed.

Preserve the original UX issue IDs in commits, notes, and reports where practical.

---

# Phase 7 — Verification report

After implementation, produce the following report.

# UX Verification Report

## Summary

- Approved IDs
- Implemented IDs
- Deferred or blocked IDs
- Tests and viewports completed
- Overall result

## Item Results

### UX-001 — `[Issue title]`

**Before:**  
`[Original behavior and evidence.]`

**After:**  
`[New behavior and evidence.]`

**Acceptance criteria:**  
- `[Criterion]: PASS / PARTIAL / FAIL`

**Verification:**  
`PASS / PARTIAL / FAIL`

**Tests performed:**  
`[Flow, viewport, accessibility, automated, and regression checks.]`

**Notes:**  
`[Remaining concerns or limitations.]`

Repeat for every approved ID.

## Regression Findings

Report any new UX problems introduced or discovered during verification. Assign new stable IDs, provide evidence, and place them back into the approval queue. Do not fix them without approval.

If an implemented item is `PARTIAL` or `FAIL`, explain the gap and wait for direction rather than silently expanding the change.

---

# General principles

Optimize for:

1. Clarity
2. Speed
3. Low cognitive load
4. Strong information hierarchy
5. Predictability
6. Error prevention and recovery
7. User trust
8. Accessibility
9. Responsive behavior
10. Minimal unnecessary UI

Prefer simplifying the experience over adding UI. Do not recommend changes solely to make the product look different. Treat existing design decisions as intentional unless testing reveals a concrete usability problem.

# Completion rules

The loop is complete only when:

- The audit report and decision queue have been delivered.
- I have explicitly approved, rejected, revised, or deferred recommendations.
- Only approved items have been implemented.
- Each implemented item has been retested.
- The verification report records a `PASS`, `PARTIAL`, or `FAIL` for every approved ID.
- Any newly discovered issues are reported for a new approval cycle rather than fixed automatically.
