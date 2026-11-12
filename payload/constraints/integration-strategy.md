# Integration Strategy — Customer Analysis System

This document defines the strategy for integrating with external systems (CRM, BPMS, survey module), including mocking approach for MVP, swap boundaries for hardening, and interface contracts.

## Integration Philosophy

**MVP Principle:** Mock all external systems with fixture backends to validate workflow logic without external dependencies.

**Hardening Principle:** Swap fixture backends for real API integrations without changing core agent logic.

**Rationale:**
- Reduces MVP delivery risk (no dependency on external system availability or API stability)
- Enables fast iteration and testing (fixture data fully controlled)
- Validates workflow and business logic before investing in integration complexity
- Preserves promotability (fixture-to-real swap is architectural requirement, not technical debt)

---

## External Systems Inventory

### System 1: CRM (Customer Relationship Management)

**Owner:** DG-CC IT Operations  
**Purpose:** Customer master data, service interaction history, profitability metrics  
**Integration Points:**
- Service reports (interaction history, service costs, revenue)
- Customer classification data (account status, account manager, region)
- Classification framework (DPS4: profitability tier definitions and benchmarks)

**MVP Mock:** TOL1 (fetch_service_reports), TOL2 (fetch_classification_framework), TOL3 (fetch_cost_revenue_data)  
**Hardening Swap:** REST API with OAuth 2.0 service account

---

### System 2: BPMS (Business Process Management System)

**Owner:** DG-CC Process Management Office  
**Purpose:** Workflow orchestration, state persistence, routing decisions, audit trail  
**Integration Points:**
- Workflow state machine (cycle state: PENDING, EXTRACTION, ..., LOCKED)
- Routing decisions (gate outcomes, analyst assignments, Section Head queue)
- Audit trail (state transitions, gate decisions, HITL review actions)
- Report lifecycle management (draft, approved, locked status)

**MVP Mock:** TOL6 (fetch_report_lifecycle_state), TOL7 (fetch_bpms_workflow_state), TOL8 (write_bpms_routing_decision)  
**Hardening Swap:** REST API with OAuth 2.0 service account + event-driven webhooks

---

### System 3: Survey Module

**Owner:** Customer Engagement Team  
**Purpose:** Customer satisfaction surveys, sentiment data, feedback text  
**Integration Points:**
- Survey responses (satisfaction scores, feedback text, survey metadata)
- Survey metadata (response rates, survey delivery timestamps)

**MVP Mock:** TOL4 (fetch_survey_responses)  
**Hardening Swap:** REST API with OAuth 2.0 service account

---

## Mock-All MVP Strategy

### Fixture Backend Architecture

**Design Pattern: Dependency Injection + Interface Abstraction**

```python
# Tool interface (abstract contract)
from typing import Protocol, List
from datetime import date

class ServiceReportTool(Protocol):
    """Abstract interface for service report retrieval."""
    def fetch_service_reports(
        self, 
        customer_ids: List[str], 
        period_start: date, 
        period_end: date
    ) -> List[ServiceReport]:
        """Fetch service reports for customers in specified period."""
        ...

# Fixture implementation (MVP)
class FixtureServiceReportTool:
    """Mock implementation using JSON fixture files."""
    def __init__(self, fixture_path: str = "fixtures/service_reports.json"):
        self.fixture_data = self._load_fixtures(fixture_path)
    
    def _load_fixtures(self, path: str) -> List[ServiceReport]:
        with open(path) as f:
            data = json.load(f)
        return [ServiceReport(**item) for item in data]
    
    def fetch_service_reports(
        self, 
        customer_ids: List[str], 
        period_start: date, 
        period_end: date
    ) -> List[ServiceReport]:
        """Filter fixture data by customer IDs and date range."""
        return [
            report for report in self.fixture_data
            if report.customer_id in customer_ids
            and period_start <= report.report_date <= period_end
        ]

# Real API implementation (hardening)
class RealServiceReportTool:
    """Production implementation using CRM REST API."""
    def __init__(self, api_base_url: str, oauth_client: OAuthClient):
        self.api_base_url = api_base_url
        self.oauth_client = oauth_client
    
    def fetch_service_reports(
        self, 
        customer_ids: List[str], 
        period_start: date, 
        period_end: date
    ) -> List[ServiceReport]:
        """Call CRM API with OAuth 2.0 authentication."""
        token = self.oauth_client.get_access_token()
        headers = {"Authorization": f"Bearer {token}"}
        params = {
            "customer_ids": ",".join(customer_ids),
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat()
        }
        response = requests.get(
            f"{self.api_base_url}/service-reports",
            headers=headers,
            params=params,
            timeout=30
        )
        response.raise_for_status()
        return [ServiceReport(**item) for item in response.json()["data"]]

# Dependency injection (configuration-driven)
def create_service_report_tool() -> ServiceReportTool:
    """Factory function for tool instantiation."""
    tool_mode = os.getenv("TOOL_MODE", "fixture")
    
    if tool_mode == "fixture":
        return FixtureServiceReportTool()
    elif tool_mode == "real":
        api_base_url = os.getenv("CRM_API_BASE_URL")
        oauth_client = OAuthClient(
            client_id=os.getenv("CRM_CLIENT_ID"),
            client_secret=os.getenv("CRM_CLIENT_SECRET"),
            token_url=os.getenv("CRM_TOKEN_URL")
        )
        return RealServiceReportTool(api_base_url, oauth_client)
    else:
        raise ValueError(f"Unknown TOOL_MODE: {tool_mode}")

# Agent receives tool via dependency injection
class AGN1_ReportExtraction:
    def __init__(self, service_report_tool: ServiceReportTool):
        self.tool = service_report_tool  # Works with fixture or real
    
    def extract_reports(self, customer_ids: List[str], cycle_period: CyclePeriod):
        return self.tool.fetch_service_reports(
            customer_ids, 
            cycle_period.start, 
            cycle_period.end
        )
```

### Fixture Data Seeding

**Seeding Strategy:**
1. Generate synthetic data with realistic distributions
2. Store in JSON files under `fixtures/` directory
3. Version control fixtures (ensure reproducibility)
4. Seed database with fixture data on first run (idempotent seeding)

**Fixture Files:**
```
fixtures/
├── classification_framework_dps4.json    # TOL2 fixture
├── service_reports.json                  # TOL1 fixture
├── cost_revenue_data.json                # TOL3 fixture
├── survey_responses.json                 # TOL4 fixture
├── segmentation_data.json                # TOL5 fixture (pre-calculated)
├── report_lifecycle_states.json          # TOL6 fixture
├── bpms_workflow_states.json             # TOL7 fixture
└── bpms_routing_log.json                 # TOL8 fixture (write target)
```

**Fixture Generation Script:**
```bash
python -m customer_analysis.fixtures.generate \
    --customers=75 \
    --reports=750 \
    --surveys=300 \
    --framework=DPS4 \
    --output-dir=fixtures/
```

---

## Swap Boundaries

### Swap Boundary 1: CRM Service Reports (TOL1)

**Fixture Interface:**
```python
def fetch_service_reports(
    customer_ids: List[str], 
    period_start: date, 
    period_end: date
) -> List[ServiceReport]
```

**Fixture Implementation:**
- Reads `fixtures/service_reports.json`
- Filters by `customer_id` (exact match in list)
- Filters by `report_date` (within period_start and period_end inclusive)
- Returns `List[ServiceReport]` matching schema

**Real API Contract:**
- **Endpoint:** `GET /api/v1/service-reports`
- **Authentication:** OAuth 2.0 Bearer token
- **Query Parameters:**
  - `customer_ids`: Comma-separated list of customer IDs
  - `period_start`: ISO 8601 date (e.g., `2024-11-01`)
  - `period_end`: ISO 8601 date (e.g., `2024-11-30`)
- **Response:** JSON array of service report objects
- **Schema:** Same as `ServiceReport` dataclass (see `data-contracts.md`)
- **Error Handling:**
  - 401 Unauthorized → retry with token refresh
  - 429 Too Many Requests → exponential backoff
  - 500 Internal Server Error → retry up to 3 times, then fail

**Swap Checklist:**
- [ ] CRM API endpoint URL configured in environment (`CRM_API_BASE_URL`)
- [ ] OAuth 2.0 client credentials configured (`CRM_CLIENT_ID`, `CRM_CLIENT_SECRET`, `CRM_TOKEN_URL`)
- [ ] Response schema validation (assert structure matches `ServiceReport`)
- [ ] Error handling and retry logic implemented
- [ ] Integration test against CRM staging environment passes

---

### Swap Boundary 2: Classification Framework (TOL2)

**Fixture Interface:**
```python
def fetch_classification_framework(
    framework_id: str = "DPS4"
) -> ClassificationFramework
```

**Fixture Implementation:**
- Reads `fixtures/classification_framework_dps4.json`
- Returns `ClassificationFramework` object with profitability tier definitions, benchmarks

**Real API Contract:**
- **Endpoint:** `GET /api/v1/classification-frameworks/{framework_id}`
- **Authentication:** OAuth 2.0 Bearer token
- **Path Parameters:**
  - `framework_id`: Framework identifier (e.g., `DPS4`)
- **Response:** JSON object with classification framework schema
- **Schema:** Same as fixture JSON structure (see `data-contracts.md`)
- **Caching:** Framework data changes infrequently (quarterly); cache for 24 hours

**Swap Checklist:**
- [ ] CRM API endpoint configured
- [ ] OAuth 2.0 credentials configured
- [ ] Response caching layer implemented (24-hour TTL)
- [ ] Fallback to cached framework if API unavailable

---

### Swap Boundary 3: BPMS Workflow State (TOL7)

**Fixture Interface:**
```python
def fetch_bpms_workflow_state(
    cycle_id: str
) -> WorkflowState
```

**Fixture Implementation:**
- Reads `fixtures/bpms_workflow_states.json`
- Returns `WorkflowState` object for specified cycle_id
- If cycle_id not found, returns default `WorkflowState(state="PENDING", ...)`

**Real API Contract:**
- **Endpoint:** `GET /api/v1/workflows/customer-analysis/{cycle_id}`
- **Authentication:** OAuth 2.0 Bearer token
- **Path Parameters:**
  - `cycle_id`: Analysis cycle identifier (e.g., `2024-11-cycle`)
- **Response:** JSON object with workflow state schema
- **Schema:** `{ "cycle_id": str, "state": str, "zone": str, "updated_at": datetime, "updated_by": str }`

**Swap Checklist:**
- [ ] BPMS API endpoint configured
- [ ] OAuth 2.0 credentials configured
- [ ] Workflow state polling logic implemented (no webhook support in MVP)

---

### Swap Boundary 4: BPMS Routing Decisions (TOL8)

**Fixture Interface:**
```python
def write_bpms_routing_decision(
    cycle_id: str,
    decision: RoutingAction,
    details: dict
) -> None
```

**Fixture Implementation:**
- Appends routing decision to `fixtures/bpms_routing_log.json`
- No validation (accepts all writes)

**Real API Contract:**
- **Endpoint:** `POST /api/v1/workflows/customer-analysis/{cycle_id}/route`
- **Authentication:** OAuth 2.0 Bearer token
- **Request Body:** JSON object with routing decision schema
  ```json
  {
    "decision": "route_to_analyst",
    "details": {
      "gate_id": "G1",
      "coverage_pct": 92.5,
      "violation_type": "coverage_insufficient"
    },
    "timestamp": "2024-11-28T10:30:00Z",
    "actor": "AGN7"
  }
  ```
- **Response:** 201 Created on success
- **Error Handling:**
  - 400 Bad Request → validation error (log and raise)
  - 409 Conflict → duplicate routing decision (idempotent, ignore)

**Swap Checklist:**
- [ ] BPMS API endpoint configured
- [ ] OAuth 2.0 credentials configured
- [ ] Idempotency handling (retry-safe)
- [ ] Audit trail logging on write failures

---

## OAuth 2.0 Service Account Pattern

### Authentication Flow

**Grant Type:** Client Credentials (service-to-service, no user interaction)

**Token Request:**
```http
POST /oauth/token HTTP/1.1
Host: identity.dgcc.ae
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&
client_id={CRM_CLIENT_ID}&
client_secret={CRM_CLIENT_SECRET}&
scope=crm.read crm.write
```

**Token Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "crm.read crm.write"
}
```

**Token Usage:**
```http
GET /api/v1/service-reports HTTP/1.1
Host: crm.dgcc.ae
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Lifecycle Management

**Token Caching:**
- Cache access token in memory (do not persist to disk)
- Refresh token proactively before expiration (at 90% of `expires_in`)
- Thread-safe token cache (multiple agents may request tokens concurrently)

**Token Refresh Strategy:**
```python
class OAuthClient:
    def __init__(self, client_id: str, client_secret: str, token_url: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.token_url = token_url
        self._token_cache: Optional[dict] = None
        self._token_lock = threading.Lock()
    
    def get_access_token(self) -> str:
        """Get valid access token (refresh if expired)."""
        with self._token_lock:
            if self._token_cache is None or self._is_token_expired():
                self._token_cache = self._request_new_token()
            return self._token_cache["access_token"]
    
    def _is_token_expired(self) -> bool:
        """Check if cached token is expired or near expiration."""
        if self._token_cache is None:
            return True
        issued_at = self._token_cache["issued_at"]
        expires_in = self._token_cache["expires_in"]
        elapsed = time.time() - issued_at
        # Refresh at 90% of expiration time
        return elapsed >= (expires_in * 0.9)
    
    def _request_new_token(self) -> dict:
        """Request new access token from OAuth server."""
        response = requests.post(
            self.token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "scope": "crm.read crm.write"
            },
            timeout=10
        )
        response.raise_for_status()
        token_data = response.json()
        token_data["issued_at"] = time.time()
        return token_data
```

---

## Error Handling Strategy

### Retry Logic

**Retryable Errors:**
- 429 Too Many Requests → exponential backoff (1s, 2s, 4s, 8s)
- 500 Internal Server Error → retry up to 3 times with 5s delay
- 502 Bad Gateway / 503 Service Unavailable → retry up to 3 times
- Network timeout / connection errors → retry up to 3 times

**Non-Retryable Errors:**
- 400 Bad Request → validation error, log and raise (do not retry)
- 401 Unauthorized → token refresh, retry once
- 403 Forbidden → access denied, log and raise (do not retry)
- 404 Not Found → resource does not exist, log and raise

**Retry Implementation:**
```python
import time
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

def create_http_client_with_retry() -> requests.Session:
    """Create HTTP client with automatic retry logic."""
    session = requests.Session()
    
    # Retry strategy
    retry_strategy = Retry(
        total=3,  # Maximum 3 retries
        backoff_factor=1,  # Exponential backoff: 1s, 2s, 4s
        status_forcelist=[429, 500, 502, 503],  # Retryable status codes
        allowed_methods=["GET", "POST", "PUT"]  # Retry safe methods only
    )
    
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    return session
```

### Fallback Strategy

**CRM Unavailable:**
- Log error with alert priority
- Return empty result set (graceful degradation)
- Coverage gate will fail (analyst review required)

**BPMS Unavailable:**
- Log error with alert priority
- Persist workflow state locally to `output/state/{cycle_id}.json`
- Sync with BPMS when service recovers (reconciliation logic)

**Survey Module Unavailable:**
- Log warning (not critical for cycle progression)
- AGN4 (Satisfaction Analysis) notes "survey data unavailable" in report
- Proceed with analysis based on available data

---

## Integration Testing Strategy

### Fixture-Mode Testing (MVP)

**Unit Tests:**
- Test each agent (AGN1-AGN7) with fixture tools in isolation
- Validate outputs match expected schema
- Coverage: 100% of agent functions

**Integration Tests:**
- Test multi-agent workflows end-to-end with fixture tools
- Validate workflow state transitions and gate enforcement
- Coverage: All workflow paths (nominal, exceptions, rework loops)

### Real-API-Mode Testing (Hardening)

**Integration Tests (Staging Environment):**
- Swap tools to real API implementations
- Execute full cycle with real data (non-production customers)
- Compare outputs to fixture-mode baseline (semantic equivalence)

**Contract Tests:**
- Validate real API responses match fixture data schemas
- Use OpenAPI/Swagger specs for automated contract validation

**Load Tests:**
- Test concurrent API calls (OAuth token refresh, rate limiting)
- Validate error handling under API failures (503 injection)

---

## Promotion Checklist: Fixture → Real

### Pre-Swap Validation

- [ ] All agents pass fixture-mode tests (unit + integration)
- [ ] Fixture data schemas match real API contract (OpenAPI spec validated)
- [ ] OAuth 2.0 credentials provisioned and tested (staging environment)
- [ ] Real API staging environment accessible and stable

### Swap Execution

- [ ] Update `.env` configuration: `TOOL_MODE=real`
- [ ] Configure API base URLs for CRM, BPMS, survey module
- [ ] Configure OAuth 2.0 credentials (client ID, secret, token URL)
- [ ] Run smoke test: single cycle execution in real-API mode
- [ ] Compare outputs to fixture-mode baseline (validate semantic equivalence)

### Post-Swap Validation

- [ ] Integration tests pass in real-API mode
- [ ] Error handling validated (token expiration, API failures, rate limiting)
- [ ] Audit trail completeness verified (all API calls logged)
- [ ] Performance acceptable (cycle execution time < 30 minutes)

### Rollback Plan

- [ ] Revert `.env` to `TOOL_MODE=fixture`
- [ ] Investigate swap failure (API compatibility, authentication, schema mismatches)
- [ ] Fix issues in staging environment before retry

---

## References

- **MCP Tools:** `payload/air/mcp-tools.md` (detailed tool interface specifications)
- **Agent Architecture:** `payload/air/agent-architecture.md` (agent tool dependencies)
- **Data Contracts:** `payload/air/data-contracts.md` (entity schemas for API payloads)
- **Technical Constraints:** `payload/constraints/technical-constraints.md` (promotability architecture)
- **Risk Register:** `payload/requirements/risk-register.md` (RSK-TECH-002: Fixture backend limitations)

---

**Version:** 1.0.0  
**Last Updated:** 2026-11-12  
**Status:** Binding for MVP implementation and hardening swap
