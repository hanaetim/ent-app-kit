# Autonomy Zones — Customer Analysis System

This document defines the GREEN/AMBER/RED autonomy zone framework for the Customer Analysis System. Zones enforce trust boundaries, determine which operations can proceed autonomously versus requiring human review, and establish contracts for agent behavior in each zone.

## Zone Framework Overview

The Customer Analysis System uses a three-tier autonomy model to balance automation velocity with quality and compliance requirements:

- **GREEN Zone:** Deterministic operations that can proceed autonomously without human review
- **AMBER Zone:** AI-assisted operations that require human-in-the-loop (HITL) review gates before progression
- **RED Zone:** Operations outside automation scope, requiring human decision authority

## Zone Definitions

### GREEN Zone: Autonomous Deterministic Operations

**Trust Level:** Full automation  
**Characteristics:**
- Deterministic logic with predictable, repeatable outputs
- No LLM inference or probabilistic reasoning
- Programmatic validation with clear pass/fail criteria
- No business judgment or subjective assessment required

**Permitted Operations:**
- Data extraction from structured sources (service reports, classification framework)
- Schema validation and data completeness checks
- Deterministic calculations (sums, averages, percentages)
- Rule-based routing decisions (coverage gate, citation validation)
- State transitions based on objective criteria
- Report locking and archiving (workflow finalization)

**Agent Assignments:**
- **AGN1 (Report Extraction):** Extracts service reports from CRM mock (TOL1) — deterministic data retrieval
- **AGN7 (Deterministic Rule Engine):** Enforces gates, validates citations, calculates metrics, routes workflows

**Quality Assurance:**
- Unit tests with 100% deterministic output reproducibility
- Schema validation against defined data contracts
- Coverage metrics: >90% branch coverage for GREEN zone code paths

**Prohibited in GREEN:**
- LLM inference or natural language generation
- Subjective interpretation of ambiguous inputs
- Business judgment calls requiring domain expertise

**Example GREEN Zone Operation:**
```python
def calculate_coverage_percentage(
    customers_in_scope: List[str],
    customers_with_reports: List[str]
) -> float:
    """
    GREEN Zone: Deterministic coverage calculation.
    No LLM, no judgment — pure arithmetic.
    """
    if not customers_in_scope:
        return 0.0
    return (len(customers_with_reports) / len(customers_in_scope)) * 100.0
```

---

### AMBER Zone: AI-Assisted Operations with HITL Gates

**Trust Level:** Conditional automation with mandatory human review  
**Characteristics:**
- LLM-based inference and pattern recognition
- Natural language generation (Arabic narrative synthesis)
- Probabilistic reasoning over unstructured or semi-structured data
- Outputs must pass through HITL review gates before triggering GREEN zone actions

**Permitted Operations:**
- Behavioral pattern interpretation from service history
- Satisfaction sentiment analysis from survey text
- Customer segmentation based on multiple dimensions
- Report narrative authoring (Arabic)
- Recommendation generation with source citations

**Agent Assignments:**
- **AGN2 (Quantitative Analysis):** Calculates financial metrics, applies classification framework, generates quantitative insights (AMBER output → analyst review)
- **AGN3 (Behavioral Interpretation):** Interprets service patterns, interaction frequency, escalation trends (AMBER output → analyst review)
- **AGN4 (Satisfaction Analysis):** Analyzes survey responses, sentiment scores, satisfaction drivers (AMBER output → analyst review)
- **AGN5 (Segmentation):** Groups customers by behavior, profitability, engagement (AMBER output → analyst review)
- **AGN6 (Report Authoring):** Synthesizes AMBER outputs into Arabic narrative report (AMBER output → analyst review → Section Head review)

**Quality Assurance:**
- Citation traceability: Every AI-generated insight must reference source data
- HITL review queues: Analyst must approve/modify/reject AMBER outputs
- Eval baselines (hardening phase): Statistical reliability metrics for LLM outputs
- No AMBER output flows directly to GREEN zone write operations (e.g., report locking) without passing review gates

**Prohibited in AMBER:**
- Autonomous write to production systems without review
- Bypassing HITL gates for efficiency
- Unsupported claims (all assertions must have source citations)

**AMBER → GREEN Transition Contract:**
```python
def approve_amber_output(
    output: AmberOutput,
    analyst_decision: ReviewDecision
) -> GreenReadyOutput:
    """
    AMBER Zone outputs must pass through review gate to become GREEN-actionable.
    
    Args:
        output: AI-generated insight/narrative from AMBER zone agent
        analyst_decision: Human analyst approval/modification/rejection
    
    Returns:
        GreenReadyOutput that can trigger GREEN zone actions (e.g., workflow progression)
    
    Raises:
        ReviewRequiredError: If AMBER output attempts to bypass review gate
    """
    if not analyst_decision.approved:
        raise ReviewRequiredError("AMBER output cannot proceed without analyst approval")
    
    if output.has_citation_violations():
        raise CitationViolationError("All claims must be cited before GREEN zone progression")
    
    return GreenReadyOutput(
        content=output.content,
        approved_by=analyst_decision.analyst_id,
        approved_at=analyst_decision.timestamp,
        source_citations=output.citations
    )
```

**Example AMBER Zone Operation:**
```python
async def interpret_behavioral_pattern(
    customer_id: str,
    service_history: List[ServiceReport]
) -> BehavioralInsight:
    """
    AMBER Zone: LLM-based behavioral interpretation.
    Output requires analyst review before workflow progression.
    """
    prompt = f"""
    Analyze the service history for customer {customer_id} and identify behavioral patterns.
    
    Service History:
    {format_service_history(service_history)}
    
    Identify:
    1. Service interaction frequency and trends
    2. Escalation patterns (if any)
    3. Channel preferences (phone, email, portal)
    4. Response time sensitivity
    
    Provide citations for all observations using format: [REF: service_report_id]
    """
    
    response = await anthropic_client.messages.create(
        model="claude-sonnet-4-5",
        messages=[{"role": "user", "content": prompt}]
    )
    
    insight = BehavioralInsight(
        customer_id=customer_id,
        narrative=response.content[0].text,
        zone="AMBER",
        requires_review=True,  # Must pass through analyst review gate
        source_reports=[r.report_id for r in service_history]
    )
    
    return insight  # Routes to analyst review queue, not directly actionable
```

---

### RED Zone: Human Decision Authority Only

**Trust Level:** No automation  
**Characteristics:**
- Subjective business judgment
- Regulatory compliance assessment
- Final approval authority
- Strategic or sensitive decisions outside system scope

**Permitted Operations (Human Only):**
- Section Head final approval of analysis reports
- Report rejection or return for rework (with written feedback)
- Override of system recommendations when business context requires
- Escalation decisions beyond standard workflow

**Agent Assignments:**
- **No agents operate in RED zone** — human decision authority only
- AGN7 (Deterministic Rule Engine) routes to RED zone when Section Head approval gate is reached, but does not make the decision

**Interface:**
- File-based review queue (MVP): JSON files with report summary and decision fields
- BPMS UI (hardening phase): Web portal for Section Head review and approval actions

**Quality Assurance:**
- Audit trail: All RED zone decisions logged with timestamp, actor, and justification
- Decision options constrained: `approve`, `return_for_rework`, `reject` (no undefined actions)
- Escalation path: After 3 rework loops, supervisor review required

**Prohibited in RED:**
- Automated decisions bypassing human approval
- System override of Section Head decisions
- Silent failures or timeouts treated as approvals

**RED Zone Decision Contract:**
```python
class SectionHeadDecision(str, Enum):
    """RED Zone: Human decision options only."""
    APPROVE = "approve"
    RETURN_FOR_REWORK = "return_for_rework"
    REJECT = "reject"

def section_head_review_gate(cycle_id: str) -> SectionHeadDecision:
    """
    RED Zone gate: Blocks until human Section Head provides decision.
    No automated fallback, no timeout-based approval.
    
    Returns:
        Human-provided decision (never system-generated)
    
    Raises:
        ReviewPendingError: If decision not yet provided
    """
    decision_file = f"output/review_queues/section_head/{cycle_id}.json"
    
    if not os.path.exists(decision_file):
        raise ReviewPendingError(f"Section Head review pending for {cycle_id}")
    
    with open(decision_file) as f:
        review_data = json.load(f)
    
    if review_data.get("decision") is None:
        raise ReviewPendingError(f"Section Head has not yet decided on {cycle_id}")
    
    decision = SectionHeadDecision(review_data["decision"])
    
    # Audit trail for RED zone decision
    log_red_zone_decision(
        cycle_id=cycle_id,
        decision=decision,
        comments=review_data.get("section_head_comments", ""),
        timestamp=datetime.now()
    )
    
    return decision  # Human-provided, not system-generated
```

---

## Zone Enforcement Rules

### Rule 1: No AMBER → GREEN Bypass

**Requirement:** AMBER zone outputs MUST pass through HITL review gates before triggering GREEN zone write operations.

**Violation Example (Forbidden):**
```python
# FORBIDDEN: AMBER output directly triggers GREEN zone action
behavioral_insight = await agn3.interpret_behavior(customer_id)  # AMBER
lock_report(cycle_id)  # GREEN — FORBIDDEN without review gate
```

**Correct Pattern:**
```python
# CORRECT: AMBER output → review gate → GREEN action
behavioral_insight = await agn3.interpret_behavior(customer_id)  # AMBER
route_to_review_queue(behavioral_insight)  # Review gate
# ... analyst reviews and approves ...
if analyst_approved(behavioral_insight):
    proceed_to_next_step(cycle_id)  # GREEN progression
```

### Rule 2: GREEN Zone Must Be Deterministic

**Requirement:** GREEN zone operations must produce identical outputs given identical inputs (no LLM inference).

**Testing:**
```python
def test_green_zone_determinism():
    """All GREEN zone operations must be deterministic."""
    customers = ["C001", "C002", "C003"]
    reports = ["R001", "R002", "R003"]
    
    # Run operation twice
    result1 = calculate_coverage_percentage(customers, reports)
    result2 = calculate_coverage_percentage(customers, reports)
    
    # Must be identical
    assert result1 == result2 == 100.0
```

### Rule 3: RED Zone Human-Only

**Requirement:** RED zone decisions cannot be automated, delegated to agents, or have system-generated defaults.

**Violation Example (Forbidden):**
```python
# FORBIDDEN: Automated RED zone decision
def section_head_review(cycle_id: str) -> Decision:
    # Wait 24 hours for Section Head decision
    time.sleep(86400)
    # If no decision, auto-approve — FORBIDDEN!
    return Decision.APPROVE
```

**Correct Pattern:**
```python
# CORRECT: Block until human decision provided
def section_head_review(cycle_id: str) -> Decision:
    while True:
        decision = check_decision_file(cycle_id)
        if decision is not None:
            return decision  # Human-provided
        time.sleep(60)  # Poll, but never auto-decide
```

---

## Zone Transition Matrix

| From Zone | To Zone | Transition Condition | Example |
|-----------|---------|----------------------|---------|
| GREEN | GREEN | Deterministic progression | Report extraction complete → coverage validation |
| GREEN | AMBER | Data ready for AI analysis | Coverage validated → quantitative analysis |
| AMBER | AMBER | Sequential AMBER steps | Behavioral interpretation → satisfaction analysis |
| AMBER | GREEN | Analyst approval + no violations | Analyst approves draft → Section Head review queue |
| AMBER | RED | Escalation to human authority | Analyst-approved report → Section Head approval gate |
| RED | GREEN | Human approval granted | Section Head approves → report locking |
| RED | AMBER | Human requests rework | Section Head returns for rework → draft authoring |

**Forbidden Transitions:**
- AMBER → GREEN (write action) without HITL review
- GREEN → RED (deterministic operations cannot escalate to human decision without routing logic)
- RED → AMBER (bypassing GREEN deterministic validation)

---

## Agent Zone Assignments

| Agent | Zone | Rationale | Constraints |
|-------|------|-----------|-------------|
| **AGN1** | GREEN | Deterministic data extraction from structured CRM source | No LLM inference; extraction logic is rule-based |
| **AGN2** | AMBER | Financial metrics calculation includes classification framework interpretation | Classification framework mapping may require judgment; outputs require review |
| **AGN3** | AMBER | Behavioral pattern interpretation from service history | LLM-based pattern recognition over unstructured interaction data |
| **AGN4** | AMBER | Satisfaction sentiment analysis from survey text | NLP sentiment analysis over Arabic free-text responses |
| **AGN5** | AMBER | Customer segmentation based on multiple behavioral/financial dimensions | Multi-dimensional clustering with LLM-assisted labeling |
| **AGN6** | AMBER | Arabic narrative report authoring | Natural language generation; subjective narrative quality assessment |
| **AGN7** | GREEN | Deterministic rule engine for gates, routing, validation | No LLM inference; all logic is programmatic and deterministic |

---

## HITL Review Queue Contracts

### Analyst Review Queue (AMBER → GREEN Gate)

**Queue Location:** `output/review_queues/analyst/`  
**Format:** CSV with columns: `cycle_id, item_type, item_id, zone, violation_type, status, analyst_notes`

**Item Types:**
- `behavioral_insight` (from AGN3)
- `satisfaction_insight` (from AGN4)
- `segmentation_result` (from AGN5)
- `draft_narrative` (from AGN6)
- `coverage_exception` (from AGN7 if coverage < 95%)

**Analyst Actions:**
- `status`: `pending` → `approved` | `modified` | `rejected`
- `analyst_notes`: Justification for decision (required for `modified` or `rejected`)

**Approval Criteria:**
- All citations present and traceable to source data
- Insights align with source data (no hallucinations)
- Arabic narrative meets linguistic quality standards
- Segmentation logic is reasonable and documented

### Section Head Review Queue (AMBER → RED → GREEN Gate)

**Queue Location:** `output/review_queues/section_head/`  
**Format:** JSON with report summary, metrics, and decision fields

**Decision Options:**
- `approve`: Report meets business and compliance standards → APPROVED state
- `return_for_rework`: Report needs revision → DRAFT_AUTHORING state (with comments)
- `reject`: Fundamental issues, restart cycle → PENDING state

**Section Head Considerations:**
- Business judgment: Does the report align with organizational priorities?
- Compliance: Does the report meet DG-CC SOP DG-CH-01-03-01 requirements?
- Quality: Is the Arabic narrative clear, accurate, and professional?
- Completeness: Are all required sections present and sufficiently detailed?

---

## Zone Audit and Compliance

### Audit Logging

All zone transitions are logged with:
- `zone_from`: Source zone (GREEN, AMBER, RED)
- `zone_to`: Destination zone
- `actor`: Agent ID (AGN1-7) or human ID (analyst/Section Head)
- `timestamp`: Transition time
- `decision`: Outcome (pass, fail, approve, reject, etc.)
- `details`: Zone-specific metadata (citations, coverage metrics, comments)

**Audit Log Schema:**
```python
@dataclass
class ZoneTransitionAudit:
    """Audit record for zone boundary crossing."""
    cycle_id: str
    zone_from: str  # GREEN, AMBER, RED
    zone_to: str
    actor: str  # AGN1-7, analyst_id, section_head_id
    timestamp: datetime
    decision: str
    details: dict
    traceability: List[str]  # Source citations or data references
```

### Compliance Checks

**Pre-Deployment Validation:**
1. **GREEN Zone Determinism Test:** Run all GREEN zone operations twice; outputs must match byte-for-byte
2. **AMBER Citation Coverage:** Verify all AMBER outputs have `requires_review=True` and source citations
3. **RED Zone Human-Only:** Verify no RED zone decisions have automated fallbacks or defaults

**Runtime Monitoring:**
- Track AMBER → GREEN transitions; alert if any bypass review gates
- Track RED zone decision latency; escalate if Section Head review pending >48 hours
- Track rework loop frequency; flag cycles with >3 rework iterations for supervisor review

---

## Promotion Path: MVP → Hardening

**MVP Scope:**
- File-based HITL queues (CSV for analyst, JSON for Section Head)
- Stdout audit logging (structured JSON logs)
- No eval baselines for AMBER zone LLM outputs (functional acceptance only)

**Hardening Scope:**
- BPMS UI integration for HITL queues (web portal, email notifications)
- Control Tower audit persistence (compliance system integration)
- Eval baselines: Statistical reliability metrics for AMBER zone outputs (citation accuracy, hallucination rates, sentiment analysis F1 scores)
- Real-time zone transition monitoring dashboard

---

## References

- **Agent Architecture:** `payload/air/agent-architecture.md` (AGN1-AGN7 definitions and zone assignments)
- **Workflow Gates:** `payload/air/workflow-gates.md` (Gate definitions and enforcement logic)
- **MCP Tools:** `payload/air/mcp-tools.md` (Tool interfaces and mock contracts)
- **Organizational Brief:** Enhancement Build Phase Brief: Customer Analysis System
- **SOP Reference:** DG-CH-01-03-01 (Customer Analysis and Reporting Procedure)

---

**Version:** 1.0.0  
**Last Updated:** 2026-11-12  
**Status:** Binding for MVP implementation
