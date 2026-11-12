# Risk Register — Customer Analysis System

This document catalogs risks referenced in the organizational brief and defines mitigation requirements for the Customer Analysis System MVP. Risk IDs follow DG-CC risk management framework conventions (RSK-domain-category-number).

## Risk Categories

- **RSK-OPS-PRO:** Operational Process Risks
- **RSK-OPS-PPL:** Operational People Risks  
- **RSK-TECH:** Technical Implementation Risks
- **RSK-COMP:** Compliance and Regulatory Risks
- **RSK-DATA:** Data Quality and Availability Risks

---

## Process Risks (RSK-OPS-PRO)

### RSK-OPS-PRO-001: SOP Deadline Miss

**Description:**  
Analysis cycle completion does not meet SOP DG-CH-01-03-01 deadline (5th working day of following month).

**Likelihood:** Medium  
**Impact:** Medium  
**Risk Score:** 6/9

**Root Causes:**
- Manual analysis process takes 5-7 working days (exceeds deadline)
- Analyst review backlogs delay workflow progression
- Section Head approval delays (especially if multiple rework loops required)

**Mitigation Requirements (MVP):**
- Automate extraction (AGN1) and quantitative analysis (AGN2) to reduce cycle time to ≤2 days
- Implement file-based HITL review queues with clear SLA visibility (analysts see pending items immediately)
- Limit Section Head rework loops to 3 iterations; escalate to supervisor after 3rd return

**Residual Risk (Post-Mitigation):** Low  
**Owner:** Customer Analysis Unit

---

### RSK-OPS-PRO-002: Coverage Gate Failure Frequency

**Description:**  
Coverage gate (G1) fails frequently due to CRM data incompleteness, causing analyst review backlogs and delaying cycles.

**Likelihood:** Medium  
**Impact:** Low  
**Risk Score:** 4/9

**Root Causes:**
- Service reports not consistently created for all customer interactions
- CRM data entry delays (reports created after cycle period ends)
- Account manager inconsistency in report logging

**Mitigation Requirements (MVP):**
- Set realistic coverage threshold (95% allows 5% missing reports)
- Analyst review queue provides detailed coverage metrics (which customers missing, which account managers)
- Document coverage exceptions with justification (analyst approval required)

**Mitigation Requirements (Hardening):**
- Real-time CRM data quality monitoring alerts account managers to incomplete reports
- Automated reminders to account managers 48 hours before cycle period ends

**Residual Risk (Post-Mitigation):** Low  
**Owner:** Account Management & CRM Operations

---

### RSK-OPS-PRO-003: Citation Traceability Enforcement Overhead

**Description:**  
Enforcing citation traceability for all AI-generated insights creates analyst review burden, slowing workflow.

**Likelihood:** Medium  
**Impact:** Low  
**Risk Score:** 4/9

**Root Causes:**
- AI agents (AGN2-AGN6) may omit citations in complex narrative synthesis
- Analysts must manually verify source data references for each claim
- High volume of insights per cycle (50-100 customers × multiple insights per customer)

**Mitigation Requirements (MVP):**
- AGN7 (Deterministic Rule Engine) automates citation format validation (presence check)
- Route only citation violations to analyst queue (not all insights)
- Pre-populate citation recommendations in review queue (AGN7 suggests likely source report IDs)

**Mitigation Requirements (Hardening):**
- LLM prompt tuning to improve citation generation reliability (eval baseline: >95% citation coverage)
- Automated citation validation (link integrity check against source data IDs)

**Residual Risk (Post-Mitigation):** Low  
**Owner:** Customer Analysis Unit

---

## People Risks (RSK-OPS-PPL)

### RSK-OPS-PPL-001: Analyst Review Queue Backlog

**Description:**  
Analyst review queues accumulate pending items faster than analysts can process them, blocking workflow progression.

**Likelihood:** Medium  
**Impact:** Medium  
**Risk Score:** 6/9

**Root Causes:**
- Single analyst assigned to review all AMBER outputs (AGN2, AGN3, AGN4, AGN5, AGN6)
- High volume of insights per cycle (5-10 insights per customer × 50-100 customers = 250-1000 items)
- Analyst prioritization challenges (which items to review first)

**Mitigation Requirements (MVP):**
- Prioritize review queue items (critical violations blocking workflow progression at top)
- Batch review mode (analyst can approve multiple low-risk items at once)
- SLA visibility (analyst sees how long items have been pending)

**Mitigation Requirements (Hardening):**
- Multiple analysts with parallel review assignments (segment-based routing)
- Automated low-risk item approval for insights with high confidence scores

**Residual Risk (Post-Mitigation):** Medium  
**Owner:** Customer Analysis Unit (staffing)

---

### RSK-OPS-PPL-002: Section Head Availability Delay

**Description:**  
Section Head approval gate (G3) blocks for extended periods due to Section Head availability (travel, meetings, other priorities).

**Likelihood:** High  
**Impact:** Medium  
**Risk Score:** 7/9

**Root Causes:**
- Single Section Head with broad responsibilities beyond customer analysis
- RED zone gate requires human decision (cannot be delegated or automated)
- No SLA for Section Head review turnaround time

**Mitigation Requirements (MVP):**
- Section Head review queue provides clear report summary (executive summary, key metrics) for quick review
- Escalation alert after 48 hours pending in Section Head queue (notify supervisor)
- Delegation protocol: Section Head can designate deputy for approval during absence

**Mitigation Requirements (Hardening):**
- BPMS UI with mobile access for Section Head (review/approve from anywhere)
- Email notifications with report summary (reduce friction to access review queue)

**Residual Risk (Post-Mitigation):** Medium  
**Owner:** Section Head (with escalation to Director)

---

### RSK-OPS-PPL-003: Arabic Language Skill Requirements

**Description:**  
System requires analysts and Section Head with strong Arabic language skills to review generated reports; skill shortage may limit scalability.

**Likelihood:** Low  
**Impact:** Medium  
**Risk Score:** 4/9

**Root Causes:**
- All reports and insights generated in Arabic (DG-CC official language)
- Native-level Arabic required for linguistic quality assessment
- Limited analyst pool with both domain expertise and Arabic fluency

**Mitigation Requirements (MVP):**
- AGN6 (Report Authoring) uses LLM with strong Arabic capabilities (Claude Sonnet 4.5)
- Automated grammar/spelling checks reduce analyst linguistic review burden
- Bilingual documentation (English) for system operation (only reports are Arabic)

**Mitigation Requirements (Hardening):**
- Optional English report generation for technical stakeholders (IT, planning unit)
- Translation validation tools for bilingual report consistency

**Residual Risk (Post-Mitigation):** Low  
**Owner:** HR / Talent Management

---

## Technical Risks (RSK-TECH)

### RSK-TECH-001: LLM Hallucination in AMBER Zone

**Description:**  
AI agents (AGN2-AGN6) generate unsupported claims, fabricated patterns, or inaccurate insights due to LLM hallucination.

**Likelihood:** Medium  
**Impact:** High  
**Risk Score:** 7/9

**Root Causes:**
- LLMs can produce plausible but incorrect assertions
- Complex narrative synthesis combines multiple data points (error compounding)
- Ambiguous or sparse source data may trigger speculation

**Mitigation Requirements (MVP):**
- Mandatory citation traceability (gate G2) ensures all claims reference source data
- Analyst HITL review for all AMBER outputs (human validation before progression)
- Prompt engineering: explicit "cite sources" instructions in all AMBER agent prompts

**Mitigation Requirements (Hardening):**
- Eval baselines: hallucination detection rates, citation accuracy metrics
- LLM tuning: iterative prompt refinement based on eval results
- Automated fact-checking: cross-reference claims against source data programmatically

**Residual Risk (Post-Mitigation):** Medium (acceptable with HITL gates)  
**Owner:** AI Engineering / Customer Analysis Unit

---

### RSK-TECH-002: Fixture Backend Limitations

**Description:**  
Mock/fixture backends (TOL1-TOL8) do not accurately represent real system behavior, causing integration issues when swapping to real APIs.

**Likelihood:** High  
**Impact:** Medium  
**Risk Score:** 7/9

**Root Causes:**
- Fixture data lacks real-world edge cases (missing fields, inconsistent formats)
- Fixture logic is deterministic; real APIs have latency, failures, rate limits
- Authentication/authorization logic not tested in MVP (OAuth 2.0 deferred)

**Mitigation Requirements (MVP):**
- Document swap boundaries explicitly in MCP tool specifications (TOL1-TOL8)
- Design tool interfaces to isolate fixture vs. real implementation (dependency injection)
- Include fixture edge cases (missing data, partial responses) to exercise error handling

**Mitigation Requirements (Hardening):**
- Swagger/OpenAPI specs from real CRM/BPMS used to validate fixture interface compatibility
- Integration testing against real APIs in staging environment before production swap
- Feature flags for gradual rollout (enable real API per tool incrementally)

**Residual Risk (Post-Mitigation):** Medium  
**Owner:** Integration Engineering

---

### RSK-TECH-003: SQLite Performance Bottleneck

**Description:**  
SQLite database (MVP) becomes performance bottleneck as data volume grows beyond MVP scale (50-100 customers).

**Likelihood:** High (for production scale)  
**Impact:** Low (for MVP scale)  
**Risk Score:** 4/9 (MVP), 7/9 (production)

**Root Causes:**
- SQLite is embedded database; limited concurrency and query optimization
- Production scale: 500-1000 customers × 10-20 reports/customer = 10K-20K records per cycle
- Multi-cycle history accumulation (12 cycles/year × 7 years retention = 84 cycles × 20K records = 1.7M records)

**Mitigation Requirements (MVP):**
- None — SQLite sufficient for MVP scale (50-100 customers, single cycle)
- Document database swap boundary (SQLAlchemy ORM abstracts database choice)

**Mitigation Requirements (Hardening):**
- Migrate to PostgreSQL or MySQL for production deployment
- Add database indexing strategy (customer_id, report_date, cycle_id)
- Partition historical data by cycle year (archive older data to cold storage)

**Residual Risk (Post-Mitigation):** Low (hardening phase)  
**Owner:** Database Engineering

---

### RSK-TECH-004: Deterministic Backbone Integrity

**Description:**  
GREEN zone determinism violated by non-deterministic operations (timestamps, randomness, floating-point rounding), breaking reproducibility.

**Likelihood:** Low  
**Impact:** High  
**Risk Score:** 6/9

**Root Causes:**
- System-generated timestamps vary per execution
- Random seed not controlled in segmentation clustering (AGN5 uses probabilistic algorithms)
- Floating-point arithmetic precision varies by platform

**Mitigation Requirements (MVP):**
- AGN7 (Deterministic Rule Engine) unit tests assert determinism (run twice, outputs match)
- Controlled timestamps for GREEN zone operations (use cycle period dates, not system time)
- Fixed random seeds for any non-deterministic algorithms in GREEN zone (or move to AMBER zone)

**Mitigation Requirements (Hardening):**
- Determinism test suite: run full cycle 10 times, verify outputs identical
- Platform-specific precision handling (decimal types for currency, not float)

**Residual Risk (Post-Mitigation):** Low  
**Owner:** Quality Engineering

---

## Compliance Risks (RSK-COMP)

### RSK-COMP-001: Audit Trail Gaps

**Description:**  
Incomplete audit trail for workflow transitions, gate decisions, or HITL review actions compromises compliance with Records Management Law.

**Likelihood:** Low  
**Impact:** High  
**Risk Score:** 6/9

**Root Causes:**
- Stdout logging (MVP) is ephemeral; logs lost if container/process terminated
- Missing log entries for edge cases (error paths, system restarts)
- No log persistence layer (database, object storage)

**Mitigation Requirements (MVP):**
- All agents (AGN1-AGN7) log structured JSON to stdout for all actions
- Audit trail includes: cycle_id, actor, timestamp, decision, source data references
- Redirect stdout to persistent file storage (e.g., `output/logs/{cycle_id}.log`)

**Mitigation Requirements (Hardening):**
- Integrate Control Tower API for audit trail persistence (10-year retention)
- Tamper-proof log storage (immutable append-only logs)
- Log completeness validation (detect missing sequence numbers)

**Residual Risk (Post-Mitigation):** Low (hardening phase)  
**Owner:** Compliance Engineering

---

### RSK-COMP-002: PII Exposure in AI Payloads

**Description:**  
Real customer names, contact details, or sensitive data exposed to AI systems (LLM payloads) without proper masking, violating Data Protection Regulation.

**Likelihood:** High (for production)  
**Impact:** High  
**Risk Score:** 9/9 (CRITICAL for production)

**Root Causes:**
- AI agents (AGN2-AGN6) process customer data for analysis
- LLM providers may log/retain request payloads (privacy risk)
- No PII masking layer between data extraction and AI processing

**Mitigation Requirements (MVP):**
- Synthetic fixture data only (no real customer PII in MVP)
- Document PII masking contract for hardening phase (mask before AI payloads)

**Mitigation Requirements (Hardening):**
- PII masking function: replace names, emails, phones with `[MASKED_{type}_{hash}]`
- Hash preserves entity identity (consistent masking per customer across cycle)
- Unmask only for final report output (approved by Section Head)
- LLM provider selection: ensure no payload retention in provider TOS

**Residual Risk (Post-Mitigation):** Medium (with masking)  
**Owner:** Privacy Engineering / Legal

---

### RSK-COMP-003: Report Immutability Violation

**Description:**  
Locked reports modified after Section Head approval, violating Records Management Law immutability requirement.

**Likelihood:** Low  
**Impact:** High  
**Risk Score:** 6/9

**Root Causes:**
- Application logic allows report updates regardless of `locked` status
- No database-level constraints enforcing immutability
- Accidental or malicious modification by admin users

**Mitigation Requirements (MVP):**
- Report locking enforced in application logic: write operations check `locked` flag, block if true
- Locked reports require unlock action (audit trail required) before modification
- Unit tests: attempt to modify locked report → assert operation blocked

**Mitigation Requirements (Hardening):**
- Database-level immutability: locked reports moved to append-only table
- Checksum validation: detect tampering by comparing hash at lock time vs. current hash
- Role-based access control: only Section Head can unlock reports (requires justification)

**Residual Risk (Post-Mitigation):** Low  
**Owner:** Compliance Engineering

---

## Data Quality Risks (RSK-DATA)

### RSK-DATA-001: Classification Framework Version Mismatch

**Description:**  
Service reports analyzed using outdated classification framework (e.g., DPS3) while current reports use DPS4, causing profitability tier inconsistencies.

**Likelihood:** Medium  
**Impact:** Medium  
**Risk Score:** 6/9

**Root Causes:**
- Classification framework updated quarterly; cycle period may span framework version change
- CRM does not track framework version per service report
- AGN2 (Quantitative Analysis) fetches current framework, applies retroactively to all reports

**Mitigation Requirements (MVP):**
- AGN1 (Report Extraction) includes framework version in extracted report metadata
- AGN2 validates framework version consistency across cycle; alerts if mismatch detected
- Analyst review queue includes framework version mismatch items for manual resolution

**Mitigation Requirements (Hardening):**
- CRM enhancement: tag service reports with classification framework version at creation time
- Multi-version framework support: AGN2 can apply DPS3 to older reports, DPS4 to newer reports

**Residual Risk (Post-Mitigation):** Low  
**Owner:** CRM Operations / Customer Analysis Unit

---

### RSK-DATA-002: Survey Response Rate Decline

**Description:**  
Survey response rate drops below 40%, reducing satisfaction analysis reliability and statistical significance.

**Likelihood:** Medium  
**Impact:** Medium  
**Risk Score:** 6/9

**Root Causes:**
- Survey fatigue (customers receive too many surveys)
- Survey delivery timing suboptimal (sent days after service interaction)
- Lack of incentives for survey completion

**Mitigation Requirements (MVP):**
- AGN4 (Satisfaction Analysis) reports response rate as metadata in satisfaction insights
- Analyst review includes response rate threshold check (flag if <40%)
- Document response rate in report limitations section (transparency)

**Mitigation Requirements (Hardening):**
- Survey module enhancements: send survey immediately after interaction (same day)
- A/B testing of survey formats, lengths, incentive offers
- Predictive response rate modeling: forecast reliability based on historical trends

**Residual Risk (Post-Mitigation):** Medium  
**Owner:** Customer Engagement / Survey Operations

---

### RSK-DATA-003: Arabic Text Encoding Issues

**Description:**  
Arabic text in survey feedback or customer names corrupted due to encoding mismatches (UTF-8 vs. CP1256), causing analysis errors.

**Likelihood:** Low  
**Impact:** Medium  
**Risk Score:** 4/9

**Root Causes:**
- CRM legacy system uses CP1256 (Windows Arabic) encoding
- Survey module exports UTF-8
- Customer Analysis System expects UTF-8 throughout

**Mitigation Requirements (MVP):**
- AGN1 (Report Extraction) applies UTF-8 normalization to all extracted text
- Arabic text normalization function (Unicode NFC, whitespace collapse, RTL preservation)
- Unit tests with mixed-encoding inputs to validate normalization logic

**Mitigation Requirements (Hardening):**
- CRM encoding audit: migrate legacy data to UTF-8
- Input validation: reject non-UTF-8 text at system boundaries with clear error messages

**Residual Risk (Post-Mitigation):** Low  
**Owner:** Data Engineering

---

## Risk Mitigation Priority Matrix

| Risk ID | Risk Score | MVP Priority | Hardening Priority |
|---------|------------|--------------|-------------------|
| RSK-COMP-002 (PII Exposure) | 9/9 | CRITICAL (mitigated with synthetic data) | CRITICAL (PII masking required) |
| RSK-TECH-001 (LLM Hallucination) | 7/9 | HIGH (HITL gates) | HIGH (eval baselines) |
| RSK-OPS-PPL-002 (Section Head Delay) | 7/9 | MEDIUM (escalation alerts) | HIGH (BPMS UI) |
| RSK-TECH-002 (Fixture Limitations) | 7/9 | LOW (documented swap) | HIGH (real API integration) |
| RSK-OPS-PRO-001 (SOP Deadline Miss) | 6/9 | HIGH (automation) | MEDIUM (SLA monitoring) |
| RSK-OPS-PPL-001 (Analyst Backlog) | 6/9 | MEDIUM (prioritization) | HIGH (parallel review) |
| RSK-COMP-001 (Audit Trail Gaps) | 6/9 | MEDIUM (file logging) | HIGH (Control Tower) |
| RSK-COMP-003 (Report Immutability) | 6/9 | HIGH (lock enforcement) | MEDIUM (DB constraints) |
| RSK-DATA-001 (Framework Mismatch) | 6/9 | MEDIUM (validation) | MEDIUM (multi-version support) |
| RSK-DATA-002 (Response Rate Decline) | 6/9 | LOW (transparency) | MEDIUM (survey optimization) |
| RSK-TECH-004 (Determinism Integrity) | 6/9 | HIGH (unit tests) | MEDIUM (test suite) |
| RSK-OPS-PRO-002 (Coverage Gate Failure) | 4/9 | MEDIUM (analyst review) | LOW (CRM monitoring) |
| RSK-OPS-PRO-003 (Citation Overhead) | 4/9 | MEDIUM (automation) | LOW (LLM tuning) |
| RSK-OPS-PPL-003 (Arabic Skill Shortage) | 4/9 | LOW (LLM quality) | LOW (bilingual option) |
| RSK-TECH-003 (SQLite Performance) | 4/9 | LOW (MVP scale OK) | HIGH (PostgreSQL migration) |
| RSK-DATA-003 (Encoding Issues) | 4/9 | MEDIUM (normalization) | LOW (CRM migration) |

---

## Risk Review Cadence

**MVP Phase:**
- Risk review at end of each implementation step (8 steps per enhancement plan)
- Critical/High risks reviewed weekly during development
- Risk log updated in `output/risks/{cycle_id}_risk_log.json`

**Hardening Phase:**
- Monthly risk review during hardening iteration
- Post-deployment: quarterly risk review aligned with ADGEP reporting cycle

---

## References

- **Organizational Brief:** Enhancement Build Phase Brief: Customer Analysis System (source of RSK-OPS-PRO and RSK-OPS-PPL references)
- **Agent Architecture:** `payload/air/agent-architecture.md` (technical risk context)
- **Workflow Gates:** `payload/air/workflow-gates.md` (process risk mitigation)
- **Business Context:** `payload/requirements/business-context.md` (compliance risk context)
- **Acceptance Criteria:** `payload/requirements/acceptance-criteria.md` (MVP vs. hardening scope)

---

**Version:** 1.0.0  
**Last Updated:** 2026-11-12  
**Status:** Binding for MVP risk management
