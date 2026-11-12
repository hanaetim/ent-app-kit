# Technical Constraints — Customer Analysis System

This document defines the technical constraints for the Customer Analysis System MVP, including deterministic backbone requirements, promotability architecture, technology stack, and implementation boundaries.

## Constraint Categories

1. **Deterministic Backbone:** Requirements for GREEN zone determinism and reproducibility
2. **Promotability:** Architecture patterns enabling fixture-to-real system swap
3. **Technology Stack:** Prescribed languages, frameworks, and libraries
4. **Deployment Model:** Execution environment and infrastructure constraints
5. **Development Standards:** Code quality, testing, and documentation requirements

---

## C-001: Deterministic Backbone (GREEN Zone)

### Constraint Statement
All GREEN zone operations MUST produce identical outputs given identical inputs, with zero tolerance for non-determinism. GREEN zone code paths must be unit-testable with 100% reproducibility.

### Rationale
- Workflow integrity depends on predictable gate enforcement (coverage validation, citation checking)
- Audit compliance requires reproducible calculations for verification
- Debugging and testing require deterministic behavior

### Technical Requirements

**TR-001.1: No LLM Inference in GREEN Zone**
- GREEN zone agents (AGN1, AGN7) and operations MUST NOT invoke LLM APIs
- All logic must be implemented as deterministic functions (pure functions preferred)
- Probabilistic algorithms (ML models, randomness) are prohibited in GREEN zone

**TR-001.2: Controlled Timestamps**
- System-generated timestamps for GREEN zone operations MUST use cycle period boundaries, not system clock
- Example: Coverage validation timestamp = cycle_period_end, not `datetime.now()`
- Audit trail timestamps can use system clock (logged, not computed upon)

**TR-001.3: Deterministic Data Structures**
- Use ordered collections (lists, sorted dicts) in GREEN zone, not unordered (sets, plain dicts)
- Iteration order must be predictable (sort by ID/timestamp before iteration)
- Floating-point arithmetic for currency MUST use `Decimal` type, not `float`

**TR-001.4: Fixed Random Seeds**
- If any GREEN zone operation requires randomness (e.g., sampling), use fixed seed per cycle
- Seed derivation: `hash(cycle_id) % 2**32` (deterministic per cycle, varies across cycles)

### Validation Approach

**Determinism Test Pattern:**
```python
def test_green_zone_determinism():
    """All GREEN zone operations must be deterministic."""
    # Setup identical inputs
    customers = load_fixture_customers()
    reports = load_fixture_reports()
    
    # Execute operation twice
    result1 = calculate_coverage_percentage(customers, reports)
    result2 = calculate_coverage_percentage(customers, reports)
    
    # Assert byte-for-byte identical outputs
    assert result1 == result2
    assert json.dumps(result1, sort_keys=True) == json.dumps(result2, sort_keys=True)
```

**Coverage Target:** 100% of GREEN zone functions pass determinism test

### Non-Compliance Consequences
- GREEN zone determinism failures are **must-fix** conformance violations
- Cannot merge code that introduces non-determinism into GREEN zone paths
- Regression test suite must catch determinism violations before deployment

---

## C-002: Promotability Architecture

### Constraint Statement
System architecture MUST enable seamless swap from fixture backends (MVP) to real system integrations (hardening) without changing core agent logic or workflow orchestration.

### Rationale
- MVP validates workflow logic with fixture backends (fast, isolated, no external dependencies)
- Hardening phase swaps fixtures for real CRM/BPMS/survey APIs without rewriting agents
- Promotability reduces hardening iteration risk and cost

### Technical Requirements

**TR-002.1: Dependency Injection for MCP Tools**
- All agents (AGN1-AGN7) receive tool interfaces via dependency injection, not hard-coded imports
- Tool interface abstractions (Python protocols or abstract base classes) define contracts
- Fixture implementations and real implementations satisfy same interface contract

**Example:**
```python
from typing import Protocol, List
from dataclasses import dataclass

class ServiceReportTool(Protocol):
    """Tool interface for fetching service reports (TOL1)."""
    def fetch_service_reports(
        self, 
        customer_ids: List[str], 
        period_start: date, 
        period_end: date
    ) -> List[ServiceReport]:
        ...

class FixtureServiceReportTool:
    """Fixture implementation (MVP)."""
    def __init__(self, fixture_path: str):
        self.fixture_data = load_json(fixture_path)
    
    def fetch_service_reports(self, customer_ids, period_start, period_end):
        # Filter fixture data by date range
        return [r for r in self.fixture_data if r.report_date in range...]

class RealServiceReportTool:
    """Real CRM API implementation (hardening)."""
    def __init__(self, crm_client: CRMClient):
        self.crm_client = crm_client
    
    def fetch_service_reports(self, customer_ids, period_start, period_end):
        # Call real CRM API with OAuth 2.0
        return self.crm_client.get_service_reports(customers, period_start, period_end)

# Agent receives tool via dependency injection
class AGN1_ReportExtraction:
    def __init__(self, service_report_tool: ServiceReportTool):
        self.tool = service_report_tool  # Works with fixture or real implementation
    
    def extract_reports(self, customer_ids, cycle_period):
        return self.tool.fetch_service_reports(customer_ids, cycle_period.start, cycle_period.end)
```

**TR-002.2: Configuration-Driven Tool Selection**
- Tool implementation selection controlled by configuration file or environment variable
- Example: `TOOL_MODE=fixture` (MVP) vs. `TOOL_MODE=real` (hardening)
- No code changes required to swap implementations

**TR-002.3: Swap Boundary Documentation**
- Each MCP tool (TOL1-TOL8) specification documents swap boundary:
  - Interface contract (method signatures, data types)
  - Fixture implementation details
  - Real implementation requirements (OAuth, API endpoints, error handling)
- See `payload/air/mcp-tools.md` for detailed swap contracts

**TR-002.4: Database Abstraction (SQLAlchemy ORM)**
- All database access through SQLAlchemy ORM, not raw SQL
- Swap SQLite (MVP) for PostgreSQL/MySQL (hardening) via connection string change
- Schema migrations managed with Alembic (version-controlled DDL)

### Validation Approach

**Swap Test (Hardening Phase):**
1. Run full cycle with fixture tools → record outputs (reports, audit trail)
2. Swap to real tools (same input period) → record outputs
3. Compare outputs: reports should be semantically equivalent (data differs, structure identical)
4. Validate audit trail completeness in both modes

---

## C-003: Technology Stack

### Constraint Statement
Customer Analysis System MVP uses Python 3.11+ with prescribed frameworks and libraries to ensure consistency, supportability, and integration compatibility.

### Rationale
- DG-CC IT operations team supports Python and standardized frameworks
- Enterprise App Kit method adapters generate Python code for agentic applications
- Anthropic SDK (Python) is reference implementation for Claude API access

### Required Stack Components

**Programming Language:**
- **Python 3.11 or later** (required for `asyncio` improvements, `typing` features)
- No Python 2.x compatibility required (pure Python 3)

**Agent Framework:**
- **Anthropic SDK (direct)** for MVP (no LangGraph/Strands abstraction)
- Rationale: Simplest implementation, lowest abstraction overhead, fastest iteration
- Hardening phase may adopt LangGraph/Strands if multi-LLM support required

**LLM Model:**
- **Claude Sonnet 4.5** (via Anthropic API)
- Required for Arabic language generation quality
- Fallback: Claude Opus 4 if specific tasks require higher capability

**Database:**
- **SQLite 3** (MVP: embedded, no server dependencies)
- **PostgreSQL 13+** (hardening: production deployment)
- ORM: **SQLAlchemy 2.x** (abstracts database differences)

**Web Framework (if needed for APIs):**
- **FastAPI** (async Python web framework)
- Used only if REST API interface required for external integrations
- MVP: CLI-only, no web API required

**Testing Framework:**
- **pytest** (unit, integration, system tests)
- Coverage target: ≥90% line coverage for GREEN zone, ≥70% for AMBER zone

**Logging:**
- **Structured logging to stdout** (JSON format)
- Library: Python `logging` module with `json` formatter
- No third-party logging services in MVP (hardening: Control Tower integration)

**Package Management:**
- **pyproject.toml** (PEP 518/621 standard)
- Dependency specification: pinned versions with `>=X.Y,<X+1.0` ranges
- Build tool: `pip` (no Poetry/Pipenv required for MVP)

**Virtual Environment:**
- **venv** (Python standard library, no `virtualenv`/`conda`)
- Activated in `start.sh` script automatically

### Prohibited Technologies (MVP)

- ❌ **Node.js / JavaScript** — Python-only for backend logic (frontend deferred to hardening)
- ❌ **Docker/Kubernetes** — Local execution in MVP, containerization deferred
- ❌ **Apache Spark / Dask** — No distributed computing for MVP scale (50-100 customers)
- ❌ **Redis / RabbitMQ** — No external message brokers (in-memory queues sufficient)
- ❌ **React / Vue / Angular** — No web UI in MVP (CLI only)

### Example `pyproject.toml` (MVP)

```toml
[project]
name = "customer-analysis"
version = "0.1.0"
description = "DG-CC Customer Analysis System MVP"
requires-python = ">=3.11"
dependencies = [
    "anthropic>=0.40.0,<1.0",
    "sqlalchemy>=2.0,<3.0",
    "pydantic>=2.0,<3.0",
    "python-dotenv>=1.0,<2.0",
    "click>=8.1,<9.0",  # CLI framework
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0,<9.0",
    "pytest-cov>=4.1,<5.0",
    "pytest-asyncio>=0.23,<1.0",
    "ruff>=0.1,<1.0",  # Linter/formatter
]

[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.build_meta"

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
python_functions = "test_*"
addopts = "--cov=customer_analysis --cov-report=term-missing"

[tool.ruff]
line-length = 100
target-version = "py311"
```

---

## C-004: Deployment Model (MVP)

### Constraint Statement
MVP deploys as single-user CLI application executed locally on analyst workstation or shared server. No multi-user concurrency, no web server, no distributed deployment.

### Rationale
- Simplest deployment model for functional validation
- Reduces infrastructure dependencies (no Kubernetes, load balancers, API gateways)
- File-based HITL queues support async collaboration without concurrent execution

### Technical Requirements

**TR-004.1: Execution Environment**
- Python 3.11+ installed on target machine (Windows 10+, macOS 12+, or Linux)
- No root/admin privileges required for execution
- Data storage: Local filesystem (`output/` directory relative to project root)

**TR-004.2: Start/Stop Scripts**
- `start.sh` (macOS/Linux) and `start.bat` (Windows) launch application
- Scripts check prerequisites (Python version, dependencies) before starting
- Graceful shutdown on Ctrl+C (cleanup temp files, flush logs)

**TR-004.3: Single-Cycle Execution**
- One analysis cycle executes at a time (no concurrent cycles)
- Cycle state persisted to filesystem (`output/state/{cycle_id}.json`)
- Multiple users can work on different cycles sequentially (file locking not required for MVP)

**TR-004.4: HITL Review Queue Access**
- Analysts and Section Head access review queues via shared filesystem
- Review queue files: `output/review_queues/analyst/*.csv` and `output/review_queues/section_head/*.json`
- Coordination: Informal (analysts communicate which items they are reviewing)

**TR-004.5: No External Service Dependencies**
- No database server (SQLite embedded)
- No message broker (in-memory queues)
- No web server (CLI only)
- External API calls: Anthropic API only (for LLM inference)

### Hardening Phase Deployment Evolution

**Hardening Target: Multi-User Web Application**
- FastAPI REST API server (deployed on DG-CC application server)
- PostgreSQL database (DG-CC shared database cluster)
- BPMS UI integration (web portal for HITL review queues)
- OAuth 2.0 authentication (DG-CC identity provider)
- Horizontal scaling: Multiple API instances behind load balancer

---

## C-005: Development Standards

### Constraint Statement
All code must meet minimum quality standards for readability, testability, and maintainability. Code that does not meet standards cannot be merged or deployed.

### Standards

**S-005.1: Code Style (Ruff)**
- Python code formatted with `ruff format` (Black-compatible)
- Linting: `ruff check` must pass with zero errors
- Line length: 100 characters
- Import sorting: `ruff` automatic import organization

**S-005.2: Type Annotations**
- All function signatures MUST have type annotations (arguments and return type)
- Use `typing` module types: `List`, `Dict`, `Optional`, `Union`, etc.
- Pydantic models for data validation and serialization

**Example:**
```python
from typing import List, Optional
from datetime import date

def calculate_coverage_percentage(
    customers_in_scope: List[str],
    customers_with_reports: List[str]
) -> float:
    """Calculate customer coverage percentage."""
    if not customers_in_scope:
        return 0.0
    return (len(customers_with_reports) / len(customers_in_scope)) * 100.0
```

**S-005.3: Docstrings**
- All public functions, classes, and modules MUST have docstrings
- Format: Google-style docstrings (compatible with Sphinx)
- Include: description, arguments, return value, exceptions raised

**Example:**
```python
def fetch_service_reports(
    customer_ids: List[str], 
    period_start: date, 
    period_end: date
) -> List[ServiceReport]:
    """
    Fetch service reports for specified customers and period.
    
    Args:
        customer_ids: List of customer IDs to fetch reports for
        period_start: Start date of reporting period (inclusive)
        period_end: End date of reporting period (inclusive)
    
    Returns:
        List of ServiceReport objects matching criteria
    
    Raises:
        CRMConnectionError: If CRM API is unavailable
        DataValidationError: If fetched data fails schema validation
    """
    ...
```

**S-005.4: Testing Requirements**
- Unit tests: All GREEN zone functions (100% coverage target)
- Unit tests: AMBER zone functions (≥70% coverage target, focus on prompt logic)
- Integration tests: Multi-agent workflows (all workflow paths covered)
- Test naming: `test_<function_name>_<scenario>` (e.g., `test_coverage_gate_passes_when_coverage_sufficient`)

**S-005.5: Error Handling**
- No bare `except:` clauses (must specify exception types)
- Custom exception types for domain errors (e.g., `CoverageGateError`, `CitationViolationError`)
- Error messages MUST be actionable (include context, suggest resolution)

**Bad:**
```python
try:
    result = process_data(data)
except:  # ❌ Bare except
    print("Error")  # ❌ Non-actionable message
```

**Good:**
```python
try:
    result = process_data(data)
except DataValidationError as e:  # ✅ Specific exception
    raise CoverageGateError(
        f"Data validation failed: {e}. "
        f"Check input data at {data.source_path} for schema compliance."
    ) from e  # ✅ Actionable message with context
```

**S-005.6: Configuration Management**
- No hardcoded credentials, API keys, or environment-specific values in code
- Use `.env` file for local configuration (loaded via `python-dotenv`)
- Use environment variables for deployment configuration

**Example `.env`:**
```env
# Customer Analysis System Configuration
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=sqlite:///./customer_analysis.db
TOOL_MODE=fixture
LOG_LEVEL=INFO
```

**S-005.7: Git Commit Messages**
- Format: `<type>(<scope>): <description>` (Conventional Commits)
- Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`
- Example: `feat(agn2): add profitability tier calculation with DPS4 framework`

---

## C-006: Constraints Summary Matrix

| Constraint | Category | MVP Enforcement | Hardening Evolution |
|------------|----------|-----------------|---------------------|
| **C-001** | Deterministic Backbone | Unit tests (100% GREEN zone) | Determinism test suite (full cycle) |
| **C-002** | Promotability | Dependency injection, tool interfaces | Real API swap, integration tests |
| **C-003** | Technology Stack | Python 3.11+, SQLite, Anthropic SDK | PostgreSQL, FastAPI, BPMS UI |
| **C-004** | Deployment Model | Local CLI, single-user | Multi-user web app, load balancer |
| **C-005** | Development Standards | Ruff linting, type annotations, pytest | CI/CD pipeline, automated quality gates |

---

## Conformance Validation

**Pre-Merge Checklist:**
- [ ] All GREEN zone functions pass determinism tests
- [ ] Tool interfaces use dependency injection (no hardcoded implementations)
- [ ] Python 3.11+ type annotations on all public functions
- [ ] Ruff linting passes with zero errors
- [ ] Test coverage ≥90% for GREEN zone, ≥70% for AMBER zone
- [ ] No hardcoded credentials or environment-specific values
- [ ] Docstrings present on all public APIs

**Conformance Gate Failure:**
- Code that fails conformance checklist cannot be merged
- Technical debt for non-critical violations must be tracked in issue tracker

---

## References

- **Agent Architecture:** `payload/air/agent-architecture.md` (GREEN zone assignments)
- **MCP Tools:** `payload/air/mcp-tools.md` (tool interface contracts and swap boundaries)
- **Autonomy Zones:** `payload/air/autonomy-zones.md` (zone enforcement requirements)
- **Risk Register:** `payload/requirements/risk-register.md` (RSK-TECH risks and mitigations)
- **Organizational Brief:** Enhancement Build Phase Brief: Customer Analysis System

---

**Version:** 1.0.0  
**Last Updated:** 2026-11-12  
**Status:** Binding for MVP implementation
