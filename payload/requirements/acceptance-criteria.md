# Acceptance Criteria — Customer Analysis System

This document defines MVP acceptance gates and explicitly separates functional acceptance criteria (in scope for MVP) from deferred criteria (hardening phase). The Customer Analysis System MVP is accepted based on **functional completeness and workflow integrity**, not statistical reliability or production-grade performance.

## MVP Acceptance Philosophy

**Acceptance Tier:** Functional Acceptance  
**Not Required for MVP:** Statistical reliability evaluation, production performance benchmarks, real system integration

**Rationale:**  
The MVP demonstrates that the 7-agent architecture can execute a complete analysis cycle end-to-end with fixture-backed data, enforce gates and zone contracts, and produce a complete Arabic report through HITL review workflows. Statistical evaluation of LLM outputs (e.g., citation accuracy rates, hallucination detection, sentiment analysis F1 scores) is deferred to hardening phase when eval baselines are established.

---

## Functional Acceptance Criteria (In Scope for MVP)

### FAC-001: Complete Analysis Cycle Execution

**Criteria:**  
System executes a complete analysis cycle from PENDING state through LOCKED state, passing through all intermediate workflow states and mandatory gates.

**Test Procedure:**
1. Seed fixture data (50-100 customers, 500-1000 service reports, 200-400 surveys)
2. Execute CLI command: `python -m customer_analysis.cli run-cycle --cycle-id=2024-11-cycle`
3. Observe workflow progression:
   - PENDING → EXTRACTION (AGN1 extracts service reports)
   - EXTRACTION → QUANTITATIVE (Gate G1 passes with coverage ≥95%)
   - QUANTITATIVE → BEHAVIORAL → SATISFACTION → SEGMENTATION (AMBER zone agents)
   - SEGMENTATION → DRAFT_AUTHORING (AGN6 authors Arabic report)
   - DRAFT_AUTHORING → ANALYST_REVIEW (report queued for analyst)
   - Analyst approves in review queue file
   - ANALYST_REVIEW → SECTION_HEAD_REVIEW (report queued for Section Head)
   - Section Head approves in review queue file
   - SECTION_HEAD_REVIEW → APPROVED (Gate G3 passes)
   - APPROVED → LOCKED (manual lock command executed)

**Pass Condition:**  
Workflow advances through all states without errors; final report is in LOCKED state with all sections populated and cited.

**Priority:** CRITICAL

---

### FAC-002: Coverage Gate Enforcement (G1)

**Criteria:**  
Coverage gate blocks progression to QUANTITATIVE state when coverage < 95%, routes exception to analyst review queue, and allows progression after analyst approval or re-extraction.

**Test Procedure:**
1. Seed fixture data with intentionally incomplete coverage (e.g., 90%)
2. Execute cycle; observe workflow blocks at coverage gate
3. Verify analyst review queue contains coverage exception item
4. Analyst approves reduced coverage in queue file
5. Observe workflow proceeds to QUANTITATIVE state

**Pass Condition:**  
Gate blocks progression when coverage insufficient; analyst approval overrides gate and allows progression.

**Priority:** CRITICAL

---

### FAC-003: Citation Traceability Enforcement (G2)

**Criteria:**  
Citation traceability gate detects missing citations in AMBER zone outputs, routes violations to analyst review queue, and blocks progression until citations added.

**Test Procedure:**
1. Manually inject a behavioral insight without citation (simulate AGN3 omission)
2. Observe gate G2 detects violation and routes to analyst queue
3. Analyst adds citation in review queue notes field
4. Observe workflow proceeds after citation added

**Pass Condition:**  
Gate detects missing citations; workflow blocked until analyst resolves violations.

**Priority:** CRITICAL

---

### FAC-004: Section Head Approval Gate (G3)

**Criteria:**  
Section Head approval gate blocks report finalization until Section Head provides decision (approve/return_for_rework/reject); rework loops route report back to DRAFT_AUTHORING; approval allows locking.

**Test Procedure:**
1. Complete cycle through ANALYST_REVIEW
2. Observe Section Head review queue populated with report JSON
3. **Test 3a (Approval Path):** Section Head sets decision=approve → report transitions to APPROVED → manual lock command succeeds
4. **Test 3b (Rework Path):** Section Head sets decision=return_for_rework with comments → report returns to DRAFT_AUTHORING → AGN6 revises → re-submitted for review
5. **Test 3c (Rejection Path):** Section Head sets decision=reject → cycle returns to PENDING

**Pass Condition:**  
All three decision paths execute correctly; rework loop allows up to 3 iterations before escalation alert.

**Priority:** CRITICAL

---

### FAC-005: AMBER Zone HITL Review Requirement

**Criteria:**  
All AMBER zone outputs (quantitative insights, behavioral interpretations, satisfaction analysis, segmentation, draft narrative) route to analyst review queue before triggering GREEN zone progression.

**Test Procedure:**
1. Execute cycle; observe each AMBER agent (AGN2, AGN3, AGN4, AGN5, AGN6) output queued for analyst review
2. Attempt to manually progress workflow without analyst approval → system blocks with error
3. Analyst approves all AMBER outputs in queue files
4. Observe workflow progresses to next state

**Pass Condition:**  
AMBER outputs cannot bypass analyst review; workflow blocked until all pending items approved.

**Priority:** CRITICAL

---

### FAC-006: Report Completeness and Structure

**Criteria:**  
Generated report includes all required sections in Arabic, with proper structure, metadata, and citation coverage.

**Test Procedure:**
1. Execute complete cycle through APPROVED state
2. Inspect generated report (JSON or markdown file)
3. Verify presence of sections:
   - Executive Summary (الملخص التنفيذي)
   - Quantitative Analysis (التحليل الكمي)
   - Behavioral Insights (الرؤى السلوكية)
   - Satisfaction Analysis (تحليل الرضا)
   - Segmentation Results (نتائج التقسيم)
   - Recommendations (التوصيات)
4. Verify metadata: cycle_id, analysis period, total customers, avg satisfaction score, workflow state
5. Verify all claims have citations in format `[REF: ...]`

**Pass Condition:**  
Report has all required sections, metadata is complete, no missing citations.

**Priority:** CRITICAL

---

### FAC-007: Audit Trail Logging

**Criteria:**  
All workflow transitions, gate decisions, and HITL review actions are logged to structured audit trail (stdout JSON logs).

**Test Procedure:**
1. Execute complete cycle
2. Review stdout logs for entries:
   - Workflow state transitions (PENDING → EXTRACTION → ... → LOCKED)
   - Gate evaluations (G1 PASS/FAIL, G2 violations, G3 decisions)
   - HITL review decisions (analyst approvals, Section Head decision)
3. Verify each log entry includes: cycle_id, timestamp, actor (AGN1-7 or human ID), decision, details

**Pass Condition:**  
Complete audit trail captured in logs; no workflow transitions missing from log output.

**Priority:** HIGH

---

### FAC-008: Arabic Text Quality (Subjective)

**Criteria:**  
Generated Arabic narrative is linguistically correct, professionally formatted, and uses appropriate terminology for government reporting.

**Test Procedure:**
1. Execute cycle through report authoring
2. Human reviewer (native Arabic speaker) reads generated report sections
3. Reviewer rates on 1-5 scale:
   - Grammar and syntax correctness
   - Terminology appropriateness (government/formal Arabic)
   - Coherence and readability
   - Professional tone

**Pass Condition:**  
Reviewer rates report ≥4/5 on all dimensions (acceptable for formal government reporting).

**Priority:** HIGH (subjective, not blocking for functional acceptance)

---

### FAC-009: Fixture Data Realism

**Criteria:**  
Seeded fixture data is realistic enough to support meaningful analysis and produce plausible report outputs.

**Test Procedure:**
1. Inspect seeded fixture data (customers, service reports, surveys)
2. Verify distributions:
   - Profitability tiers: ~20% HIGH, ~40% MEDIUM, ~30% LOW, ~10% NEGATIVE
   - Engagement levels: ~25% HIGH, ~35% MEDIUM, ~30% LOW, ~10% DORMANT
   - Satisfaction scores: normal distribution around 4.0 (std dev ~0.8)
3. Verify Arabic text quality (customer names, survey comments) is realistic

**Pass Condition:**  
Fixture data distributions match real-world patterns; Arabic text is plausible.

**Priority:** MEDIUM

---

### FAC-010: CLI Usability

**Criteria:**  
CLI interface is usable for executing cycles, checking state, and accessing review queues without requiring technical deep-dive.

**Test Procedure:**
1. Execute CLI commands:
   - `run-cycle --cycle-id=2024-11-cycle`
   - `check-state --cycle-id=2024-11-cycle`
   - `list-queue --queue=analyst`
   - `lock-report --cycle-id=2024-11-cycle`
2. Verify commands provide clear output (progress updates, state information, queue paths)
3. Verify error messages are actionable (e.g., "Coverage gate failed: 92% < 95%, review queue: ...")

**Pass Condition:**  
CLI commands execute successfully with clear, actionable output; no cryptic errors.

**Priority:** MEDIUM

---

## Deferred Acceptance Criteria (Out of Scope for MVP)

The following criteria are **NOT required for MVP acceptance** and are deferred to hardening iteration:

### DAC-001: Statistical Reliability of AI Outputs

**Deferred Criteria:**  
- Citation accuracy rate (% of citations that correctly reference source data)
- Hallucination detection rate (% of unsupported claims caught by validation)
- Sentiment analysis F1 score (precision/recall for Arabic NLP)
- Segmentation stability (consistency of segment assignments across multiple runs with same data)

**Rationale:**  
Eval baselines require ground truth datasets, statistical evaluation frameworks, and iterative LLM tuning. MVP focuses on functional workflow completion; statistical reliability established in hardening phase.

**Promotion Path:**  
Hardening phase establishes eval baselines, runs LLM evals, and tunes prompts/models to meet reliability thresholds.

---

### DAC-002: Real System Integration

**Deferred Criteria:**  
- OAuth 2.0 authentication to real CRM, BPMS, survey module APIs
- Real customer data extraction with PII masking
- Production-grade error handling for API failures, retries, timeouts
- BPMS UI integration for HITL review queues (replaces file-based queues)

**Rationale:**  
MVP uses fixture backends (TOL1-TOL8 mocks) to validate workflow logic without external dependencies. Real system integration introduces API stability risks and OAuth configuration complexity outside core MVP validation scope.

**Promotion Path:**  
Hardening phase swaps fixture backends for real API clients, implements OAuth 2.0 service accounts, and adds production error handling.

---

### DAC-003: Performance and Scalability

**Deferred Criteria:**  
- Cycle execution time < 30 minutes for 500 customers
- Support for concurrent cycles (multi-period analysis)
- Database query optimization for large datasets (>10K service reports)
- Memory footprint optimization (< 2GB RAM for full cycle)

**Rationale:**  
MVP targets small-scale functional validation (50-100 customers, single cycle at a time). Performance optimization is premature until workflow logic is validated and real system load characteristics are understood.

**Promotion Path:**  
Hardening phase profiles performance, optimizes queries, and adds concurrency support based on production usage patterns.

---

### DAC-004: Advanced Observability

**Deferred Criteria:**  
- Control Tower integration for compliance audit trail persistence
- Real-time workflow monitoring dashboard
- Alerting for gate failures, queue backlogs, cycle SLA breaches
- Distributed tracing for multi-agent workflow debugging

**Rationale:**  
MVP logs to stdout (structured JSON); sufficient for functional validation. Production-grade observability requires infrastructure integration (Control Tower API, monitoring platform) outside MVP scope.

**Promotion Path:**  
Hardening phase integrates Control Tower API for audit persistence, adds Prometheus/Grafana monitoring, and implements alerting rules.

---

### DAC-005: Predictive Analytics

**Deferred Criteria:**  
- Churn risk prediction (identify customers likely to become dormant)
- Satisfaction trend forecasting (predict next cycle satisfaction scores)
- Segment transition modeling (predict customer movement between segments)

**Rationale:**  
Predictive models require historical multi-cycle data for training and validation. MVP focuses on descriptive analysis (what happened in this cycle); predictive analytics requires hardening phase with ≥6 months of cycle history.

**Promotion Path:**  
Hardening phase collects multi-cycle historical data, trains predictive models, and adds forecast sections to reports.

---

### DAC-006: Multi-Language Support

**Deferred Criteria:**  
- English-language report generation option
- Bilingual reports (Arabic + English side-by-side)
- Language preference per stakeholder (Section Head receives Arabic, IT liaison receives English)

**Rationale:**  
MVP focuses on Arabic-first reporting (DG-CC official language). English support requires dual narrative generation, translation validation, and stakeholder preference management outside MVP scope.

**Promotion Path:**  
Hardening phase adds English report generation, bilingual layout templates, and stakeholder preference configuration.

---

## Acceptance Testing Strategy

### Test Phases

**Phase 1: Agent Unit Testing**
- Each agent (AGN1-AGN7) tested in isolation with fixture inputs
- Validate outputs match expected schema and zone contracts
- Coverage: 100% of agent functions

**Phase 2: Integration Testing**
- Multi-agent workflows tested end-to-end (e.g., AGN1 → AGN7 → AGN2 → AGN7)
- Validate gate enforcement, queue routing, state transitions
- Coverage: All workflow paths (nominal, coverage exception, citation violation, rework loops)

**Phase 3: System Testing**
- Complete cycle execution with realistic fixture data
- Human reviewers validate Arabic report quality
- Verify audit trail completeness

**Phase 4: Acceptance Testing**
- Execute all FAC-001 through FAC-010 test procedures
- Stakeholder review (Section Head validates report utility, analysts validate review queue usability)
- Sign-off on MVP delivery

---

## Acceptance Sign-Off

**MVP Accepted When:**
- All 10 Functional Acceptance Criteria (FAC-001 through FAC-010) pass
- No CRITICAL priority criteria failures
- At most 2 MEDIUM priority criteria have minor issues (documented as known limitations)

**Deferred Acceptance Criteria (DAC-001 through DAC-006) are NOT blockers for MVP sign-off.**

---

## Known Limitations (Acceptable for MVP)

1. **No Eval Baselines:** LLM outputs not statistically validated; reliance on human review for quality assurance
2. **No Real System Integration:** Fixture backends only; production readiness requires hardening phase API integration
3. **Single-User CLI:** No multi-user concurrency support; Section Head and analyst must coordinate queue access manually
4. **File-Based Queues:** Review queues are CSV/JSON files, not integrated with BPMS UI (hardening phase improvement)
5. **Synthetic Data Only:** No real customer PII; production deployment requires PII masking implementation
6. **No Performance SLAs:** Cycle execution time not optimized; acceptable for MVP testing scale (50-100 customers)

---

## References

- **Functional Requirements:** `payload/requirements/functional-requirements.md` (detailed FR specifications)
- **Workflow Gates:** `payload/air/workflow-gates.md` (gate enforcement logic)
- **Agent Architecture:** `payload/air/agent-architecture.md` (agent responsibilities and zone assignments)
- **Business Context:** `payload/requirements/business-context.md` (SOP alignment and success criteria)
- **Organizational Brief:** Enhancement Build Phase Brief: Customer Analysis System

---

**Version:** 1.0.0  
**Last Updated:** 2026-11-12  
**Status:** Binding for MVP acceptance testing
