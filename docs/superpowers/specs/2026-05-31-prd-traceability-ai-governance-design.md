# PRD Traceability And AI Governance Design

## Goal

Build a delivery-control layer for BenchmarkIQ that combines PRD completion tracking, formal report review states, export gating, fact-pack registry, AI citation audit, and narrative locking. The goal is to make the tool answer: which requirements are done, whether the current report is export-ready, which facts support each AI paragraph, and whether edited text is approved for formal delivery.

## Product Context

BenchmarkIQ already supports target/peer/year selection, project saving, peer-group governance, VQA diagnosis, topic fact packs, AI narrative drafts, formal HTML reports, data exports, and PPTX export. The next bottleneck is not more charts; it is delivery confidence. Users need to see requirement coverage, review status, fact traceability, and export readiness before using the report as a board-facing artifact.

This iteration combines two approved routes:

- Route 1: PRD traceability and delivery review workflow.
- Route 3: fact-pack driven AI writing governance.

## Users And Decisions

Primary users:

- Board office users need to know whether the report is safe to export.
- Strategy and finance reviewers need to know whether facts and metrics are traceable.
- Analysts need to know which PRD items are still partial or blocking.
- Consultants need to lock reviewed language before final delivery.

Primary decisions:

- Can this report move from Draft to Review?
- Can this report be Locked for delivery?
- Can HTML/PDF/PPTX export proceed without a blocking warning?
- Which AI paragraphs need fact or citation repair before export?

## Scope

### In Scope

- A PRD coverage matrix for PRD-01 through PRD-40.
- Requirement status values: `done`, `partial`, `missing`, `blocked`.
- Requirement severity values: `info`, `warn`, `blocker`.
- Evidence references for implemented requirements, pointing to local files/functions/modules.
- A formal delivery state machine: `draft`, `review`, `locked`.
- Export gate checks that combine current readiness checks, PRD blockers, AI citation audit, and report lock status.
- A fact-pack registry that assigns stable IDs to topic and chart fact packs.
- AI citation audit for board, market, and action narratives.
- Narrative lock state per topic/channel so edited text can become the delivery source.
- UI panels in the existing review/governance surfaces rather than a new standalone app.
- Data workbook export additions for PRD coverage, fact-pack registry, AI citation audit, and narrative lock state.

### Out Of Scope

- Full remote collaboration or user accounts.
- Server-side persistence.
- PPTX vectorized chart conversion.
- Replacing the existing local or HTTP AI provider.
- Rewriting the full formal report engine.
- Adding new financial metrics unrelated to traceability or AI governance.

## Architecture

The implementation should add small focused modules that sit above existing engines:

- `js/28-prd-traceability.js`: PRD matrix, evidence mapping, requirement checks, and PRD dashboard rendering.
- `js/29-ai-governance.js`: fact-pack registry, narrative citation audit, narrative lock state, and AI governance UI rendering.
- Existing `js/16-trial-checks.js`: extend export readiness with PRD, AI, and lock checks.
- Existing `js/07-export.js`: extend data workbook sheets with traceability and governance rows.
- Existing `index.html`: add review/governance host containers.
- Existing `styles/rsm-deck.css`: add RSM-style panels for PRD and AI governance.

The new modules must read existing state and helper functions rather than duplicating analysis logic. They should not own VQA scoring, topic judgement, export generation, or AI generation.

## Data Model

### PRD Requirement

Each requirement is represented as:

```js
{
  id: "PRD-01",
  group: "项目版本管理",
  title: "新建分析项目",
  description: "用户可创建一个新的分析项目，填写项目名称。",
  severity: "warn",
  status: "done",
  evidence: [
    { file: "js/09-projects.js", symbol: "createProjectBtn" },
    { file: "js/09-projects.js", symbol: "projectSnapshotWithMeta" }
  ],
  check: "projectCreate"
}
```

Statuses:

- `done`: implemented and covered by a deterministic check.
- `partial`: a visible or logical skeleton exists, but acceptance is incomplete.
- `missing`: no meaningful implementation exists.
- `blocked`: missing or failing requirement should block formal export.

Severities:

- `info`: useful context, does not affect export.
- `warn`: export can proceed with warning.
- `blocker`: export should be blocked unless the user intentionally remains in draft mode.

### Delivery State

Delivery state is stored in `state.deliveryReview` and persisted in project snapshots:

```js
{
  status: "draft",
  updatedAt: "2026-05-31T00:00:00.000Z",
  reviewer: "本机用户",
  notes: [],
  lockedAt: null
}
```

Allowed transitions:

- `draft -> review`: allowed when a report exists and no critical runtime error is detected.
- `review -> locked`: allowed when export gate has no blockers.
- `locked -> draft`: allowed after editing inputs, narratives, project scope, or report version.

### Fact-Pack Registry Entry

Each fact-pack entry is represented as:

```js
{
  id: "fact_topic_profit_2025_苏州农商行",
  type: "topic",
  topicId: "profit",
  title: "盈利真实性专题",
  source: "buildTopicFactPackObject",
  metrics: ["coreRevenueGrowth", "feeAssetRatio", "cashProfitRatio"],
  riskLevels: ["L1", "L2"],
  citations: [
    { metric: "feeAssetRatio", label: "手续费资产比", value: "0.18%", role: "required" }
  ],
  updatedAt: "2026-05-31T00:00:00.000Z"
}
```

### Narrative Audit Entry

Each narrative audit entry is represented as:

```js
{
  topicId: "profit",
  channel: "board",
  source: "edited",
  locked: false,
  citationCount: 3,
  requiredCitationCount: 2,
  numberCheck: "pass",
  status: "pass",
  issues: []
}
```

Audit statuses:

- `pass`: enough citations and number checks pass.
- `warn`: citations exist, but required citations are degraded or risk is elevated.
- `fail`: no citations, unauthorized numbers, or empty narrative.

## UI Design

### PRD Coverage Dashboard

Location: review or governance workspace.

Content:

- Top summary: done / partial / missing / blockers.
- Requirement groups: project management, peer governance, topic rules, metric review, AI writing, HTML report, PPTX export.
- Requirement cards with status, severity, evidence, and short next action.
- Filter buttons: all, blockers, partial, missing.

The panel should be operational, not decorative. A user should be able to inspect exactly why export is warned or blocked.

### Delivery Review Panel

Location: existing review panel.

Content:

- Current state: Draft, Review, or Locked.
- Transition buttons: send to review, lock report, unlock to draft.
- Gate result summary: blockers, warnings, last checked time.
- Review notes list.

Locking should not freeze the whole app; it locks delivery language and marks the current report state as approved. Subsequent edits to project scope, AI text, or report version should reset the state to Draft.

### AI Governance Panel

Location: topic workbench and review workspace.

Content:

- Fact-pack registry summary by topic.
- AI audit by topic/channel.
- Citation tags and number-check result.
- Lock/unlock buttons for each narrative.

Locked text should display as the delivery source. Locked narrative textareas are disabled; the user must click an explicit unlock action before editing, and unlocking resets the delivery state to Draft.

## Data Flow

1. User confirms analysis scope.
2. Existing engines produce VQA diagnosis, topic facts, chart facts, narratives, and formal report.
3. PRD traceability module evaluates requirement checks against current functions, state, DOM anchors, and config.
4. AI governance module builds fact-pack registry from topic and chart fact pack functions.
5. AI governance module audits each narrative against citations and fact-pack number tokens.
6. Export gate combines existing trial checks with PRD blockers, AI audit failures, and delivery lock status.
7. UI panels render summaries and issue lists.
8. Export workbook includes PRD, fact-pack, audit, and lock state sheets.

## Error Handling

- Missing optional functions should produce `partial` or `warn`, not crash the page.
- Missing required functions for export gate should produce a blocker with a clear label.
- Corrupt localStorage delivery state should fall back to Draft.
- Empty AI narrative should fail audit for that topic/channel.
- Citation degradation should warn unless the topic is selected for formal report and has no fallback citations, in which case it blocks lock.
- If the user changes scope after locking, delivery state resets to Draft with a note: "分析口径已变化，需重新复核。"

## Testing Strategy

Static tests:

- PRD matrix exposes PRD-01 through PRD-40.
- Every PRD entry has id, group, title, status, severity, and evidence.
- Fact-pack registry emits stable IDs.
- Narrative audit marks empty or uncited narratives as fail.
- Export gate blocks when delivery is not locked or AI audit has failures.

Runtime checks:

- `node --check` for new and modified JS files.
- Browser smoke test: confirm analysis, open review tab, verify PRD dashboard appears.
- Browser smoke test: lock is unavailable when blockers exist.
- Browser smoke test: edited narrative appears in audit and workbook export.
- Export smoke test: HTML export still works after gate passes or warns correctly in Draft.

Regression checks:

- Existing project save/load still persists target, peers, year, report version, included topics, edited narratives, and included charts.
- Existing peer group save/edit/apply still works.
- Existing formal report sections still render and side navigation updates.
- Existing workbook export still contains current sheets plus new governance sheets.

## Acceptance Criteria

- PRD Coverage Dashboard shows PRD-01 through PRD-40 with grouped status.
- At least one deterministic check exists for every requirement group.
- Delivery state can move Draft -> Review -> Locked and reset to Draft on material edits.
- Export gate reports blockers and warnings in the existing project status area.
- AI governance audit covers board, market, and action channels for every topic.
- Each audited narrative shows citation count and pass/warn/fail status.
- Locked narratives are used by formal report and export paths.
- Data workbook includes PRD coverage, fact-pack registry, AI citation audit, and narrative lock sheets.

## Implementation Boundaries

The first implementation should be local-only and browser-only, following the existing app architecture. Do not introduce a backend, build system, framework migration, or new package dependency. The goal is to create an inspectable governance layer that improves confidence without destabilizing the current report generator.
