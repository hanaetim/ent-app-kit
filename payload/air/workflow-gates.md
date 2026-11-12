# Workflow Gates — Customer Analysis System

This document defines the workflow state machine, mandatory gates, rework loops, and lifecycle transitions for the Customer Analysis System. These gates enforce quality, compliance, and review requirements across the 15-step analysis cycle.

## Workflow State Machine

### Analysis Cycle States

```
PENDING → EXTRACTION → QUANTITATIVE → BEHAVIORAL → SATISFACTION → 
SEGMENTATION → DRAFT_AUTHORING → ANALYST_REVIEW → SECTION_HEAD_REVIEW → 
APPROVED → LOCKED → ARCHIVED
```

### State Definitions

| State | Zone | Description | Entry Condition | Exit Gates |
|-------|------|-------------|-----------------|------------|
| PENDING | GREEN | Analysis cycle scheduled, awaiting extraction | Cycle period triggered (monthly) | - |
| EXTRACTION | GREEN | Service reports being extracted from CRM | AGN1 initiated | Data completeness validation |
| QUANTITATIVE | AMBER | Financial and operational metrics being computed | Extraction complete + coverage gate passed | Metric validation |
| BEHAVIORAL | AMBER | Customer behavior patterns being interpreted | Quantitative analysis complete | Behavioral interpretation review queue |
| SATISFACTION | AMBER | Satisfaction scores and sentiment being analyzed | Behavioral analysis complete | Satisfaction analysis review queue |
| SEGMENTATION | AMBER | Customer segmentation being performed | Satisfaction analysis complete | Segmentation review queue |
| DRAFT_AUTHORING | AMBER | Report narrative being generated | Segmentation complete + all prior reviews approved | Draft quality gate |
| ANALYST_REVIEW | AMBER | Analyst reviewing draft report for accuracy | Draft authoring complete | Analyst approval (approve/modify/reject) |
| SECTION_HEAD_REVIEW | RED | Section Head reviewing for final approval | Analyst approved report | Section Head decision gate |
| APPROVED | GREEN | Report approved, ready to lock | Section Head approved | Lock action |
| LOCKED | GREEN | Report locked, immutable for compliance | Manual lock by Section Head | Archive trigger |
| ARCHIVED | GREEN | Report archived for long-term retention | Archive period threshold reached | - |

## Mandatory Gates

### Gate 1: Coverage Gate (G1)

**Location:** Between EXTRACTION and QUANTITATIVE  
**Zone:** GREEN (deterministic validation)  
**Owner:** AGN7 (Deterministic Rule Engine)  
**Tool:** TOL2 (fetch_classification_framework)

**Acceptance Criteria:**
- All customers in scope for the cycle period have corresponding service reports
- Minimum data completeness threshold: 95% of required fields populated
- Classification framework version matches report period (e.g., DPS4 for current cycle)

**Failure Action:**
- Block progression to QUANTITATIVE state
- Route to AMBER zone for analyst review: "Coverage insufficient - X% of customers missing reports"
- Analyst must either:
  - Approve proceeding with reduced coverage (documented justification required)
  - Return to EXTRACTION with manual CRM query adjustment

**Enforcement:**
```python
def coverage_gate_check(cycle_id: str) -> GateResult:
    """
    Validates coverage threshold before quantitative analysis.
    
    Returns:
        GateResult with status (PASS/FAIL) and details
    """
    customers_in_scope = fetch_customers_for_period(cycle_id)
    customers_with_reports = fetch_extracted_reports(cycle_id)
    
    coverage_pct = len(customers_with_reports) / len(customers_in_scope) * 100
    
    if coverage_pct >= 95.0:
        return GateResult(status="PASS", coverage=coverage_pct)
    else:
        return GateResult(
            status="FAIL",
            coverage=coverage_pct,
            missing_count=len(customers_in_scope) - len(customers_with_reports),
            route_to="ANALYST_REVIEW_QUEUE"
        )
```

### Gate 2: Citation Traceability Gate (G2)

**Location:** Throughout BEHAVIORAL, SATISFACTION, SEGMENTATION, DRAFT_AUTHORING states  
**Zone:** AMBER (AI-generated content validation)  
**Owner:** AGN7 (Deterministic Rule Engine) validates; AGN3/AGN4/AGN5/AGN6 produce  
**Tool:** TOL7 (fetch_bpms_workflow_state)

**Acceptance Criteria:**
- Every AI-generated insight or recommendation in the report has a citation to source data
- Citations reference specific service reports, survey responses, or classification framework sections
- Citation format: `[REF: service_report_id | survey_id | framework_section]`
- No unsupported claims or hallucinated patterns

**Failure Action:**
- Block progression to next state
- Route insight to analyst review queue with annotation: "Missing citation for claim: [excerpt]"
- Analyst must either:
  - Add citation from source data
  - Remove unsupported claim
  - Mark as analyst-added interpretation (override with justification)

**Enforcement:**
```python
def citation_traceability_check(report_section: ReportSection) -> List[CitationViolation]:
    """
    Validates all claims have source citations.
    
    Returns:
        List of violations (empty if all claims cited)
    """
    violations = []
    claims = extract_claims(report_section.content)
    
    for claim in claims:
        if not has_citation(claim):
            violations.append(CitationViolation(
                claim_text=claim.text[:100],
                line_number=claim.line,
                required_action="ADD_CITATION_OR_REMOVE"
            ))
    
    return violations
```

### Gate 3: Section Head Approval Gate (G3)

**Location:** Between ANALYST_REVIEW and APPROVED states  
**Zone:** RED (human-in-the-loop decision, out of automation scope for MVP)  
**Owner:** Section Head (external human actor)  
**Tool:** TOL7 (fetch_bpms_workflow_state), TOL8 (write_bpms_routing_decision)

**Acceptance Criteria:**
- Analyst has approved report (no pending modifications)
- Report meets business quality standards (subjective assessment by Section Head)
- Report aligns with regulatory compliance requirements (DG-CC SOP DG-CH-01-03-01)
- Report narrative is in Arabic and meets linguistic quality standards

**Decision Options:**
1. **Approve** → Transition to APPROVED state
2. **Return for Rework** → Transition back to DRAFT_AUTHORING with Section Head comments
   - AGN6 (Report Authoring) revises based on feedback
   - Report cycles back through ANALYST_REVIEW → SECTION_HEAD_REVIEW
3. **Reject** → Transition to PENDING (cycle restart required)
   - Full rework from extraction (rare, only for fundamental issues)

**Enforcement:**
```python
class SectionHeadDecision(str, Enum):
    APPROVE = "approve"
    RETURN_FOR_REWORK = "return_for_rework"
    REJECT = "reject"

def section_head_approval_gate(
    cycle_id: str,
    decision: SectionHeadDecision,
    comments: str
) -> WorkflowTransition:
    """
    Processes Section Head decision and routes workflow accordingly.
    
    Returns:
        WorkflowTransition with next state and routing actions
    """
    if decision == SectionHeadDecision.APPROVE:
        return WorkflowTransition(
            next_state="APPROVED",
            actions=["ENABLE_LOCK_ACTION"]
        )
    elif decision == SectionHeadDecision.RETURN_FOR_REWORK:
        return WorkflowTransition(
            next_state="DRAFT_AUTHORING",
            actions=["ROUTE_TO_AGN6_WITH_FEEDBACK"],
            feedback=comments
        )
    else:  # REJECT
        return WorkflowTransition(
            next_state="PENDING",
            actions=["LOG_REJECTION", "NOTIFY_ANALYST"],
            rejection_reason=comments
        )
```

## Rework Loops

### Loop 1: Coverage Insufficiency Rework

**Trigger:** Coverage gate (G1) fails  
**Path:** EXTRACTION ← QUANTITATIVE (blocked) → ANALYST_REVIEW_QUEUE → EXTRACTION  
**Participants:** AGN1 (Report Extraction), AGN7 (Rule Engine), Analyst (HITL)

**Flow:**
1. AGN7 detects coverage < 95%
2. Route to analyst review queue with coverage metrics
3. Analyst reviews and decides:
   - **Accept reduced coverage:** Document justification, allow QUANTITATIVE to proceed
   - **Request re-extraction:** AGN1 re-runs extraction with adjusted date range or customer filter
4. If re-extraction chosen, cycle restarts at EXTRACTION state

**Exit Condition:** Coverage ≥ 95% OR analyst-approved coverage exception documented

### Loop 2: Citation Violation Rework

**Trigger:** Citation traceability gate (G2) detects missing citations  
**Path:** [BEHAVIORAL | SATISFACTION | SEGMENTATION | DRAFT_AUTHORING] → ANALYST_REVIEW_QUEUE → [originating state]  
**Participants:** AGN3/AGN4/AGN5/AGN6 (insight generators), AGN7 (Rule Engine), Analyst (HITL)

**Flow:**
1. AGN7 scans report section for unsupported claims
2. Route section to analyst review queue with violation annotations
3. Analyst reviews and decides:
   - **Add citation:** Analyst links claim to source data (service report, survey, framework)
   - **Remove claim:** Delete unsupported assertion
   - **Override:** Mark as analyst interpretation (requires justification)
4. Updated section returns to originating agent for re-integration

**Exit Condition:** All claims have citations OR analyst-approved overrides documented

### Loop 3: Section Head Rework

**Trigger:** Section Head returns report for rework (Gate G3)  
**Path:** SECTION_HEAD_REVIEW → DRAFT_AUTHORING → ANALYST_REVIEW → SECTION_HEAD_REVIEW  
**Participants:** Section Head, AGN6 (Report Authoring), Analyst

**Flow:**
1. Section Head reviews report and identifies issues (narrative quality, completeness, accuracy)
2. Section Head selects "Return for Rework" with written feedback (Arabic comments)
3. BPMS routes report to AGN6 with feedback payload
4. AGN6 revises draft incorporating Section Head comments
5. Report returns to ANALYST_REVIEW → SECTION_HEAD_REVIEW cycle

**Exit Condition:** Section Head approves OR rejects (reject ends cycle, triggers new PENDING)

**Maximum Iterations:** 3 rework loops per cycle (after 3 returns, escalation to supervisor required)

## Zone Enforcement at Gates

### GREEN Zone Gates
- **Characteristics:** Deterministic validation, no LLM inference, programmatic pass/fail
- **Examples:** Coverage gate (G1), data completeness checks, schema validation
- **Enforcement:** AGN7 (Deterministic Rule Engine) executes validation logic
- **No HITL Required:** Automatic progression if pass criteria met

### AMBER Zone Gates
- **Characteristics:** AI-generated content requires human review before progression
- **Examples:** Behavioral interpretation quality, citation traceability (G2), draft narrative completeness
- **Enforcement:** AGN7 routes to analyst review queue; analyst approval required to proceed
- **HITL Required:** Analyst must review and approve/modify/reject AMBER outputs before GREEN zone actions (e.g., locking report)

### RED Zone Gates
- **Characteristics:** Out of automation scope, human decision authority only
- **Examples:** Section Head approval gate (G3)
- **Enforcement:** Manual human action through external interface (BPMS UI or file-based queue)
- **HITL Required:** Cannot automate; Section Head decision is binding

## Workflow Audit Trail

All gate transitions are logged to audit trail (stored via TOL7/TOL8 in BPMS mock):

```python
@dataclass
class GateAuditEntry:
    """Audit record for gate transition."""
    cycle_id: str
    gate_id: str  # G1, G2, G3
    timestamp: datetime
    from_state: str
    to_state: str
    decision: str  # PASS, FAIL, APPROVE, REJECT, RETURN_FOR_REWORK
    actor: str  # AGN7, analyst_id, section_head_id
    details: dict  # gate-specific metadata (coverage_pct, citation_violations, comments)
    
def log_gate_transition(entry: GateAuditEntry) -> None:
    """Persists gate transition to audit log."""
    audit_log.append(entry)
    write_bpms_audit_event(entry)  # TOL8
```

## File-Based HITL Review Queue

For MVP implementation (no visual UI), HITL review queues are file-based:

### Analyst Review Queue
**Location:** `output/review_queues/analyst/`  
**Format:** CSV files with columns: `cycle_id, item_type, item_id, violation_type, violation_details, status`

**Example:**
```csv
cycle_id,item_type,item_id,violation_type,violation_details,status
2024-11-cycle,behavioral_insight,insight_42,missing_citation,"Claim: 'Customers prefer phone support' lacks citation",pending
2024-11-cycle,coverage_exception,extraction_summary,coverage_insufficient,"Coverage: 92% (380/412 customers)",pending
```

**Analyst Actions:**
- Read CSV queue file
- Modify `status` column to `approved`, `modified`, or `rejected`
- Add `analyst_notes` column with justification if needed
- Save file; AGN7 monitors queue directory for updates

### Section Head Review Queue
**Location:** `output/review_queues/section_head/`  
**Format:** JSON files with report summary and decision fields

**Example:**
```json
{
  "cycle_id": "2024-11-cycle",
  "report_title": "تحليل عملاء نوفمبر 2024",
  "analyst_approved": true,
  "summary_metrics": {
    "total_customers": 412,
    "coverage_pct": 96.5,
    "primary_segment": "متوسط الربحية، مرتفع التفاعل"
  },
  "decision": null,
  "section_head_comments": "",
  "timestamp": "2024-11-28T14:32:00Z"
}
```

**Section Head Actions:**
- Read JSON report file
- Set `decision` field to `approve`, `return_for_rework`, or `reject`
- Add comments in `section_head_comments` field (Arabic)
- Save file; AGN7 monitors queue directory for updates

## Gate Sequencing and Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│ EXTRACTION (GREEN)                                          │
│   ↓                                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Gate G1: Coverage (≥95% completeness)                   │ │
│ │ Enforcer: AGN7                                          │ │
│ │ FAIL → Analyst Review Queue                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│   ↓ PASS                                                    │
│ QUANTITATIVE (AMBER)                                        │
│   ↓                                                         │
│ BEHAVIORAL (AMBER)                                          │
│   ↓                                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Gate G2: Citation Traceability (all claims cited)       │ │
│ │ Enforcer: AGN7, continuous across AMBER states          │ │
│ │ FAIL → Analyst Review Queue (per violation)             │ │
│ └─────────────────────────────────────────────────────────┘ │
│   ↓ PASS                                                    │
│ SATISFACTION (AMBER)                                        │
│   ↓                                                         │
│ SEGMENTATION (AMBER)                                        │
│   ↓                                                         │
│ DRAFT_AUTHORING (AMBER)                                     │
│   ↓                                                         │
│ ANALYST_REVIEW (AMBER)                                      │
│   ↓ Analyst Approves                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Gate G3: Section Head Approval                          │ │
│ │ Enforcer: Section Head (human)                          │ │
│ │ Options: Approve / Return for Rework / Reject           │ │
│ └─────────────────────────────────────────────────────────┘ │
│   ↓ Approve                                                 │
│ APPROVED (GREEN) → LOCKED (GREEN) → ARCHIVED (GREEN)        │
└─────────────────────────────────────────────────────────────┘
```

## Promotion Path: MVP → Hardening

**MVP Scope (Fixture-Backed):**
- Gates G1, G2, G3 implemented with mock BPMS (TOL7/TOL8 fixture backends)
- File-based HITL review queues (CSV/JSON)
- Audit trail logged to stdout (structured logs)

**Hardening Scope (Real System Integration):**
- Swap TOL7/TOL8 to real BPMS API (OAuth 2.0 service account)
- Replace file-based queues with BPMS UI integration (web portal or email notifications)
- Audit trail persisted to Control Tower (compliance logging system)
- Add gate metrics dashboard (gate pass rates, rework loop frequency, cycle time analytics)

## References

- **Organizational Brief:** Enhancement Build Phase Brief: Customer Analysis System
- **Agent Architecture:** `payload/air/agent-architecture.md` (AGN1-AGN7 definitions)
- **MCP Tools:** `payload/air/mcp-tools.md` (TOL1-TOL8 specifications)
- **Zone Contracts:** `payload/air/autonomy-zones.md` (GREEN/AMBER/RED enforcement)
- **SOP Reference:** DG-CH-01-03-01 (Customer Analysis and Reporting Procedure)

---

**Version:** 1.0.0  
**Last Updated:** 2026-11-12  
**Status:** Binding for MVP implementation
