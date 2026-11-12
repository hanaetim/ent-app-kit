# Agent Architecture: Customer Analysis System

**System:** Customer Analysis System MVP  
**SOP Reference:** DG-CH-01-03-01  
**Agent Count:** 7 specialized agents (AGN1-AGN7)  
**Orchestration Model:** Sequential workflow with deterministic backbone

---

## Architecture Overview

The Customer Analysis System implements a **7-agent architecture** organized around autonomy zones:

- **GREEN Zone (Deterministic):** LLM-free, reproducible operations - extraction, validation, computation, routing
- **AMBER Zone (AI-Assisted):** LLM-powered recommendations requiring human validation - interpretation, synthesis
- **RED Zone:** Not applicable in MVP scope (no sanctions/safety hard-stops)

**Design Principle:** Deterministic operations (GREEN) form the backbone and must remain LLM-free. AI agents (AMBER) produce recommendations only, never autonomous actions affecting customer records.

---

## Agent Catalog

### AGN1: Report Extraction Agent

**Zone:** GREEN (Deterministic)  
**Responsibility:** Extract service reports and validate coverage before analysis proceeds  
**SOP Steps:** ATS1-ATS2

#### Inputs
- Period scope (current cycle identifier)
- Customer identifiers or "all active customers"
- Report categories to extract

#### Outputs
- Extracted service reports (current + prior cycles)
- Coverage validation result (pass/fail)
- Validation details (sample size, coverage metrics, gaps)

#### Core Operations
1. **Extract Service Reports** (TOL1)
   - Retrieve current cycle service data per customer
   - Retrieve prior cycle history (3-8 cycles for trend analysis)
   - Organize by customer, period, category

2. **Validate Dataset Coverage** (TOL2)
   - Apply deterministic coverage requirements
   - Enforce minimum sample size thresholds
   - Check temporal completeness (required prior cycles present)
   - Validate category representation

3. **Gate Enforcement**
   - **Coverage-Before-Analysis Gate:** Fail-closed if coverage insufficient
   - Block downstream analysis on unrepresentative samples
   - Log validation evidence for audit trail

#### Autonomy Contract
- **Deterministic:** All logic rules-based, no LLM calls
- **Reproducible:** Same inputs always yield same coverage decision
- **Fail-Closed:** Insufficient coverage blocks the cycle

#### Error Handling
- Missing prior cycle data → coverage validation failure
- Insufficient sample size → cycle blocked with explicit gap report
- Category gaps → flagged in validation details

---

### AGN2: Quantitative Analysis Agent

**Zone:** GREEN (Deterministic)  
**Responsibility:** Compute period-over-period deltas, behavior metrics, and profitability  
**SOP Steps:** ATS3-ATS4

#### Inputs
- Validated service reports from AGN1
- Cost/revenue data (TOL5)
- Prior cycle baselines

#### Outputs
- Period-over-period delta metrics (service volumes, resolution times, category shifts)
- Behavior metrics (transaction frequency, service diversity, interaction patterns)
- Profitability metrics (cost, revenue, margin by customer)
- Metric citations (source data + formula for every calculated value)

#### Core Operations
1. **Period-Over-Period Analysis** (TOL3)
   - Compare current vs. prior cycle for each customer
   - Calculate absolute and percentage deltas
   - Identify significant changes (threshold-based flagging)

2. **Behavior Metric Computation** (TOL3)
   - Transaction frequency trends
   - Service category diversity
   - Resolution time patterns
   - Interaction channel preferences

3. **Profitability Analysis** (TOL3, TOL5)
   - Cost per customer (from TOL5 reference data)
   - Revenue attribution
   - Profitability margin calculation
   - Cost trend analysis

4. **Citation Generation**
   - Every metric must reference source data
   - Formula documentation for derived metrics
   - Traceability for audit compliance

#### Autonomy Contract
- **Deterministic:** All calculations formula-based, no LLM involvement
- **Reproducible:** Same data inputs yield identical metric outputs
- **Production Logic:** Computations use production-ready formulas (not mocked)

#### Metric Registry (Examples)
- `service_volume_delta`: (current_volume - prior_volume) / prior_volume
- `transaction_frequency`: total_transactions / analysis_period_days
- `service_diversity_score`: unique_service_categories / total_available_categories
- `profitability_margin`: (revenue - cost) / revenue

---

### AGN3: Behavioral & Needs Interpretation Agent

**Zone:** AMBER (AI-Assisted)  
**Responsibility:** Interpret behavior patterns and derive customer needs/wants  
**SOP Steps:** ATS5-ATS6

#### Inputs
- Quantitative metrics from AGN2
- Service report context from AGN1
- Prior cycle interpretations (for consistency)

#### Outputs
- Behavioral pattern interpretations (narrative insights)
- Identified customer needs (explicit from behavior)
- Identified customer wants (inferred preferences)
- Confidence levels for interpretations
- Supporting evidence citations

#### Core Operations
1. **Behavior Pattern Recognition**
   - Analyze metric trends using LLM reasoning
   - Identify significant behavior changes
   - Contextualize changes against customer segment norms
   - Generate narrative explanations

2. **Needs & Wants Derivation**
   - Explicit needs: directly observable from service usage
   - Inferred wants: preferences derived from behavior patterns
   - Prioritize based on signal strength and recency

3. **Evidence Linking**
   - Every interpretation cites supporting metrics
   - Link to specific service reports or behavior events
   - Flag interpretations with weak evidence

4. **Consistency Check**
   - Compare to prior cycle interpretations
   - Flag contradictions or significant perspective shifts
   - Maintain interpretation continuity where justified

#### Autonomy Contract
- **AI-Assisted:** LLM generates interpretation recommendations
- **Human-Validated:** Analyst reviews and approves at review gate
- **No Autonomous Action:** Recommendations do not update customer records
- **Promotable:** Design allows future automation of validated patterns

#### Review Gate Requirements
- Analyst validates interpretation quality
- Checks evidence linkage completeness
- Approves or requests rework
- Can override or refine LLM recommendations

---

### AGN4: Satisfaction Analysis Agent

**Zone:** AMBER (AI-Assisted)  
**Responsibility:** Synthesize satisfaction insights from surveys, complaints, compliments  
**SOP Steps:** ATS7-ATS8

#### Inputs
- Satisfaction survey responses (TOL4)
- Complaint records (TOL4)
- Compliment records (TOL4)
- Sentiment history (TOL4)
- Service interaction context from AGN1

#### Outputs
- Satisfaction trend analysis
- Key satisfaction drivers (positive/negative)
- Complaint/compliment synthesis
- Sentiment trajectory (improving/declining/stable)
- Actionable satisfaction insights

#### Core Operations
1. **Survey Data Analysis**
   - Aggregate survey responses by category
   - Identify satisfaction score trends
   - Correlate satisfaction with service metrics

2. **Complaint/Compliment Synthesis**
   - Extract themes from complaint records
   - Identify compliment patterns
   - Link feedback to specific service interactions
   - Quantify feedback frequency and recency

3. **Sentiment Trajectory Analysis**
   - Track sentiment changes over cycles
   - Identify improving vs. declining satisfaction
   - Flag sudden sentiment shifts for attention

4. **Driver Identification**
   - Determine primary satisfaction drivers (positive)
   - Identify dissatisfaction sources (negative)
   - Prioritize by impact magnitude and actionability

#### Autonomy Contract
- **AI-Assisted:** LLM synthesizes satisfaction insights
- **Human-Validated:** Analyst reviews at review gate
- **No Autonomous Action:** Recommendations only
- **Promotable:** Future automation for validated synthesis patterns

#### Review Gate Requirements
- Analyst validates synthesis accuracy
- Checks complaint/compliment linkage
- Approves satisfaction trajectory assessment
- Can refine or override LLM insights

---

### AGN5: Segmentation Agent

**Zone:** AMBER (AI-Assisted)  
**Responsibility:** Assign customer segments against classification framework  
**SOP Steps:** ATS9-ATS10

#### Inputs
- Quantitative metrics from AGN2
- Behavioral interpretations from AGN3
- Satisfaction insights from AGN4
- Classification framework (versioned, read-only)
- Prior segment assignments (for continuity)

#### Outputs
- Recommended segment assignment
- Segment rationale (why this segment fits)
- Confidence score
- Segment change flag (if different from prior cycle)
- Framework version used

#### Core Operations
1. **Segment Matching** (TOL6)
   - Apply classification framework rules
   - Score customer against segment criteria
   - Use deterministic logic where framework is rule-based
   - Use LLM reasoning for nuanced/qualitative criteria

2. **Segment Recommendation**
   - Recommend best-fit segment
   - Provide multi-sentence rationale
   - Cite supporting metrics and interpretations
   - Flag edge cases or low-confidence assignments

3. **Continuity Check**
   - Compare to prior cycle segment
   - If changed, justify segment transition
   - Ensure transitions are evidence-based

4. **Framework Compliance**
   - Validate against framework version in use
   - Document framework version in output
   - Flag if framework has been updated since prior cycle

#### Autonomy Contract
- **AI-Assisted:** LLM supports segment reasoning (where framework is qualitative)
- **Deterministic Core:** Use production assignment logic (TOL6)
- **Human-Validated:** Analyst approves at review gate
- **No Autonomous Action:** Recommendation does not write to CRM
- **Promotable:** Design for future automation of validated assignments

#### Review Gate Requirements
- Analyst validates segment fit
- Reviews segment change justifications
- Approves or reassigns segment
- Can override LLM recommendation

---

### AGN6: Report Authoring & Lifecycle Agent

**Zone:** AMBER + DET (Mixed)  
**Responsibility:** Draft Arabic report, validate structure/citations, route through gates, lock on approval  
**SOP Steps:** ATS11-ATS14

#### Inputs
- All prior agent outputs (AGN1-AGN5)
- Report template (Arabic)
- Lifecycle state (draft/review/approved)

#### Outputs
- Draft analysis report (تقرير تحليل المتعاملين) in Arabic
- Validation results (schema compliance, citation completeness)
- Routing instructions
- Lock confirmation (post-approval)

#### Core Operations

##### 1. Report Drafting (AMBER)
- Generate Arabic narrative from agent outputs
- Structure report per template
- Ensure proper Arabic encoding and normalization
- Include all mandatory sections:
  - Executive summary (الملخص التنفيذي)
  - Quantitative analysis (التحليل الكمي)
  - Behavioral interpretation (تفسير السلوك)
  - Satisfaction analysis (تحليل الرضا)
  - Segment assignment (تخصيص الشريحة)
  - Recommendations (التوصيات)

##### 2. Validation (DET)
- **Schema Validation:** Report structure conforms to template
- **Citation Validation:** Every quantitative claim has source reference
- **Completeness Check:** All mandatory sections present
- **Arabic Encoding Check:** Proper UTF-8, no corruption
- **Reject if validation fails**

##### 3. Routing (DET) - Delegated to AGN7
- AGN6 requests routing from AGN7 deterministic engine
- AGN7 determines next gate based on workflow state
- AGN6 executes routing instruction (TOL7)

##### 4. Lock Report (DET)
- After Section Head approval, lock report (TOL8)
- Record approval timestamp and approver
- Mark cycle as complete
- Trigger downstream processes (recorded, not executed in MVP)

#### Autonomy Contract
- **AMBER (Drafting):** LLM generates Arabic report text
- **DET (Validation/Routing/Lock):** Rules-based, no LLM
- **Human-Validated:** Section Head approves at mandatory gate
- **No Skip:** Section Head gate cannot be bypassed

#### Section Head Approval Gate (Mandatory)
- **Gate ID:** ATS12
- **Requirement:** Single mandatory human approval per cycle
- **Approver Role:** Section Head
- **Decision:** Approve, Request Rework, or Reject
- **On Rework:** Return to ATS11 (re-draft)
- **On Approve:** Proceed to lock (ATS13)

---

### AGN7: Deterministic Rule Engine

**Zone:** GREEN (Deterministic)  
**Responsibility:** Enforce all GREEN/DET steps, routing logic, and rework loops  
**SOP Steps:** Cross-cutting (all workflow transitions)

#### Inputs
- Workflow state (current step, cycle ID, customer ID)
- Agent outputs (from AGN1-AGN6)
- Gate results (pass/fail, approval/rejection)
- Rework requests

#### Outputs
- Routing decisions (next step in workflow)
- Gate enforcement decisions (allow/block)
- Rework loop instructions
- Workflow state updates

#### Core Operations

##### 1. Workflow State Machine
- Maintain workflow state per cycle
- Track current step (ATS1-ATS14)
- Enforce sequential dependencies
- Manage parallel gate branches (AGN3/AGN4/AGN5 review gates)

##### 2. Gate Enforcement
- **Coverage-Before-Analysis Gate (ATS2):**
  - Block if AGN1 coverage validation failed
  - Allow if passed
  - No override or bypass

- **AMBER Review Gates (ATS6, ATS8, ATS10):**
  - Route to analyst review queue (TOL7)
  - Wait for human decision (approve/rework)
  - Execute rework loop if requested

- **Section Head Approval Gate (ATS12):**
  - Route to Section Head queue (TOL7)
  - Mandatory approval required
  - Lock blocked until approved
  - Support rework loop (return to ATS11)

##### 3. Routing Logic
- Determine next step based on current state
- Apply transition rules (deterministic)
- Handle rework loops (reference: 'العودة للخطوة ٣٠')
- Route parallel branches (AMBER review gates can proceed independently)

##### 4. Rework Loop Management
- On rework request, identify return step
- Reset dependent downstream outputs
- Maintain audit trail of rework iterations
- Enforce max rework limits (prevent infinite loops)

#### Autonomy Contract
- **Deterministic:** All routing logic rules-based, zero LLM involvement
- **Reproducible:** Same state inputs yield same routing decisions
- **Audit Trail:** Every transition logged with timestamp and rationale
- **No Bypass:** Hard gates enforced without override capability

#### State Transitions (Examples)

```
ATS1 (Extract) → ATS2 (Validate Coverage)
  └─ If coverage FAIL → BLOCK (cycle ends)
  └─ If coverage PASS → ATS3 (Quantitative Analysis)

ATS3 → ATS4 → Fork to parallel AMBER branches:
  ├─ ATS5 (Behavioral Interpretation) → ATS6 (Review Gate)
  ├─ ATS7 (Satisfaction Analysis) → ATS8 (Review Gate)
  └─ ATS9 (Segmentation) → ATS10 (Review Gate)

After all three AMBER gates approved → ATS11 (Draft Report)

ATS11 → ATS12 (Section Head Gate)
  └─ If REWORK → ATS11 (re-draft)
  └─ If APPROVE → ATS13 (Lock Report) → ATS14 (Complete)
```

---

## Inter-Agent Communication

### Data Flow

```
AGN1 (Extract & Validate)
  ↓ (validated service reports)
AGN2 (Quantitative Analysis)
  ↓ (metrics + citations)
  ├─→ AGN3 (Behavioral Interpretation) → Review Gate
  ├─→ AGN4 (Satisfaction Analysis) → Review Gate
  └─→ AGN5 (Segmentation) → Review Gate
        ↓ (all three approved)
AGN6 (Report Drafting)
  ↓ (draft report)
AGN7 (Route to Section Head Gate)
  ↓ (approval)
AGN6 (Lock Report)
```

### Agent Interfaces

All agents expose consistent interface contracts:

**Input Schema:**
```python
{
  "cycle_id": str,
  "customer_id": str,
  "inputs": {
    # Agent-specific input data
  },
  "context": {
    "prior_cycle_data": dict,
    "workflow_state": dict
  }
}
```

**Output Schema:**
```python
{
  "agent_id": str,
  "cycle_id": str,
  "customer_id": str,
  "status": "success" | "failure" | "blocked",
  "outputs": {
    # Agent-specific output data
  },
  "citations": [
    {
      "claim": str,
      "source": str,
      "metric_id": str
    }
  ],
  "next_action": "proceed" | "gate_review" | "rework"
}
```

---

## Autonomy Zone Contracts

### GREEN Zone (AGN1, AGN2, AGN7)

**Requirements:**
- Zero LLM calls
- Deterministic logic only (rules, formulas, state machines)
- Reproducible outputs for identical inputs
- Production-ready logic (not mocked)

**Verification:**
- Unit tests must prove determinism
- No variance across runs with same inputs
- Performance must be bounded and predictable

### AMBER Zone (AGN3, AGN4, AGN5, AGN6 drafting)

**Requirements:**
- LLM-powered reasoning for recommendations
- Outputs are recommendations, never autonomous actions
- Mandatory human review gates
- No direct writes to customer records or CRM

**Verification:**
- Review gates enforce human approval
- LLM outputs clearly marked as recommendations
- Rework loop functional for rejected recommendations

### Promotability

**Design Principle:** AMBER steps must be individually promotable from AMBER→GREEN as patterns are validated.

**Promotion Path:**
1. Identify validated pattern (e.g., "segmentation for tier-A customers is 90%+ accurate")
2. Extract pattern logic into deterministic rules
3. Migrate rule logic to GREEN zone implementation
4. Run parallel validation (AMBER + GREEN) to prove equivalence
5. Switch to GREEN implementation for that pattern
6. Retain AMBER as fallback for edge cases

**Current Status:** All AMBER steps remain LLM-assisted in MVP; no patterns promoted yet.

---

## Error Handling & Recovery

### Agent Failure Modes

1. **AGN1 Coverage Validation Failure:**
   - Block cycle with explicit gap report
   - Do not proceed to analysis
   - Notify stakeholders of data gaps

2. **AGN2 Computation Error:**
   - Log error with input context
   - Mark cycle as failed
   - Require manual investigation

3. **AGN3/AGN4/AGN5 LLM Failure:**
   - Retry with backoff (max 3 attempts)
   - Fallback to human analyst if retries exhausted
   - Log LLM failure for monitoring

4. **AGN6 Validation Failure:**
   - Reject draft report
   - Return to drafting with validation error details
   - Do not proceed to Section Head gate

5. **AGN7 State Machine Error:**
   - Log state inconsistency
   - Halt cycle for investigation
   - Do not proceed with invalid state

### Rework Loop Handling

- Maximum 3 rework iterations per gate
- After 3 iterations, escalate to supervisor
- Maintain audit trail of all rework reasons
- Track rework time impact for process improvement

---

## Testing Strategy

### Unit Tests
- **AGN1:** Coverage validation logic with edge cases
- **AGN2:** Metric computation formulas with known inputs
- **AGN7:** State machine transitions (all paths)

### Integration Tests
- **AGN1→AGN2 handoff:** Validated reports flow to quantitative analysis
- **AGN2→AGN3/AGN4/AGN5 fanout:** Metrics distributed to parallel AMBER agents
- **AGN3/AGN4/AGN5→AGN6 convergence:** All AMBER outputs merged into report draft

### End-to-End Tests
- **Full cycle:** AGN1→AGN7 with fixture data
- **Rework loop:** Test Section Head rejection and re-draft
- **Gate enforcement:** Verify hard gates block when required

### Arabic Encoding Tests
- **AGN6 drafting:** Generate Arabic report and verify UTF-8 encoding
- **AGN6 round-trip:** Write and re-read Arabic text without corruption

---

## Performance & Scalability Considerations

### MVP Constraints
- Single-threaded execution (no parallel customer processing)
- File-based workflow state (not production-grade persistence)
- Synchronous agent invocation

### Post-MVP Enhancements
- Batch processing for multiple customers
- Async agent execution
- Database-backed workflow state
- Parallel AMBER review gates (AGN3/AGN4/AGN5 can execute concurrently)

---

## Observability & Monitoring

### Logging Requirements
- Structured logging (JSON format)
- Log every agent invocation with inputs/outputs
- Log every gate decision with rationale
- Log LLM calls with prompts and responses (for AMBER agents)

### Metrics to Track
- Cycle completion time (end-to-end)
- Agent execution time (per agent)
- Gate approval rate (by gate type)
- Rework frequency (by gate and reason)
- LLM failure rate (AMBER agents)

### Audit Trail
- Every workflow state transition logged
- Every human decision recorded (approvals, rework requests)
- Citation traceability for all quantitative claims

---

## Summary

The 7-agent architecture balances **deterministic reliability** (GREEN zone) with **AI-powered insight** (AMBER zone), ensuring that:

1. **Deterministic Backbone:** Extraction, validation, computation, and routing remain LLM-free and reproducible
2. **Human Oversight:** AI recommendations validated at mandatory review gates
3. **Gate Enforcement:** Hard gates (coverage, Section Head approval) cannot be bypassed
4. **Arabic-First:** Proper encoding and report generation throughout
5. **Promotability:** AMBER steps designed for future automation as patterns validate
6. **Audit Compliance:** Full traceability for all decisions and metric calculations

**Next Steps:** Refer to `mcp-tools.md` for detailed MCP tool specifications, `workflow-gates.md` for workflow orchestration, and `data-contracts.md` for entity schemas.
