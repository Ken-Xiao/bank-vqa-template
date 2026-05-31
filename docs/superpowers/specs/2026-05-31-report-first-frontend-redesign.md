# Report-First Frontend Redesign

Date: 2026-05-31
Product: BenchmarkIQ 银行经营对标分析平台
Decision: Choose layout direction B, "Report First"

## Goal

Redesign the front end around formal report delivery rather than a long stacked workbench. The page should feel like a professional consulting report production cockpit: users first see the decision answer and report canvas, then adjust structure, evidence, export readiness, and governance controls around that canvas.

The redesign keeps the RSM-style color language already used by the project: navy, cyan blue, green accent, white surfaces, restrained gray separators, and dense but readable consulting UI.

## Core Layout

The main screen becomes a three-zone report workspace.

1. Top decision bar
   - Shows target bank, year, report version, peer group, data confidence, delivery status, and export entry.
   - Keeps primary actions visible: update analysis, save version, export deliverables.
   - Replaces the current oversized hero with a compact operational header.

2. Central report canvas
   - Primary viewport is the formal report reading experience.
   - The first visible content is the executive answer, not setup text.
   - The report canvas should use wider text blocks, larger headings, clearer page breaks, and a consulting report rhythm: SCQA answer, evidence blocks, implication notes, action section.

3. Right report control rail
   - Contains report structure editor, CEAM writing structure, export sequence QA, delivery review, and AI governance summary.
   - Works as a persistent review panel for the report currently visible in the center.
   - Keeps controls compact and task-oriented; no nested cards.

## Navigation Model

Current six tabs stay conceptually, but their hierarchy changes.

- Report is the default workspace after analysis is formed.
- Overview becomes a compact decision summary section inside the report-first view.
- Topics and Data become supporting drawers or secondary tabs.
- Review becomes the right rail, not a separate destination users must remember to visit.
- Governance remains available but is visually quieter and accessed from the right rail or a top utility menu.

This avoids the current problem where users must scroll through many modules before reaching the actual deliverable.

## Information Hierarchy

The screen must answer these questions in order:

1. What is the current board-level answer?
2. Is the report structure coherent?
3. Which evidence supports the answer?
4. Are AI narratives and citations safe to use?
5. Can the report be exported without page-order or governance breaks?

The first viewport should include:

- Board-level answer title
- Three to four KPI chips
- Formal report page preview
- Right rail with structure/export status

The sample selector remains available but should not dominate the first viewport once analysis is confirmed.

## Key Components

### Compact Top Bar

Includes:
- RSM / BenchmarkIQ brand
- Target bank
- Peer group count
- Report version selector
- Data confidence indicator
- Export dropdown

Visual treatment:
- Navy background or white header with navy text depending on density.
- Thin RSM color bars as brand signal.
- No oversized hero copy.

### Report Canvas

Includes:
- Formal report shell
- Sticky mini table of contents
- Current page title
- Larger body text than the current report preview
- Evidence and management implication callouts

Visual treatment:
- White page on light gray workspace.
- Report max width around 980-1120px.
- Clear page rhythm with section breaks.
- Headings should feel like consulting action titles, not dashboard labels.

### Right Rail

Includes:
- Report structure editor V1
- CEAM checklist
- Export page sequence QA
- Delivery gate status
- AI citation and risk summary

Visual treatment:
- Fixed width around 320-360px on desktop.
- Vertical sections separated by rules, not heavy card stacks.
- Status chips use green / amber / red sparingly.

### Supporting Drawers

Sample setting, topic workbench, and data dictionary should become secondary task surfaces:
- Sample drawer: target bank, peers, year, report version.
- Topic drawer: topic facts, generated narratives, citations.
- Data drawer: completeness, metric dictionary, pending data.

The user should be able to open these without losing the report context.

## Responsive Behavior

Desktop:
- Top bar fixed.
- Center report canvas plus right rail.
- Optional left mini navigation only when the report is long.

Tablet:
- Right rail collapses below the report or into a segmented panel.
- Top actions remain visible.

Mobile:
- Single-column report-first layout.
- Structure/review controls become accordion sections below the executive answer.

## Figma Deliverable

Create one Figma page with:

1. Desktop report-first screen, 1440px wide.
2. Desktop right rail detail state.
3. Mobile stacked state, 390px wide.
4. Component notes for:
   - top decision bar
   - report canvas
   - right rail status module
   - drawer entry pattern

If the Figma connector is unavailable in this environment, produce the same design as a local HTML mockup and implementation-ready CSS/HTML specification, then transfer to Figma manually or in a later connected session.

## Acceptance Criteria

- The default post-analysis view leads with the formal report canvas.
- The first viewport shows a board-level answer, report status, and export readiness.
- The report structure editor and export QA are visible without switching tabs.
- Text hierarchy is larger and clearer than the current report view.
- The layout keeps RSM professional colors without becoming a one-color blue dashboard.
- No decorative gradient blobs, oversized marketing hero, or nested UI cards.
- The design can be implemented incrementally without rewriting analysis logic.

## Open Implementation Notes

- Existing `formalReport`, `reportStructureEditor`, `exportSequenceQaPanel`, and `aiGovernancePanel` should be reused rather than rebuilt.
- Existing workspace tabs can be remapped in CSS/HTML first; JS logic should remain stable where possible.
- The first implementation phase should be visual/layout only. Functional behavior should remain unchanged except for default tab priority.
