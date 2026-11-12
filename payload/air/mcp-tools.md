# MCP Tools Specification: Customer Analysis System

**System:** Customer Analysis System MVP  
**Tool Count:** 8 specialized MCP tools (TOL1-TOL8)  
**Integration Strategy:** Fixture-backed for MVP, with clean swap boundaries for production

---

## Tool Architecture Principles

### Fixture-Backed MVP Strategy

All tools implemented with **fixture backends** for MVP to prove functional acceptance without dependency on live external systems (CRM, BPMS, survey module).

**Swap Boundary:** Tool interface is the replacement point. Production implementations swap fixture logic with real connectors without changing agent-facing signatures.

**Fixture Requirements:**
- Realistic data structures matching production schemas
- Multi-cycle history (3-8 cycles per customer)
- Edge cases (gaps, anomalies, boundary conditions)
- Arabic text with proper encoding

### Tool Interface Contract

Every tool exposes a consistent interface:

```python
class MCPTool:
    def execute(self, params: dict) -> ToolResult:
        """
        Execute tool operation.
        
        Args:
            params: Tool-specific parameters (validated against schema)
            
        Returns:
            ToolResult with status, data, and error details
        """
        pass
```

**ToolResult Schema:**
```python
{
    "status": "success" | "failure" | "partial",
    "data": dict,  # Tool-specific output
    "errors": [str],  # Error messages if status != success
    "metadata": {
        "execution_time_ms": int,
        "data_source": "fixture" | "production",
        "fixture_version": str  # For MVP
    }
}
```

---

## Tool Catalog

### TOL1: Retrieve Service Report

**Purpose:** Extract service reports for specified customer(s) and period(s)  
**Zone:** GREEN (Deterministic)  
**Used By:** AGN1 (Report Extraction)

#### Parameters

```python
{
    "customer_id": str | list[str] | "all_active",
    "current_cycle_id": str,  # e.g., "2026-Q4"
    "prior_cycles_count": int,  # How many prior cycles to retrieve (default 3)
    "categories": list[str] | "all"  # Service categories to include
}
```

#### Output Schema

```python
{
    "status": "success",
    "data": {
        "customers": [
            {
                "customer_id": str,
                "cycles": [
                    {
                        "cycle_id": str,
                        "period_start": str,  # ISO date
                        "period_end": str,
                        "service_reports": [
                            {
                                "report_id": str,
                                "category": str,  # e.g., "استشارات جمركية", "تخليص جمركي"
                                "service_count": int,
                                "total_value": float,
                                "avg_resolution_time_hours": float,
                                "channel": str,  # "online" | "in-person" | "phone"
                                "status": str  # "completed" | "pending" | "cancelled"
                            }
                        ]
                    }
                ]
            }
        ]
    }
}
```

#### MVP Fixture Implementation

**Fixture Data Strategy:**
- Seed 50-100 synthetic customers
- Each customer has 3-8 cycle history
- Service categories: 8-12 common customs service types (Arabic names)
- Realistic volume distributions (some high-volume, some sporadic)
- Time-series trends (growth, decline, stable patterns)

**Fixture Location:** `fixtures/service_reports/`

**Fixture Files:**
- `customers.json` - Customer master list
- `cycles.json` - Cycle definitions with period boundaries
- `service_reports_by_customer_cycle.json` - Report data indexed by customer + cycle

**Production Replacement:**
- Swap to CRM read API (OAuth 2.0 authenticated)
- Real-time query with same parameter schema
- Production endpoint: `https://crm.dgcc.ae/api/v1/service-reports`

---

### TOL2: Validate Dataset Coverage

**Purpose:** Validate that extracted service data meets coverage requirements before analysis proceeds  
**Zone:** GREEN (Deterministic)  
**Used By:** AGN1 (Report Extraction)

#### Parameters

```python
{
    "customer_id": str,
    "cycle_id": str,
    "service_reports": list[dict],  # Output from TOL1
    "coverage_requirements": {
        "min_sample_size": int,  # Minimum transactions required
        "required_prior_cycles": int,  # How many prior cycles must be present
        "required_categories": list[str] | "any"  # Must have data in these categories
    }
}
```

#### Output Schema

```python
{
    "status": "success",
    "data": {
        "coverage_result": "pass" | "fail",
        "validation_details": {
            "sample_size": int,
            "sample_size_threshold": int,
            "sample_size_met": bool,
            "prior_cycles_present": int,
            "prior_cycles_required": int,
            "prior_cycles_met": bool,
            "category_coverage": {
                "required": list[str],
                "present": list[str],
                "missing": list[str],
                "coverage_met": bool
            }
        },
        "gaps": [
            {
                "gap_type": "sample_size" | "prior_cycles" | "category",
                "description": str,  # Arabic description
                "recommendation": str
            }
        ]
    }
}
```

#### MVP Implementation

**Logic Status:** **Production-ready deterministic logic** (not mocked)

**Validation Rules:**
1. **Sample Size Check:**
   - Minimum 5 transactions in current cycle (configurable threshold)
   - If below threshold → fail with gap report

2. **Prior Cycle Check:**
   - At least 3 prior cycles present (default)
   - If fewer than required → fail with gap report

3. **Category Coverage Check:**
   - If specific categories required, check presence in current cycle
   - If missing → fail with gap report

**Configuration:** `config/coverage_requirements.yaml`

**Production Readiness:** This tool's logic is production-ready now. No swap needed (logic stays, data source from TOL1 may change).

---

### TOL3: Compute Analysis Metrics

**Purpose:** Calculate period-over-period deltas, behavior metrics, and profitability  
**Zone:** GREEN (Deterministic)  
**Used By:** AGN2 (Quantitative Analysis)

#### Parameters

```python
{
    "customer_id": str,
    "current_cycle": dict,  # Service reports for current cycle
    "prior_cycles": list[dict],  # Service reports for prior cycles
    "cost_revenue_data": dict  # Output from TOL5
}
```

#### Output Schema

```python
{
    "status": "success",
    "data": {
        "customer_id": str,
        "cycle_id": str,
        "metrics": {
            "period_over_period_deltas": {
                "service_volume_delta_pct": float,
                "service_volume_delta_abs": int,
                "avg_resolution_time_delta_hours": float,
                "category_shift": list[dict]  # Changed category preferences
            },
            "behavior_metrics": {
                "transaction_frequency": float,  # Transactions per month
                "service_diversity_score": float,  # 0-1, higher = more diverse
                "interaction_channel_distribution": dict,  # Breakdown by channel
                "seasonality_indicator": str  # "stable" | "seasonal" | "irregular"
            },
            "profitability_metrics": {
                "total_cost": float,
                "total_revenue": float,
                "profit_margin_pct": float,
                "cost_trend": str  # "increasing" | "decreasing" | "stable"
            }
        },
        "citations": [
            {
                "metric_id": str,  # e.g., "service_volume_delta_pct"
                "formula": str,
                "source_data": dict,  # References to input data
                "calculation_timestamp": str
            }
        ]
    }
}
```

#### MVP Implementation

**Logic Status:** **Production-ready deterministic logic** (not mocked)

**Metric Formulas:**

1. **Service Volume Delta:**
   ```
   delta_pct = (current_volume - prior_volume) / prior_volume * 100
   delta_abs = current_volume - prior_volume
   ```

2. **Transaction Frequency:**
   ```
   frequency = total_transactions / analysis_period_days
   ```

3. **Service Diversity Score:**
   ```
   diversity = unique_categories_used / total_available_categories
   ```

4. **Profit Margin:**
   ```
   margin_pct = (revenue - cost) / revenue * 100
   ```

**Citation Generation:**
- Every computed metric includes formula + source data references
- Traceability for audit compliance

**Production Readiness:** Formulas are production-ready. Input data source may change (from fixtures to CRM), but computation logic remains.

---

### TOL4: Retrieve Satisfaction & Survey Data

**Purpose:** Extract satisfaction surveys, complaint/compliment records, and sentiment history  
**Zone:** GREEN (Deterministic)  
**Used By:** AGN4 (Satisfaction Analysis)

#### Parameters

```python
{
    "customer_id": str,
    "cycle_id": str,
    "prior_cycles_count": int,  # Include history for trend analysis
    "data_types": list[str]  # ["surveys", "complaints", "compliments", "sentiment"]
}
```

#### Output Schema

```python
{
    "status": "success",
    "data": {
        "customer_id": str,
        "satisfaction_data": {
            "surveys": [
                {
                    "survey_id": str,
                    "cycle_id": str,
                    "date": str,
                    "overall_score": float,  # 1-5 scale
                    "category_scores": dict,  # Scores by service category
                    "open_feedback": str  # Arabic text
                }
            ],
            "complaints": [
                {
                    "complaint_id": str,
                    "date": str,
                    "category": str,
                    "description": str,  # Arabic text
                    "status": str,  # "open" | "resolved" | "escalated"
                    "resolution_time_hours": float
                }
            ],
            "compliments": [
                {
                    "compliment_id": str,
                    "date": str,
                    "category": str,
                    "description": str  # Arabic text
                }
            ],
            "sentiment_history": [
                {
                    "cycle_id": str,
                    "sentiment_score": float,  # -1 to +1
                    "sentiment_label": str  # "positive" | "neutral" | "negative"
                }
            ]
        }
    }
}
```

#### MVP Fixture Implementation

**Fixture Data Strategy:**
- 30-50% of customers have survey responses per cycle
- 10-15% have complaints (realistic noise level)
- 5-8% have compliments
- Sentiment scores trend over time (improve/decline/stable)
- All text in Arabic with proper UTF-8 encoding

**Fixture Location:** `fixtures/satisfaction_data/`

**Production Replacement:**
- Swap to CRM survey module API
- Event-driven ingestion from complaint/compliment system
- Production endpoint: `https://crm.dgcc.ae/api/v1/satisfaction`

---

### TOL5: Retrieve Cost/Revenue Data

**Purpose:** Extract cost and revenue data for profitability analysis  
**Zone:** GREEN (Deterministic)  
**Used By:** AGN2 (Quantitative Analysis)

#### Parameters

```python
{
    "customer_id": str,
    "cycle_id": str,
    "prior_cycles_count": int  # For trend analysis
}
```

#### Output Schema

```python
{
    "status": "success",
    "data": {
        "customer_id": str,
        "profitability_records": [
            {
                "cycle_id": str,
                "period_start": str,
                "period_end": str,
                "cost_breakdown": {
                    "service_delivery_cost": float,
                    "support_cost": float,
                    "overhead_allocation": float,
                    "total_cost": float
                },
                "revenue_breakdown": {
                    "service_fees": float,
                    "other_revenue": float,
                    "total_revenue": float
                },
                "currency": "AED"
            }
        ]
    }
}
```

#### MVP Fixture Implementation

**Fixture Data Strategy:**
- Cost/revenue aligned with service volumes from TOL1
- Realistic profitability distributions (some high-margin, some low-margin)
- Trends over cycles (cost increases, revenue shifts)

**Fixture Location:** `fixtures/profitability_data/`

**Production Replacement:**
- Swap to CRM financial module API
- May require aggregation from multiple financial systems
- Production endpoint: `https://crm.dgcc.ae/api/v1/profitability`

---

### TOL6: Assign Segment

**Purpose:** Assign customer to segment based on classification framework  
**Zone:** AMBER (AI-Assisted with deterministic core)  
**Used By:** AGN5 (Segmentation)

#### Parameters

```python
{
    "customer_id": str,
    "cycle_id": str,
    "metrics": dict,  # Output from AGN2
    "behavioral_interpretation": dict,  # Output from AGN3
    "satisfaction_insights": dict,  # Output from AGN4
    "classification_framework": dict,  # Versioned framework
    "prior_segment": str | None  # For continuity check
}
```

#### Output Schema

```python
{
    "status": "success",
    "data": {
        "customer_id": str,
        "cycle_id": str,
        "recommended_segment": str,  # e.g., "متعامل استراتيجي", "متعامل منتظم"
        "segment_rationale": str,  # Arabic explanation
        "confidence_score": float,  # 0-1
        "segment_criteria_match": {
            "criterion_1": {"met": bool, "value": float, "threshold": float},
            "criterion_2": {"met": bool, "value": float, "threshold": float}
            # ... all criteria from framework
        },
        "segment_change": {
            "is_changed": bool,
            "prior_segment": str,
            "transition_justification": str  # If changed
        },
        "framework_version": str
    }
}
```

#### MVP Implementation

**Logic Status:** **Production-ready deterministic assignment logic** where framework is rule-based; LLM-assisted where framework has qualitative criteria.

**Assignment Logic:**

1. **Rule-Based Criteria (Deterministic):**
   - Transaction volume thresholds
   - Revenue/profitability bands
   - Service diversity minimums
   - Apply deterministic matching

2. **Qualitative Criteria (LLM-Assisted):**
   - "Strategic importance" assessment
   - "Growth potential" evaluation
   - Use LLM reasoning with metrics + interpretations as context

3. **Hybrid Scoring:**
   - Weight rule-based criteria (70%)
   - Weight LLM qualitative assessment (30%)
   - Select segment with highest score

**Classification Framework:** Loaded from `fixtures/classification_framework.json` (versioned)

**Production Readiness:** Core assignment logic is production-ready. Framework source may change (from fixture to CRM config endpoint).

---

### TOL7: Route to Review Gate

**Purpose:** Route analysis outputs to appropriate human review gates  
**Zone:** GREEN (Deterministic)  
**Used By:** AGN7 (Deterministic Rule Engine)

#### Parameters

```python
{
    "cycle_id": str,
    "customer_id": str,
    "gate_type": str,  # "amber_review" | "section_head_approval"
    "gate_target": str,  # Which agent output to review (e.g., "AGN3", "AGN4", "AGN5", "AGN6")
    "review_payload": dict,  # Agent output to review
    "routing_context": dict  # Workflow state, prior decisions
}
```

#### Output Schema

```python
{
    "status": "success",
    "data": {
        "review_id": str,  # Unique review queue entry ID
        "gate_type": str,
        "gate_target": str,
        "queue_name": str,  # "analyst_queue" | "section_head_queue"
        "routing_timestamp": str,
        "review_status": "pending" | "approved" | "rework_requested",
        "reviewer_role": str,  # Expected reviewer role
        "sla_deadline": str  # Expected review completion time
    }
}
```

#### MVP Fixture Implementation

**Backend Strategy:** **File-based workflow state machine**

**Implementation:**
- Reviews stored as JSON files in `state/review_queue/`
- Each review has status: pending → approved/rework
- CLI command to simulate reviewer actions: `approve`, `request_rework`

**State Files:**
- `state/review_queue/pending/` - Active review queue
- `state/review_queue/approved/` - Approved reviews (archived)
- `state/review_queue/rework/` - Rework requests with feedback

**Production Replacement:**
- Swap to BPMS workflow API (event-driven)
- Real-time routing with user notifications
- Production endpoint: `https://bpms.dgcc.ae/api/v1/workflow/route`

---

### TOL8: Lock Report

**Purpose:** Lock analysis report after Section Head approval  
**Zone:** GREEN (Deterministic)  
**Used By:** AGN6 (Report Authoring & Lifecycle)

#### Parameters

```python
{
    "cycle_id": str,
    "customer_id": str,
    "report_id": str,
    "approval_record": {
        "approver_id": str,
        "approver_role": str,
        "approval_timestamp": str,
        "approval_signature": str  # Simulated in MVP
    }
}
```

#### Output Schema

```python
{
    "status": "success",
    "data": {
        "report_id": str,
        "lock_status": "locked",
        "lock_timestamp": str,
        "approver_id": str,
        "cycle_status": "complete",
        "downstream_triggers": [
            {
                "trigger_id": str,
                "trigger_type": str,  # e.g., "archive", "publish", "notify"
                "status": "recorded"  # Not executed in MVP
            }
        ]
    }
}
```

#### MVP Fixture Implementation

**Backend Strategy:** **In-memory/file-based approval tracking**

**Implementation:**
- Locked reports stored in `state/locked_reports/`
- Lock includes approval metadata + report content snapshot
- Lock is immutable (no unlock in MVP scope)

**Lock Enforcement:**
- Once locked, report cannot be modified
- Rework requires new cycle (prior report remains locked)

**Production Replacement:**
- Swap to BPMS lock API (event-driven)
- Immutable audit trail with cryptographic signatures
- Production endpoint: `https://bpms.dgcc.ae/api/v1/workflow/lock`

---

## Tool Implementation Architecture

### Directory Structure

```
customer-analysis/
├── tools/                        # MCP tools package
│   ├── __init__.py
│   ├── base.py                   # ToolResult, MCPTool base class
│   ├── tol1_service_report.py
│   ├── tol2_coverage_validation.py
│   ├── tol3_metrics_computation.py
│   ├── tol4_satisfaction_data.py
│   ├── tol5_profitability_data.py
│   ├── tol6_segmentation.py
│   ├── tol7_routing.py
│   ├── tol8_lock_report.py
│   └── registry.py               # Tool registry for agent access
├── fixtures/                     # Fixture data for MVP
│   ├── service_reports/
│   ├── satisfaction_data/
│   ├── profitability_data/
│   ├── classification_framework.json
│   └── fixture_metadata.json
├── state/                        # Runtime state (file-based for MVP)
│   ├── review_queue/
│   └── locked_reports/
└── config/
    └── coverage_requirements.yaml
```

### Fixture Data Requirements

#### Multi-Cycle History
- 50-100 synthetic customers
- Each customer: 3-8 cycle history
- Cycles: Q4-2024, Q1-2025, Q2-2025, Q3-2025, Q4-2025 (cover 5 quarters)

#### Realistic Distributions
- Customer segments: 60% regular, 25% high-value, 10% strategic, 5% at-risk
- Service volumes: Pareto distribution (80% of volume from 20% of customers)
- Satisfaction: Normal distribution around 3.8/5.0 with outliers

#### Arabic Text Encoding
- All text fields: UTF-8 encoding
- Service category names in Arabic
- Complaint/compliment descriptions in Arabic
- Report text in Arabic

#### Edge Cases
- Missing prior cycle data (for TOL2 coverage validation test)
- Zero-transaction customers (edge case)
- Complaint spikes (satisfaction anomaly)
- Segment boundary cases (just above/below threshold)

### Production Swap Strategy

**Phase 1 (MVP):** All tools use fixture backends

**Phase 2 (Production Prep):**
1. Implement production connectors (CRM, BPMS APIs)
2. Run parallel validation (fixture vs. production)
3. Prove schema compatibility

**Phase 3 (Production Cutover):**
1. Swap tool backends (fixture → production)
2. Agent code unchanged (interface contract preserved)
3. Configuration flag: `TOOL_BACKEND=production`

**Configuration-Driven Swap:**
```yaml
# config/tool_backends.yaml
tools:
  TOL1:
    backend: fixture  # or "production"
    fixture_path: fixtures/service_reports/
    production_endpoint: https://crm.dgcc.ae/api/v1/service-reports
  TOL2:
    backend: production  # Logic already production-ready
  # ... etc
```

---

## Tool Testing Strategy

### Unit Tests
- **Each tool:** Test with fixture inputs, validate output schema
- **Edge cases:** Missing data, invalid inputs, boundary conditions
- **Deterministic tools (TOL2, TOL3):** Prove reproducibility (same input → same output)

### Integration Tests
- **Tool chaining:** TOL1→TOL2 (extract then validate), TOL2→TOL3 (validate then compute)
- **Agent-tool handoff:** AGN1 calls TOL1, AGN2 calls TOL3

### Fixture Validation Tests
- **Schema compliance:** All fixture data matches production schemas
- **Arabic encoding:** UTF-8 round-trip without corruption
- **Multi-cycle integrity:** Prior cycle references are valid

### Production Readiness Tests
- **TOL2, TOL3, TOL6:** Prove production logic correctness with known inputs
- **Interface contract:** Agents can swap fixture↔production without code changes

---

## Error Handling Standards

### Tool Failure Modes

1. **Data Not Found:**
   - Return `status: "partial"` with available data + gaps list
   - Agent decides whether to proceed or block

2. **Validation Failure:**
   - Return `status: "failure"` with detailed error messages
   - Include recommendations for remediation

3. **Computation Error:**
   - Return `status: "failure"` with error context
   - Log input data for debugging

4. **Timeout:**
   - Return `status: "failure"` after timeout threshold (30s per tool)
   - Log timeout for monitoring

### Retry Logic

- **Transient errors:** Retry up to 3 times with exponential backoff
- **Permanent errors:** Fail immediately (e.g., schema validation)
- **Agent responsibility:** Agents decide whether to retry tool calls

---

## Performance Requirements

### MVP Targets (Fixture Backend)
- **TOL1:** <100ms per customer (all cycles)
- **TOL2:** <50ms validation
- **TOL3:** <200ms computation (all metrics + citations)
- **TOL4:** <100ms per customer
- **TOL5:** <50ms per customer
- **TOL6:** <500ms (includes LLM call for qualitative criteria)
- **TOL7:** <50ms routing (file write)
- **TOL8:** <100ms lock (file write + validation)

### Production Targets (Post-MVP)
- **Network-bound tools (TOL1, TOL4, TOL5):** <500ms (includes API call latency)
- **Local computation tools (TOL2, TOL3, TOL6):** Same as MVP
- **BPMS tools (TOL7, TOL8):** <300ms (event publish)

---

## Summary

The 8-tool architecture provides:

1. **Clean Swap Boundaries:** Fixture→production swap without agent code changes
2. **Production-Ready Logic:** TOL2, TOL3, TOL6 core logic is production-grade now
3. **Fixture Realism:** Realistic multi-cycle data for functional acceptance
4. **Arabic-First:** Proper UTF-8 encoding in all text fields
5. **Deterministic Reliability:** GREEN tools (TOL1, TOL2, TOL3, TOL5, TOL7, TOL8) are LLM-free
6. **Gate Support:** TOL7/TOL8 enable workflow gates and approval tracking

**Next Steps:** Refer to `workflow-gates.md` for workflow orchestration using these tools, and `data-contracts.md` for detailed entity schemas.
