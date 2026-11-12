# Customer Analysis System Payload

**Project:** Customer Analysis System MVP for General Administration of Customs – Abu Dhabi (DG-CC)  
**SOP Reference:** DG-CH-01-03-01 (Periodic Customer Behavior Analysis)  
**Build Tier:** MVP - Functional acceptance with fixture data

## Overview

This payload package contains all specifications and requirements to build the Customer Analysis System - an Arabic-first application that executes periodic analysis cycles to extract service data, compute metrics, interpret behavior with AI, and generate comprehensive customer analysis reports (تقرير تحليل المتعاملين).

## System Architecture

**Topology:** Single monorepo (`customer-analysis`)  
**Language:** Python 3.11  
**Interface:** CLI + file-based review queue  
**Integration Strategy:** Fixture-backed adapters (swap boundaries for future production integration)

### Agent Architecture (7 Agents)

- **AGN1:** Report Extraction - Extract service reports + validate coverage (GREEN)
- **AGN2:** Quantitative Analysis - Compute deltas, behavior metrics, profitability (GREEN)
- **AGN3:** Behavioral & Needs Interpretation - Interpret behavior patterns + needs/wants (AMBER)
- **AGN4:** Satisfaction Analysis - Synthesize satisfaction insights (AMBER)
- **AGN5:** Segmentation - Assign segments against classification framework (AMBER)
- **AGN6:** Report Authoring & Lifecycle - Draft → validate → route → lock (AMBER+DET)
- **AGN7:** Deterministic Rule Engine - Enforce all GREEN/DET steps and routing logic (GREEN)

### MCP Tools (8 Tools)

All tools implemented with fixture backends for MVP:

- **TOL1:** Retrieve Service Report
- **TOL2:** Validate Dataset Coverage (production logic)
- **TOL3:** Compute Analysis Metrics (production logic)
- **TOL4:** Retrieve Satisfaction & Survey Data
- **TOL5:** Retrieve Cost/Revenue Data
- **TOL6:** Assign Segment (production logic)
- **TOL7:** Route to Review Gate
- **TOL8:** Lock Report

## Key Requirements

### Autonomy Zones

- **GREEN (Deterministic):** Extraction, validation, computation, routing - LLM-free, reproducible
- **AMBER (AI-assisted):** Interpretation, synthesis, generation - recommendations only, human-validated
- **RED:** None (no sanctions/safety hard-stops in scope)

### Mandatory Hard Gates

1. **Coverage-Before-Analysis Gate** - Analysis must not proceed on unrepresentative samples
2. **Section Head Approval Gate** - Single mandatory human approval per cycle
3. **AMBER Output Validation** - AI outputs are recommendations only
4. **Citation Traceability** - Every quantitative claim must trace to source metric

### Data & Language Requirements

- **Primary Language:** Arabic-first (proper encoding, normalization, report generation)
- **Data Classification:** خصوصي (internal limited-privacy)
- **PII Handling:** Customer identifier only; other PII masked in AI payloads
- **Multi-Cycle History:** 3-8 cycles per customer for trend analysis

## Payload Structure

```
payload/
├── repos.yaml                    # Repository topology definition
├── README.md                     # This file - payload overview
├── air/                          # Agent architecture specifications
│   ├── agent-architecture.md     # 7-agent architecture definition
│   ├── mcp-tools.md             # 8 MCP tool specifications
│   ├── workflow-gates.md        # Analysis cycle workflow & mandatory gates
│   ├── autonomy-zones.md        # GREEN/AMBER/RED zone contracts
│   └── data-contracts.md        # Entity schemas & fixture contracts
├── requirements/                 # Business requirements & context
│   ├── business-context.md      # DG-CC context, SOP summary, regulatory drivers
│   ├── functional-requirements.md # Core features & acceptance criteria
│   ├── acceptance-criteria.md   # MVP acceptance gates
│   └── risk-register.md         # Risk references & mitigation requirements
└── constraints/                  # Technical & operational constraints
    ├── technical-constraints.md  # Deterministic backbone, promotability, tech stack
    ├── integration-strategy.md   # External system mocking & swap boundaries
    └── arabic-requirements.md    # Arabic-first encoding, normalization, reporting
```

## Build Instructions

1. **Setup Kit:**
   ```bash
   npx --yes --package ./ent-app-kit ent-app-kit setup
   ```

2. **Build Application:**
   Execute the kit orchestrator with the payload to generate the complete customer-analysis repository with all agents, tools, fixtures, and tests.

3. **Validation:**
   - All 7 agents operational
   - All 8 tools functional with fixture backends
   - Gates enforce correctly
   - Arabic report generation works
   - End-to-end cycle executes on fixture data

## Acceptance Criteria Summary

### Functional (Must Pass for MVP)

- ✓ Single cycle executes end-to-end on fixture data
- ✓ All seven agents operational with correct I/O contracts
- ✓ All eight MCP tools functional with fixture backends
- ✓ Coverage validation gate enforces sample requirements
- ✓ Three AMBER review gates route correctly
- ✓ Section Head approval gate blocks lock until approved
- ✓ Arabic report generation with proper encoding
- ✓ Citation traceability enforced
- ✓ Rework loop functional
- ✓ Setup/run documentation complete

### Deferred to Post-MVP

- Statistical reliability targets (90% segmentation accuracy, etc.)
- Evaluation harness with regression baseline
- Real system integration (CRM/BPMS/survey APIs)
- Production OAuth 2.0 implementation
- Control Tower audit trace integration

## Key Design Principles

1. **Preserve Deterministic Backbone:** No LLM in GREEN zone
2. **Single Section Head Gate:** One mandatory approval per cycle
3. **Arabic-First:** Proper encoding, normalization, report generation throughout
4. **Clean Swap Boundaries:** Tool interfaces ready for real integration
5. **Gate Enforcement:** Hard gates cannot be bypassed
6. **Modular Design:** AMBER steps individually promotable to GREEN

## References

- **SOP:** DG-CH-01-03-01 - Periodic Customer Analysis Process
- **Risk Register:** RSK-OPS-PRO-114/115/116/117, RSK-OPS-PPL-04/05
- **Classification:** خصوصي (internal limited-privacy)
- **Regulatory Context:** Customs process automation & service quality monitoring

---

**For detailed specifications, refer to the domain directories above.**
