# Data Contracts — Customer Analysis System

This document defines entity schemas, enumerations, fixture data contracts, and Arabic field specifications for the Customer Analysis System. These contracts are binding for code generation and validation.

## Core Enumerations

### Zone (Autonomy Zone Classification)

```python
from enum import Enum

class Zone(str, Enum):
    """
    Autonomy zone classification for operations and agents.
    Determines trust level and review requirements.
    """
    GREEN = "green"    # Deterministic, autonomous, no review required
    AMBER = "amber"    # AI-assisted, requires HITL review gates
    RED = "red"        # Human decision authority only, no automation
```

**Usage:** Assigned to agents (AGN1-AGN7) and workflow states to enforce zone contracts.

---

### ProfitabilityTier (Classification Framework)

```python
class ProfitabilityTier(str, Enum):
    """
    Customer profitability classification from DPS4 framework.
    Arabic: مستوى الربحية
    """
    HIGH = "high"                # مرتفع
    MEDIUM = "medium"            # متوسط
    LOW = "low"                  # منخفض
    NEGATIVE = "negative"        # سلبي (cost > revenue)
```

**Source:** Classification framework DPS4 (fixture TOL2)  
**Usage:** Customer segmentation, profitability analysis  
**Arabic Labels:**
- `high`: مرتفع الربحية
- `medium`: متوسط الربحية
- `low`: منخفض الربحية
- `negative`: ربحية سلبية

---

### EngagementLevel (Service Interaction Frequency)

```python
class EngagementLevel(str, Enum):
    """
    Customer engagement level based on service interaction frequency.
    Arabic: مستوى التفاعل
    """
    HIGH = "high"                # مرتفع (≥5 interactions/month)
    MEDIUM = "medium"            # متوسط (2-4 interactions/month)
    LOW = "low"                  # منخفض (0-1 interactions/month)
    DORMANT = "dormant"          # خامل (no interactions for 3+ months)
```

**Source:** Behavioral analysis (AGN3) from service report history  
**Thresholds:**
- High: ≥5 service interactions per month
- Medium: 2-4 interactions per month
- Low: 0-1 interactions per month
- Dormant: No interactions for 3+ consecutive months

**Arabic Labels:**
- `high`: مرتفع التفاعل
- `medium`: متوسط التفاعل
- `low`: منخفض التفاعل
- `dormant`: عميل خامل

---

### SatisfactionScore (Survey Rating)

```python
from enum import IntEnum

class SatisfactionScore(IntEnum):
    """
    Customer satisfaction rating from survey responses.
    Arabic: تقييم الرضا
    1-5 scale (1=very dissatisfied, 5=very satisfied)
    """
    VERY_DISSATISFIED = 1   # غير راضٍ تماماً
    DISSATISFIED = 2        # غير راضٍ
    NEUTRAL = 3             # محايد
    SATISFIED = 4           # راضٍ
    VERY_SATISFIED = 5      # راضٍ تماماً
```

**Source:** Survey module mock (TOL4)  
**Survey Question (Arabic):** ما مدى رضاك عن الخدمة المقدمة؟  
**English Translation:** How satisfied are you with the service provided?

**Aggregation:**
- Average score calculation: `sum(scores) / len(scores)`
- Satisfaction rate: `count(score >= 4) / total_responses * 100`

---

### SentimentPolarity (Text Sentiment Analysis)

```python
class SentimentPolarity(str, Enum):
    """
    Sentiment polarity classification for free-text feedback.
    Arabic: القطبية العاطفية
    """
    POSITIVE = "positive"        # إيجابي
    NEUTRAL = "neutral"          # محايد
    NEGATIVE = "negative"        # سلبي
    MIXED = "mixed"              # مختلط
```

**Source:** AGN4 (Satisfaction Analysis) NLP analysis of Arabic survey comments  
**Usage:** Sentiment trends, satisfaction driver identification

**Arabic Labels:**
- `positive`: تعليق إيجابي
- `neutral`: تعليق محايد
- `negative`: تعليق سلبي
- `mixed`: تعليق مختلط المشاعر

---

### RoutingAction (BPMS Workflow Routing)

```python
class RoutingAction(str, Enum):
    """
    BPMS routing decisions for workflow state transitions.
    Arabic: إجراء التوجيه
    """
    PROCEED = "proceed"                      # متابعة
    ROUTE_TO_ANALYST = "route_to_analyst"    # توجيه للمحلل
    ROUTE_TO_SECTION_HEAD = "route_to_section_head"  # توجيه لرئيس القسم
    RETURN_FOR_REWORK = "return_for_rework"  # إعادة للمراجعة
    REJECT = "reject"                        # رفض
    ESCALATE = "escalate"                    # تصعيد
```

**Source:** AGN7 (Deterministic Rule Engine) and BPMS mock (TOL7/TOL8)  
**Usage:** Workflow state machine transitions, gate enforcement

---

### ReviewDecision (Analyst/Section Head Actions)

```python
class ReviewDecision(str, Enum):
    """
    Human reviewer decision options for HITL review gates.
    Arabic: قرار المراجعة
    """
    APPROVE = "approve"          # الموافقة
    MODIFY = "modify"            # التعديل
    REJECT = "reject"            # الرفض
```

**Usage:** HITL review queue actions  
**Actors:** Analyst (AMBER → GREEN gate), Section Head (RED zone gate)

**Arabic Labels:**
- `approve`: تمت الموافقة
- `modify`: تم التعديل
- `reject`: تم الرفض

---

### FeedbackType (Survey Response Classification)

```python
class FeedbackType(str, Enum):
    """
    Classification of customer feedback by topic.
    Arabic: نوع التعليق
    """
    SERVICE_QUALITY = "service_quality"      # جودة الخدمة
    RESPONSE_TIME = "response_time"          # وقت الاستجابة
    STAFF_BEHAVIOR = "staff_behavior"        # سلوك الموظفين
    PROBLEM_RESOLUTION = "problem_resolution" # حل المشكلات
    COMMUNICATION = "communication"          # التواصل
    OTHER = "other"                          # أخرى
```

**Source:** AGN4 (Satisfaction Analysis) topic extraction from Arabic survey comments  
**Usage:** Feedback categorization, satisfaction driver analysis

---

### ProcessCode (DG-CC Business Process Identifier)

```python
class ProcessCode(str, Enum):
    """
    DG-CC standardized business process codes.
    Arabic: رمز العملية
    """
    CUSTOMER_ANALYSIS = "DG-CH-01-03-01"     # تحليل العملاء
    REPORT_APPROVAL = "DG-CH-01-03-02"       # اعتماد التقارير
    DATA_EXTRACTION = "DG-CH-01-02-05"       # استخراج البيانات
```

**Source:** DG-CC SOP registry  
**Usage:** Audit trail, compliance logging, SOP traceability

---

## Entity Schemas

### Customer

```python
from dataclasses import dataclass
from typing import Optional
from datetime import date

@dataclass
class Customer:
    """
    Customer entity with classification and profile attributes.
    Arabic: العميل
    """
    customer_id: str                          # معرف العميل
    customer_name_ar: str                     # اسم العميل (بالعربية)
    customer_name_en: Optional[str]           # اسم العميل (بالإنجليزية)
    account_open_date: date                   # تاريخ فتح الحساب
    profitability_tier: ProfitabilityTier     # مستوى الربحية
    engagement_level: EngagementLevel         # مستوى التفاعل
    primary_contact_method: str               # طريقة الاتصال الأساسية (phone/email/portal)
    region: str                               # المنطقة (Abu Dhabi zones)
    account_manager_id: Optional[str]         # معرف مدير الحساب
    active: bool                              # نشط (true if account active)
    
    def __post_init__(self):
        """Validate customer data on initialization."""
        if not self.customer_id.startswith("C"):
            raise ValueError(f"Invalid customer_id format: {self.customer_id}")
        if len(self.customer_name_ar) == 0:
            raise ValueError("customer_name_ar is required")
```

**Fixture Requirements:**
- 50-100 synthetic customer records
- Mix of profitability tiers: 20% high, 40% medium, 30% low, 10% negative
- Mix of engagement levels: 25% high, 35% medium, 30% low, 10% dormant
- Arabic names generated from Abu Dhabi naming conventions
- PII masking: All names synthetic, no real customer data

---

### ServiceReport

```python
@dataclass
class ServiceReport:
    """
    Service interaction report from CRM system.
    Arabic: تقرير الخدمة
    """
    report_id: str                            # معرف التقرير
    customer_id: str                          # معرف العميل
    report_date: date                         # تاريخ التقرير
    interaction_channel: str                  # قناة التواصل (phone/email/portal/visit)
    service_type: str                         # نوع الخدمة
    issue_category: str                       # فئة المشكلة
    resolution_time_hours: float              # وقت الحل (ساعات)
    escalated: bool                           # مصعّد (true if escalated)
    satisfaction_recorded: bool               # رضا مسجل (true if survey completed)
    service_cost: float                       # تكلفة الخدمة (AED)
    revenue_generated: Optional[float]        # إيراد مُحقق (AED, if applicable)
    notes_ar: Optional[str]                   # ملاحظات (بالعربية)
    
    def __post_init__(self):
        """Validate service report data."""
        if not self.report_id.startswith("SR"):
            raise ValueError(f"Invalid report_id format: {self.report_id}")
        if self.resolution_time_hours < 0:
            raise ValueError("resolution_time_hours must be non-negative")
        if self.service_cost < 0:
            raise ValueError("service_cost must be non-negative")
```

**Fixture Requirements:**
- 500-1000 service reports across 50-100 customers (5-10 reports per customer)
- Date range: Current month and prior month
- Interaction channels: 50% phone, 30% email, 15% portal, 5% in-person visit
- Escalation rate: ~10% of reports flagged as escalated
- Cost/revenue: Service cost 50-500 AED, revenue 0-5000 AED (only for sales-related services)

---

### SurveyResponse

```python
@dataclass
class SurveyResponse:
    """
    Customer satisfaction survey response.
    Arabic: استجابة الاستبيان
    """
    response_id: str                          # معرف الاستجابة
    customer_id: str                          # معرف العميل
    service_report_id: str                    # معرف تقرير الخدمة
    survey_date: date                         # تاريخ الاستبيان
    satisfaction_score: SatisfactionScore     # تقييم الرضا (1-5)
    feedback_text_ar: Optional[str]           # التعليق (بالعربية)
    feedback_type: Optional[FeedbackType]     # نوع التعليق
    sentiment: Optional[SentimentPolarity]    # القطبية العاطفية
    
    def __post_init__(self):
        """Validate survey response data."""
        if not self.response_id.startswith("SV"):
            raise ValueError(f"Invalid response_id format: {self.response_id}")
        if self.feedback_text_ar and len(self.feedback_text_ar) > 1000:
            raise ValueError("feedback_text_ar exceeds maximum length (1000 chars)")
```

**Fixture Requirements:**
- 200-400 survey responses (40-80% response rate on service reports)
- Satisfaction score distribution: 5% score=1, 10% score=2, 20% score=3, 40% score=4, 25% score=5
- Arabic feedback text: 60% of responses include free-text comments
- Sentiment distribution: 50% positive, 30% neutral, 15% negative, 5% mixed

**Arabic Text Examples:**
```
# Positive (satisfaction_score=5)
"الخدمة ممتازة وسرعة الاستجابة رائعة. شكراً للفريق المحترف."
"تم حل المشكلة بسرعة وكفاءة. راضٍ تماماً عن الخدمة."

# Neutral (satisfaction_score=3)
"الخدمة مقبولة لكن وقت الانتظار طويل."
"تم حل المشكلة ولكن استغرق وقتاً أطول من المتوقع."

# Negative (satisfaction_score=1-2)
"وقت الاستجابة بطيء جداً. لم يتم حل المشكلة بشكل مرضي."
"التواصل مع الموظفين صعب والمشكلة لا تزال قائمة."
```

---

### SegmentProfile

```python
@dataclass
class SegmentProfile:
    """
    Customer segment classification result from AGN5.
    Arabic: ملف شريحة العملاء
    """
    segment_id: str                           # معرف الشريحة
    segment_name_ar: str                      # اسم الشريحة (بالعربية)
    segment_name_en: str                      # اسم الشريحة (بالإنجليزية)
    profitability_tier: ProfitabilityTier     # مستوى الربحية
    engagement_level: EngagementLevel         # مستوى التفاعل
    avg_satisfaction_score: float             # متوسط تقييم الرضا
    customer_count: int                       # عدد العملاء
    characteristics_ar: str                   # الخصائص (بالعربية)
    recommendations_ar: str                   # التوصيات (بالعربية)
    
    def __post_init__(self):
        """Validate segment profile data."""
        if not self.segment_id.startswith("SEG"):
            raise ValueError(f"Invalid segment_id format: {self.segment_id}")
        if not (1.0 <= self.avg_satisfaction_score <= 5.0):
            raise ValueError("avg_satisfaction_score must be between 1.0 and 5.0")
        if self.customer_count < 0:
            raise ValueError("customer_count must be non-negative")
```

**Example Segments (Arabic-first):**

1. **SEG-01:** مرتفع الربحية، مرتفع التفاعل
   - `profitability_tier`: HIGH
   - `engagement_level`: HIGH
   - Characteristics: عملاء ذوو قيمة عالية، تفاعل مستمر، رضا مرتفع
   - Recommendations: حافظ على مستوى الخدمة الحالي، قدم عروض حصرية

2. **SEG-02:** متوسط الربحية، منخفض التفاعل
   - `profitability_tier`: MEDIUM
   - `engagement_level`: LOW
   - Characteristics: عملاء محتملون للنمو، تفاعل محدود
   - Recommendations: حملات تواصل لزيادة التفاعل، عروض مخصصة

3. **SEG-03:** منخفض الربحية، خامل
   - `profitability_tier`: LOW
   - `engagement_level`: DORMANT
   - Characteristics: عملاء غير نشطين، ربحية منخفضة
   - Recommendations: مراجعة استمرارية الخدمة، تقليل التكاليف

---

### AnalysisReport

```python
from datetime import datetime

@dataclass
class AnalysisReport:
    """
    Complete customer analysis report for a cycle period.
    Arabic: تقرير تحليل العملاء
    """
    report_id: str                            # معرف التقرير
    cycle_id: str                             # معرف الدورة (e.g., "2024-11-cycle")
    report_title_ar: str                      # عنوان التقرير (بالعربية)
    report_title_en: str                      # عنوان التقرير (بالإنجليزية)
    analysis_period_start: date               # بداية فترة التحليل
    analysis_period_end: date                 # نهاية فترة التحليل
    workflow_state: str                       # حالة سير العمل
    zone: Zone                                # المنطقة (GREEN/AMBER/RED)
    
    # Quantitative metrics
    total_customers_analyzed: int             # إجمالي العملاء المحللين
    total_service_reports: int                # إجمالي تقارير الخدمة
    avg_satisfaction_score: float             # متوسط تقييم الرضا
    
    # Report sections (Arabic narrative)
    executive_summary_ar: str                 # الملخص التنفيذي
    quantitative_analysis_ar: str             # التحليل الكمي
    behavioral_insights_ar: str               # الرؤى السلوكية
    satisfaction_analysis_ar: str             # تحليل الرضا
    segmentation_results_ar: str              # نتائج التقسيم
    recommendations_ar: str                   # التوصيات
    
    # Metadata
    created_at: datetime                      # تاريخ الإنشاء
    created_by: str                           # المنشئ (AGN6)
    reviewed_by: Optional[str]                # المراجع (analyst_id)
    approved_by: Optional[str]                # المعتمد (section_head_id)
    locked: bool                              # مقفل (immutable if true)
    
    def __post_init__(self):
        """Validate report data."""
        if not self.report_id.startswith("RPT"):
            raise ValueError(f"Invalid report_id format: {self.report_id}")
        if self.analysis_period_end < self.analysis_period_start:
            raise ValueError("analysis_period_end must be after analysis_period_start")
        if self.locked and not self.approved_by:
            raise ValueError("Locked reports must have approved_by set")
```

---

## Classification Framework Structure (DPS4)

The classification framework (fetched via TOL2) provides profitability tier definitions and benchmarking thresholds.

**Fixture Schema (JSON):**

```json
{
  "framework_id": "DPS4",
  "framework_name_ar": "إطار تصنيف العملاء - الإصدار الرابع",
  "framework_name_en": "Customer Classification Framework - Version 4",
  "effective_date": "2024-01-01",
  "version": "4.0",
  "profitability_tiers": [
    {
      "tier": "high",
      "tier_name_ar": "مرتفع الربحية",
      "tier_name_en": "High Profitability",
      "revenue_threshold_min_aed": 50000,
      "cost_ratio_max": 0.30,
      "description_ar": "العملاء الذين يحققون إيرادات عالية بتكاليف خدمة منخفضة نسبياً"
    },
    {
      "tier": "medium",
      "tier_name_ar": "متوسط الربحية",
      "tier_name_en": "Medium Profitability",
      "revenue_threshold_min_aed": 10000,
      "cost_ratio_max": 0.60,
      "description_ar": "العملاء ذوو الإيرادات المتوسطة والتكاليف المعتدلة"
    },
    {
      "tier": "low",
      "tier_name_ar": "منخفض الربحية",
      "tier_name_en": "Low Profitability",
      "revenue_threshold_min_aed": 1000,
      "cost_ratio_max": 0.90,
      "description_ar": "العملاء ذوو الإيرادات المنخفضة أو التكاليف المرتفعة نسبياً"
    },
    {
      "tier": "negative",
      "tier_name_ar": "ربحية سلبية",
      "tier_name_en": "Negative Profitability",
      "revenue_threshold_min_aed": 0,
      "cost_ratio_max": null,
      "description_ar": "العملاء الذين تتجاوز تكاليف خدمتهم الإيرادات المحققة"
    }
  ],
  "benchmarks": {
    "avg_satisfaction_score_target": 4.2,
    "response_time_target_hours": 24,
    "escalation_rate_target_pct": 5.0
  }
}
```

**Usage:**
- AGN2 (Quantitative Analysis) maps customers to profitability tiers based on revenue/cost data
- AGN5 (Segmentation) uses tier definitions for multi-dimensional segmentation
- AGN6 (Report Authoring) includes benchmark comparisons in narrative report

---

## Arabic Field Conventions

### Naming Conventions

All entity fields with Arabic content use `_ar` suffix:
- `customer_name_ar`: اسم العميل
- `report_title_ar`: عنوان التقرير
- `feedback_text_ar`: نص التعليق
- `characteristics_ar`: الخصائص

Fields with English equivalents use `_en` suffix:
- `customer_name_en`: Customer Name
- `report_title_en`: Report Title

### Text Normalization

**Arabic Text Processing Rules:**
1. **Encoding:** UTF-8 (all files, database columns, API payloads)
2. **Normalization:** Unicode NFC (canonical composition)
3. **Right-to-Left Marking:** Preserve RTL direction markers in stored text
4. **Diacritics:** Optional; preserve if present in source data (e.g., survey responses)
5. **Numerals:** Use Arabic-Indic numerals (٠-٩) in Arabic narrative, Western numerals (0-9) in data fields

**Example Normalization Function:**
```python
import unicodedata

def normalize_arabic_text(text: str) -> str:
    """
    Normalize Arabic text for consistent storage and comparison.
    
    Args:
        text: Raw Arabic text (may have mixed normalization)
    
    Returns:
        NFC-normalized text with consistent whitespace
    """
    # Unicode NFC normalization
    normalized = unicodedata.normalize("NFC", text)
    
    # Collapse multiple whitespace to single space
    normalized = " ".join(normalized.split())
    
    # Preserve RTL marks
    return normalized.strip()
```

### Database Schema

All Arabic text fields use `NVARCHAR` (SQL Server) or `TEXT` with UTF-8 collation (PostgreSQL/SQLite):

**SQLite (MVP):**
```sql
CREATE TABLE customers (
    customer_id TEXT PRIMARY KEY,
    customer_name_ar TEXT NOT NULL COLLATE NOCASE,  -- UTF-8 by default
    customer_name_en TEXT,
    -- ...
);

CREATE TABLE survey_responses (
    response_id TEXT PRIMARY KEY,
    feedback_text_ar TEXT COLLATE NOCASE,
    -- ...
);
```

**PostgreSQL (Hardening):**
```sql
CREATE TABLE customers (
    customer_id TEXT PRIMARY KEY,
    customer_name_ar TEXT NOT NULL,
    customer_name_en TEXT,
    -- ...
) WITH (
    LOCALE = 'ar_AE.UTF-8'
);
```

### Report Field Arabic Examples

**Report Title:**
- Arabic: `تحليل عملاء نوفمبر ٢٠٢٤`
- English: `November 2024 Customer Analysis`

**Executive Summary (Arabic):**
```
خلال شهر نوفمبر ٢٠٢٤، تم تحليل ٤١٢ عميلاً بناءً على ٨٣٥ تقرير خدمة و٢٩٣ استجابة استبيان. 
بلغ متوسط تقييم الرضا ٤.١ من ٥.٠، وهو مؤشر إيجابي لجودة الخدمة المقدمة.

الشرائح الرئيسية المحددة:
- ٢٨٪ عملاء مرتفعو الربحية والتفاعل (شريحة الأولوية)
- ٤٢٪ عملاء متوسطو الربحية (فرصة للنمو)
- ٢٢٪ عملاء منخفضو التفاعل (يحتاجون لحملات تواصل)
- ٨٪ عملاء خاملون (مراجعة استمرارية الخدمة)

التوصيات الرئيسية:
١. تعزيز برامج الولاء لعملاء الشريحة الأولى
٢. حملات تواصل مخصصة للعملاء منخفضي التفاعل
٣. تحسين وقت الاستجابة للحد من التصعيد (الهدف: ٢٤ ساعة)
```

---

## PII Masking Contract

**MVP Scope (Fixture Data):**
- All customer names are synthetic (generated from Arabic name corpus)
- No real customer identifiers (account numbers, email addresses, phone numbers)
- Service report notes use generic placeholder text
- Survey feedback text is realistic but fictional

**Hardening Scope (Real Data Integration):**
- Customer names masked before LLM payloads: `[MASKED_NAME_{hash}]`
- Email addresses masked: `[MASKED_EMAIL_{hash}]`
- Phone numbers masked: `[MASKED_PHONE_{hash}]`
- Hash preserves entity identity across analysis cycle (consistent masking per customer)

**Masking Function:**
```python
import hashlib

def mask_pii_field(field_value: str, field_type: str) -> str:
    """
    Mask PII field for AI payload while preserving entity identity.
    
    Args:
        field_value: Original PII value
        field_type: Field type (name, email, phone)
    
    Returns:
        Masked placeholder with consistent hash
    """
    field_hash = hashlib.sha256(field_value.encode()).hexdigest()[:8]
    return f"[MASKED_{field_type.upper()}_{field_hash}]"

# Example usage
customer_name = "أحمد محمد السيد"
masked_name = mask_pii_field(customer_name, "name")
# Result: "[MASKED_NAME_a3f5c8d2]"
```

---

## Fixture Seeding Strategy

**Seed Data Generation Order:**
1. **Classification Framework (DPS4):** Single JSON fixture, loaded first
2. **Customers:** 50-100 records with profitability/engagement distribution
3. **Service Reports:** 500-1000 records linked to customers (current + prior month)
4. **Survey Responses:** 200-400 records linked to service reports (40-80% response rate)
5. **Segments:** 5-8 segment profiles pre-calculated from customer/report/survey data

**Seeding Script Location:** `customer-analysis/src/seed_data.py`

**Seeding Command:**
```bash
python -m customer_analysis.seed_data --framework=DPS4 --customers=75 --reports=750 --surveys=300
```

---

## References

- **Agent Architecture:** `payload/air/agent-architecture.md` (AGN1-AGN7 usage of data contracts)
- **MCP Tools:** `payload/air/mcp-tools.md` (TOL1-TOL8 data interfaces)
- **Workflow Gates:** `payload/air/workflow-gates.md` (Gate validation against data contracts)
- **Autonomy Zones:** `payload/air/autonomy-zones.md` (Zone enforcement using entity states)
- **Organizational Brief:** Enhancement Build Phase Brief: Customer Analysis System

---

**Version:** 1.0.0  
**Last Updated:** 2026-11-12  
**Status:** Binding for MVP implementation
