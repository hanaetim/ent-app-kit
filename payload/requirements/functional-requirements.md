# Functional Requirements — Customer Analysis System

This document defines the core functional requirements, features, and acceptance criteria for the Customer Analysis System MVP. Requirements are organized by functional area and mapped to agent responsibilities.

## FR-001: Data Extraction and Validation

### Description
Extract customer service data from CRM system for the analysis cycle period and validate completeness against coverage requirements.

### Acceptance Criteria
- **AC-001.1:** System extracts service reports for all active customers within the cycle period (e.g., November 1-30, 2024)
- **AC-001.2:** System validates data completeness: ≥95% of active customers have at least one service report
- **AC-001.3:** Coverage gate (G1) blocks progression to quantitative analysis if coverage < 95%
- **AC-001.4:** Coverage exception routed to analyst review queue with metrics (coverage %, missing customer count)
- **AC-001.5:** System fetches classification framework (DPS4) for profitability tier mapping

### Agent Responsibility
- **AGN1 (Report Extraction):** Executes extraction via TOL1 (fetch_service_reports)
- **AGN7 (Deterministic Rule Engine):** Validates coverage and enforces gate G1

### Zone
GREEN (deterministic data extraction and validation)

### Priority
**Critical** — Cannot proceed to analysis without data extraction

### Test Scenarios
1. **Nominal:** 100% coverage → gate passes, proceeds to quantitative analysis
2. **Coverage Insufficient:** 92% coverage → gate fails, routes to analyst queue
3. **No Data:** 0% coverage → system logs error, blocks cycle progression
4. **Framework Unavailable:** DPS4 framework fetch fails → system retries, then alerts on persistent failure

---

## FR-002: Quantitative Analysis

### Description
Calculate financial and operational metrics per customer, apply classification framework to assign profitability tiers, and compute service quality benchmarks.

### Acceptance Criteria
- **AC-002.1:** System calculates per-customer metrics: total service cost, total revenue, profit margin, service interaction count
- **AC-002.2:** System applies DPS4 profitability tier thresholds to classify customers (HIGH/MEDIUM/LOW/NEGATIVE)
- **AC-002.3:** System computes aggregate benchmarks: average satisfaction score, average response time, escalation rate
- **AC-002.4:** All quantitative outputs include citations to source data (service report IDs, framework section)
- **AC-002.5:** Quantitative insights routed to analyst review queue for validation before progression

### Agent Responsibility
- **AGN2 (Quantitative Analysis):** Executes calculations via TOL2 (fetch_classification_framework) and TOL3 (fetch_cost_revenue_data)

### Zone
AMBER (classification framework interpretation may require judgment)

### Priority
**Critical** — Foundation for all downstream analysis

### Test Scenarios
1. **Nominal:** Customer with $50K revenue, $10K cost → classified as HIGH profitability
2. **Negative Profitability:** Customer with $5K revenue, $8K cost → classified as NEGATIVE
3. **Benchmark Calculation:** 100 customers, 75 surveys, avg score 4.2 → avg_satisfaction_score = 4.2
4. **Missing Revenue Data:** Customer has service costs but no revenue → classified based on cost-only heuristic

---

## FR-003: Behavioral Interpretation

### Description
Analyze service interaction patterns to identify customer engagement levels, channel preferences, escalation trends, and behavioral characteristics.

### Acceptance Criteria
- **AC-003.1:** System classifies customers by engagement level (HIGH/MEDIUM/LOW/DORMANT) based on interaction frequency
- **AC-003.2:** System identifies primary service channel per customer (phone/email/portal/visit)
- **AC-003.3:** System flags escalation patterns (customers with >2 escalations in cycle period)
- **AC-003.4:** All behavioral insights cite source service reports with [REF: service_report_id]
- **AC-003.5:** Behavioral insights routed to analyst review queue for validation

### Agent Responsibility
- **AGN3 (Behavioral Interpretation):** Analyzes service history via TOL1 (fetch_service_reports)

### Zone
AMBER (LLM-based pattern interpretation)

### Priority
**High** — Provides actionable insights for account management

### Test Scenarios
1. **High Engagement:** Customer with 8 interactions in November → classified as HIGH engagement
2. **Dormant:** Customer with no interactions for 4 months → classified as DORMANT
3. **Channel Preference:** 80% of customer interactions via phone → primary_channel = "phone"
4. **Escalation Pattern:** Customer with 3 escalations in cycle → flagged for account manager review

---

## FR-004: Satisfaction Analysis

### Description
Analyze customer satisfaction survey responses, aggregate scores, perform sentiment analysis on free-text feedback, and identify satisfaction drivers.

### Acceptance Criteria
- **AC-004.1:** System aggregates satisfaction scores per customer and per segment
- **AC-004.2:** System performs sentiment analysis on Arabic free-text survey feedback (POSITIVE/NEUTRAL/NEGATIVE/MIXED)
- **AC-004.3:** System identifies top satisfaction drivers (positive feedback themes) and detractors (negative feedback themes)
- **AC-004.4:** All satisfaction insights cite source survey responses with [REF: survey_id]
- **AC-004.5:** Satisfaction insights routed to analyst review queue for validation

### Agent Responsibility
- **AGN4 (Satisfaction Analysis):** Analyzes survey data via TOL4 (fetch_survey_responses)

### Zone
AMBER (NLP sentiment analysis over Arabic text)

### Priority
**High** — Critical for ADGEP KPI reporting

### Test Scenarios
1. **Positive Sentiment:** Survey text "الخدمة ممتازة" → sentiment = POSITIVE
2. **Negative Sentiment:** Survey text "وقت الانتظار طويل جداً" → sentiment = NEGATIVE
3. **Mixed Sentiment:** Survey text contains both praise and complaint → sentiment = MIXED
4. **Satisfaction Trend:** Average score 4.1 in November vs. 3.9 in October → positive trend identified

---

## FR-005: Customer Segmentation

### Description
Group customers into actionable segments based on profitability, engagement, and satisfaction dimensions, and generate segment profiles with characteristics and recommendations.

### Acceptance Criteria
- **AC-005.1:** System groups customers into 5-8 segments using multi-dimensional clustering
- **AC-005.2:** Each segment has Arabic name, English name, profitability tier, engagement level, average satisfaction score, customer count
- **AC-005.3:** Each segment includes characteristics (Arabic narrative) and recommendations (Arabic narrative)
- **AC-005.4:** Segment definitions cite source data dimensions (profitability from AGN2, engagement from AGN3, satisfaction from AGN4)
- **AC-005.5:** Segmentation results routed to analyst review queue for validation

### Agent Responsibility
- **AGN5 (Segmentation):** Performs clustering via TOL5 (fetch_segmentation_data)

### Zone
AMBER (multi-dimensional clustering with LLM-assisted labeling)

### Priority
**High** — Enables targeted strategic initiatives

### Test Scenarios
1. **High-Value Segment:** HIGH profitability + HIGH engagement + satisfaction ≥4.0 → "مرتفع الربحية، مرتفع التفاعل"
2. **At-Risk Segment:** MEDIUM profitability + LOW engagement + satisfaction <3.5 → "متوسط الربحية، منخفض التفاعل"
3. **Dormant Segment:** Any profitability + DORMANT engagement → "عملاء خاملون"
4. **Segment Size Validation:** No segment has <5% of total customers (too granular) or >50% (too broad)

---

## FR-006: Report Authoring and Lifecycle

### Description
Synthesize quantitative and qualitative insights into a comprehensive Arabic narrative report, manage report review workflow, and enforce lifecycle states (draft → approved → locked → archived).

### Acceptance Criteria
- **AC-006.1:** System generates Arabic report with sections: executive summary, quantitative analysis, behavioral insights, satisfaction analysis, segmentation results, recommendations
- **AC-006.2:** Report includes metadata: cycle ID, analysis period, total customers analyzed, average satisfaction score, workflow state
- **AC-006.3:** All claims in report narrative cite source data with [REF: ...] format
- **AC-006.4:** Report routed to analyst review queue after authoring; analyst can approve/modify/reject
- **AC-006.5:** Analyst-approved report routed to Section Head review queue (RED zone gate G3)
- **AC-006.6:** Section Head can approve (→ APPROVED state), return for rework (→ DRAFT_AUTHORING state), or reject (→ PENDING state)
- **AC-006.7:** Approved reports can be locked by Section Head (immutable for compliance)
- **AC-006.8:** Locked reports cannot be modified; any change requires unlocking (audit trail required)

### Agent Responsibility
- **AGN6 (Report Authoring & Lifecycle):** Authors report, manages workflow via TOL6 (fetch_report_lifecycle_state) and TOL7 (fetch_bpms_workflow_state)

### Zone
AMBER (report authoring), RED (Section Head approval gate)

### Priority
**Critical** — Deliverable artifact for stakeholders

### Test Scenarios
1. **Nominal Workflow:** Draft authored → analyst approves → Section Head approves → report locked
2. **Rework Loop:** Draft authored → Section Head returns for rework (with comments) → AGN6 revises → re-submitted for review
3. **Rejection:** Draft authored → Section Head rejects → cycle returns to PENDING
4. **Lock Enforcement:** Attempt to modify locked report → system blocks with error "Report is locked"
5. **Citation Coverage:** Report with missing citations → citation gate (G2) blocks progression to Section Head review

---

## FR-007: Deterministic Rule Engine

### Description
Enforce workflow gates, validate citation traceability, route decisions to appropriate queues, and maintain workflow state machine integrity.

### Acceptance Criteria
- **AC-007.1:** System enforces coverage gate (G1): blocks quantitative analysis if coverage < 95%
- **AC-007.2:** System enforces citation traceability gate (G2): scans all AMBER outputs for missing citations, routes violations to analyst queue
- **AC-007.3:** System routes workflow transitions based on state machine rules (no invalid state transitions)
- **AC-007.4:** System logs all gate decisions to audit trail (cycle_id, gate_id, decision, actor, timestamp, details)
- **AC-007.5:** System monitors HITL review queues (analyst, Section Head) for decision updates and triggers next workflow step

### Agent Responsibility
- **AGN7 (Deterministic Rule Engine):** Executes all gate validation and routing logic via TOL2 (framework), TOL7 (BPMS state), TOL8 (BPMS routing)

### Zone
GREEN (deterministic validation and routing)

### Priority
**Critical** — Ensures workflow integrity and compliance

### Test Scenarios
1. **Gate G1 Pass:** Coverage 96% → gate passes, workflow proceeds to QUANTITATIVE state
2. **Gate G1 Fail:** Coverage 92% → gate fails, routes to analyst queue, blocks QUANTITATIVE state
3. **Gate G2 Violation:** Insight "Customers prefer phone support" with no citation → routed to analyst queue with violation annotation
4. **Invalid State Transition:** Attempt to transition DRAFT_AUTHORING → LOCKED (skipping approval states) → system blocks with error

---

## FR-008: HITL Review Queues (File-Based)

### Description
Provide file-based HITL review queues for analysts and Section Head to review and approve AI-generated outputs (MVP scope: no visual UI).

### Acceptance Criteria
- **AC-008.1:** System writes analyst review queue items to CSV files at `output/review_queues/analyst/`
- **AC-008.2:** Analyst queue CSV includes columns: cycle_id, item_type, item_id, zone, violation_type, status, analyst_notes
- **AC-008.3:** Analysts modify `status` column to `approved`, `modified`, or `rejected` and save file
- **AC-008.4:** System monitors analyst queue directory for file updates and triggers next workflow step on approval
- **AC-008.5:** System writes Section Head review queue items to JSON files at `output/review_queues/section_head/`
- **AC-008.6:** Section Head queue JSON includes: cycle_id, report_title, summary_metrics, decision, section_head_comments
- **AC-008.7:** Section Head sets `decision` field to `approve`, `return_for_rework`, or `reject` and saves file
- **AC-008.8:** System monitors Section Head queue directory for decision updates and triggers workflow transition

### Agent Responsibility
- **AGN7 (Deterministic Rule Engine):** Manages queue population and monitoring

### Zone
GREEN (queue management), AMBER (analyst review), RED (Section Head review)

### Priority
**High** — Enables human oversight of AI outputs

### Test Scenarios
1. **Analyst Approval:** Analyst sets status=approved for behavioral insight → system proceeds to satisfaction analysis
2. **Analyst Modification:** Analyst sets status=modified, adds citation in notes → system updates insight and proceeds
3. **Section Head Approval:** Section Head sets decision=approve → report transitions to APPROVED state
4. **Section Head Rework:** Section Head sets decision=return_for_rework with comments → report returns to DRAFT_AUTHORING

---

## FR-009: Audit Trail and Logging

### Description
Log all workflow transitions, gate decisions, and human review actions to structured audit trail for compliance and debugging.

### Acceptance Criteria
- **AC-009.1:** System logs all workflow state transitions with: cycle_id, from_state, to_state, actor, timestamp, decision, details
- **AC-009.2:** System logs all gate evaluations with: gate_id, decision (PASS/FAIL), details (coverage %, citation violations, etc.)
- **AC-009.3:** System logs all HITL review decisions with: reviewer_id, decision, timestamp, comments
- **AC-009.4:** Logs written to stdout in structured JSON format (MVP scope: no database persistence)
- **AC-009.5:** Each log entry includes trace_id for end-to-end cycle traceability

### Agent Responsibility
- **All agents (AGN1-AGN7):** Log actions to stdout
- **AGN7 (Deterministic Rule Engine):** Aggregates audit trail for compliance reporting

### Zone
GREEN (deterministic logging)

### Priority
**Medium** — Required for compliance, not blocking for functional acceptance

### Test Scenarios
1. **Workflow Transition Log:** EXTRACTION → QUANTITATIVE transition logged with AGN1 as actor
2. **Gate Decision Log:** Coverage gate (G1) PASS logged with coverage=96.5%
3. **HITL Decision Log:** Analyst approval logged with analyst_id, timestamp, decision=approved

---

## FR-010: Fixture Data Seeding

### Description
Seed synthetic fixture data (customers, service reports, surveys, classification framework) for MVP testing and demonstration.

### Acceptance Criteria
- **AC-010.1:** System provides seeding script that generates 50-100 synthetic customers
- **AC-010.2:** System generates 500-1000 service reports linked to customers (current + prior month)
- **AC-010.3:** System generates 200-400 survey responses linked to service reports (40-80% response rate)
- **AC-010.4:** System loads DPS4 classification framework fixture (JSON)
- **AC-010.5:** All customer names are Arabic synthetic names (no real PII)
- **AC-010.6:** Fixture data distributions match real-world patterns: profitability (20% HIGH, 40% MEDIUM, 30% LOW, 10% NEGATIVE), satisfaction scores (normal distribution around 4.0)
- **AC-010.7:** Seeding script is idempotent (can be re-run without duplicating data)

### Agent Responsibility
- **No agent involvement** — seeding is a setup step before cycle execution

### Zone
GREEN (deterministic data generation)

### Priority
**High** — Required for MVP testing

### Test Scenarios
1. **Fresh Seed:** Run seeding script on empty database → generates all fixtures
2. **Re-Seed:** Run seeding script twice → second run clears and regenerates (no duplicates)
3. **Data Validation:** Seeded customers have valid profitability tiers, engagement levels, Arabic names

---

## FR-011: CLI Execution Interface

### Description
Provide command-line interface for executing analysis cycles, monitoring progress, and accessing review queues (MVP scope: no web UI).

### Acceptance Criteria
- **AC-011.1:** System provides CLI command to start analysis cycle: `python -m customer_analysis.cli run-cycle --cycle-id=2024-11-cycle`
- **AC-011.2:** CLI displays progress updates as workflow advances through states
- **AC-011.3:** CLI blocks at HITL review gates (analyst, Section Head) and displays queue file paths
- **AC-011.4:** CLI provides command to check workflow state: `python -m customer_analysis.cli check-state --cycle-id=2024-11-cycle`
- **AC-011.5:** CLI provides command to list pending review queue items: `python -m customer_analysis.cli list-queue --queue=analyst`
- **AC-011.6:** CLI provides command to lock approved report: `python -m customer_analysis.cli lock-report --cycle-id=2024-11-cycle`

### Agent Responsibility
- **AGN6 (Report Authoring & Lifecycle):** Provides CLI orchestration logic
- **AGN7 (Deterministic Rule Engine):** Executes workflow state transitions triggered by CLI

### Zone
GREEN (CLI orchestration)

### Priority
**High** — Primary UX surface for MVP

### Test Scenarios
1. **Run Cycle:** Execute `run-cycle` command → workflow progresses to first HITL gate (analyst review)
2. **Check State:** Execute `check-state` → CLI displays current workflow state and pending actions
3. **List Queue:** Execute `list-queue --queue=analyst` → CLI displays pending analyst review items
4. **Lock Report:** Execute `lock-report` after Section Head approval → report state transitions to LOCKED

---

## FR-012: Arabic Text Normalization

### Description
Normalize Arabic text inputs (survey feedback, customer names) for consistent storage, comparison, and reporting.

### Acceptance Criteria
- **AC-012.1:** System applies Unicode NFC normalization to all Arabic text fields
- **AC-012.2:** System collapses multiple whitespace characters to single space
- **AC-012.3:** System preserves RTL (right-to-left) direction markers in stored text
- **AC-012.4:** System uses UTF-8 encoding for all text storage (database, files, logs)
- **AC-012.5:** System handles optional Arabic diacritics (preserve if present in input)

### Agent Responsibility
- **AGN1 (Report Extraction):** Normalizes extracted text from CRM
- **AGN4 (Satisfaction Analysis):** Normalizes survey feedback text before sentiment analysis
- **AGN6 (Report Authoring):** Normalizes generated report text

### Zone
GREEN (deterministic text normalization)

### Priority
**Medium** — Required for consistent Arabic text handling

### Test Scenarios
1. **Whitespace Normalization:** "الخدمة    ممتازة" → "الخدمة ممتازة"
2. **NFC Normalization:** NFD-encoded "مرحباً" → NFC-encoded "مرحباً"
3. **Diacritic Preservation:** "مُرَحِّباً" (with diacritics) → preserved as-is

---

## Cross-Functional Requirements

### Integration with Classification Framework (DPS4)
- All profitability tier assignments reference DPS4 framework version and effective date
- Framework updates do not retroactively change prior cycle analysis results

### Integration with BPMS (Mock)
- All workflow state transitions persisted to BPMS mock (TOL7/TOL8)
- BPMS state is source of truth for workflow progression (not in-memory state)

### Citation Traceability Enforcement
- Every AI-generated insight, recommendation, or narrative claim must cite source data
- Citation format: `[REF: service_report_id | survey_id | framework_section]`
- Missing citations block workflow progression via gate G2

### Zone Contract Enforcement
- AMBER outputs cannot trigger GREEN zone write actions (e.g., report locking) without passing HITL review gates
- RED zone decisions (Section Head approval) cannot be automated or defaulted

---

## Non-Functional Requirements (Cross-Reference)

See separate documents for detailed NFR specifications:
- **Security/Privacy:** `payload/nfr/security-privacy.md`
- **Observability:** `payload/nfr/observability.md`
- **Performance:** Implicit in MVP scope (single-user CLI, no concurrency requirements)
- **Scalability:** Deferred to hardening phase (MVP targets 50-100 customers per cycle)

---

## References

- **Agent Architecture:** `payload/air/agent-architecture.md` (AGN1-AGN7 functional mapping)
- **Workflow Gates:** `payload/air/workflow-gates.md` (Gate enforcement details)
- **Data Contracts:** `payload/air/data-contracts.md` (Entity schemas and enumerations)
- **Business Context:** `payload/requirements/business-context.md` (SOP alignment)
- **Organizational Brief:** Enhancement Build Phase Brief: Customer Analysis System

---

**Version:** 1.0.0  
**Last Updated:** 2026-11-12  
**Status:** Binding for MVP implementation
