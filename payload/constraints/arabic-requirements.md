# Arabic Requirements — Customer Analysis System

This document defines Arabic-first language requirements, including encoding standards, text normalization, linguistic quality expectations, and reporting conventions for the Customer Analysis System.

## Arabic-First Principle

**Constraint:** Arabic is the primary language for all customer-facing outputs, formal reports, and official documentation. English is secondary and used only for technical implementation artifacts (code, logs, system documentation).

**Rationale:**
- DG-CC is an Abu Dhabi government entity; Arabic is the official language per UAE Federal Law
- All formal reports submitted to Section Head and stakeholders must be in Arabic
- Customer data (names, feedback text) is primarily in Arabic
- Linguistic quality in Arabic is a regulatory and cultural requirement, not optional

**Implications:**
- Report authoring (AGN6) generates Arabic narrative, not English
- Survey feedback analysis (AGN4) processes Arabic free-text responses
- Segmentation labels and recommendations (AGN5) are Arabic-first
- Section Head review queue and analyst instructions are in Arabic

---

## AR-001: Character Encoding

### Constraint Statement
All text storage, processing, and transmission MUST use UTF-8 encoding. No legacy encodings (CP1256, ISO-8859-6) are permitted in new system components.

### Rationale
- UTF-8 is universal standard for Unicode text
- Modern LLMs (Claude) expect UTF-8 inputs
- Interoperability with international systems (Anthropic API) requires UTF-8

### Technical Requirements

**TR-001.1: Database Storage**
- SQLite (MVP): Text columns default to UTF-8 (no explicit configuration required)
- PostgreSQL (hardening): Database created with `ENCODING='UTF8'` and `LC_COLLATE='ar_AE.UTF-8'`
- All `TEXT` columns store UTF-8 encoded Arabic text

**Example (PostgreSQL):**
```sql
CREATE DATABASE customer_analysis
    ENCODING='UTF8'
    LC_COLLATE='ar_AE.UTF-8'
    LC_CTYPE='ar_AE.UTF-8'
    TEMPLATE=template0;

CREATE TABLE customers (
    customer_id TEXT PRIMARY KEY,
    customer_name_ar TEXT NOT NULL,  -- UTF-8 Arabic text
    -- ...
);
```

**TR-001.2: File Storage**
- All JSON fixture files saved with UTF-8 encoding (no BOM)
- CSV files use UTF-8 with explicit encoding declaration: `# coding: utf-8`
- Report output files (markdown, JSON) saved with UTF-8 encoding

**TR-001.3: API Communication**
- HTTP requests to Anthropic API include `Content-Type: application/json; charset=utf-8`
- Response parsing assumes UTF-8 (Python `json.loads()` handles automatically)

**TR-001.4: Logging**
- Structured logs (JSON) written to stdout with UTF-8 encoding
- Arabic text in log messages preserved without escaping (human-readable logs)

### Validation Approach

**Encoding Test:**
```python
def test_arabic_text_encoding():
    """Validate UTF-8 encoding for Arabic text."""
    arabic_text = "تحليل عملاء نوفمبر ٢٠٢٤"
    
    # Encode to bytes and decode back
    encoded = arabic_text.encode('utf-8')
    decoded = encoded.decode('utf-8')
    
    # Must match original
    assert decoded == arabic_text
    
    # Store in database and retrieve
    customer = Customer(customer_id="C001", customer_name_ar=arabic_text)
    db.add(customer)
    db.commit()
    
    retrieved = db.query(Customer).filter_by(customer_id="C001").first()
    assert retrieved.customer_name_ar == arabic_text
```

---

## AR-002: Text Normalization

### Constraint Statement
All Arabic text inputs MUST be normalized using Unicode NFC (Canonical Composition) before storage or comparison. Normalization ensures consistent representation of Arabic characters across different input sources.

### Rationale
- Arabic text can be represented in multiple Unicode forms (NFD, NFC, NFKD, NFKC)
- Source systems (CRM, survey module) may produce differently normalized text
- Unnormalized text causes false mismatches in comparisons and searches
- LLMs expect consistently normalized inputs

### Normalization Rules

**Rule 1: Unicode NFC Normalization**
```python
import unicodedata

def normalize_arabic_text(text: str) -> str:
    """
    Normalize Arabic text for consistent storage and comparison.
    
    Args:
        text: Raw Arabic text (may have mixed normalization forms)
    
    Returns:
        NFC-normalized text with consistent whitespace
    """
    # Apply Unicode NFC normalization
    normalized = unicodedata.normalize("NFC", text)
    
    # Collapse multiple whitespace to single space
    normalized = " ".join(normalized.split())
    
    # Strip leading/trailing whitespace
    return normalized.strip()
```

**Rule 2: Whitespace Normalization**
- Collapse multiple consecutive spaces/tabs/newlines to single space
- Strip leading and trailing whitespace
- Preserve paragraph breaks in long-form text (report narratives)

**Rule 3: Diacritic Handling**
- **Preserve diacritics if present in input** (do not strip)
- Rationale: Diacritics may be meaningful (e.g., formal names, Quranic text)
- Search/comparison operations should be diacritic-insensitive (use collation)

**Rule 4: Numeral Handling**
- **Preserve numeral format from input** (Arabic-Indic ٠-٩ or Western 0-9)
- Report generation uses Western numerals in data fields (e.g., `customer_count=75`)
- Report narrative can use Arabic-Indic numerals for stylistic consistency (e.g., "تم تحليل ٧٥ عميلاً")

### Normalization Application Points

**Input Normalization:**
- AGN1 (Report Extraction): Normalize extracted customer names, service notes
- AGN4 (Satisfaction Analysis): Normalize survey feedback text before sentiment analysis
- HITL Review Queues: Normalize analyst comments and Section Head feedback

**Storage Normalization:**
- Database layer: Apply normalization before INSERT/UPDATE operations
- Use SQLAlchemy event listeners for automatic normalization

**Example (SQLAlchemy Event Listener):**
```python
from sqlalchemy import event
from sqlalchemy.orm import Session

@event.listens_for(Session, "before_flush")
def normalize_arabic_fields(session, flush_context, instances):
    """Normalize Arabic text fields before database write."""
    for instance in session.new.union(session.dirty):
        for attr_name, attr_value in instance.__dict__.items():
            if attr_name.endswith("_ar") and isinstance(attr_value, str):
                normalized_value = normalize_arabic_text(attr_value)
                setattr(instance, attr_name, normalized_value)
```

---

## AR-003: Linguistic Quality Standards

### Constraint Statement
Generated Arabic text MUST meet professional linguistic quality standards appropriate for formal government reporting. This includes correct grammar, appropriate register (formal Modern Standard Arabic), and domain-specific terminology.

### Rationale
- Section Head and stakeholders expect government-quality Arabic
- Poor linguistic quality undermines trust in system-generated insights
- Cultural expectation: formal Arabic for official documents

### Quality Dimensions

**Dimension 1: Grammar and Syntax**
- Correct verb conjugation (past, present, imperative)
- Proper noun-adjective agreement (gender, number, case)
- Accurate use of grammatical case markers (إعراب) where appropriate (formal registers)

**Dimension 2: Register (Formal Modern Standard Arabic)**
- Use **فصحى (fuṣḥā)** register, not colloquial dialectal Arabic (عامية)
- Appropriate for government correspondence and formal reports
- Avoid informal idioms, slang, or casual expressions

**Dimension 3: Terminology**
- Use standardized government terminology for domain concepts
- Example: "مستوى الربحية" (profitability tier), not informal alternatives
- Consistent terminology across reports (no synonym variation)

**Dimension 4: Readability**
- Sentence structure: Clear, concise sentences (avoid overly complex nested clauses)
- Paragraph structure: Topic sentence followed by supporting details
- Report sections: Logical flow (executive summary → detailed analysis → recommendations)

### LLM Prompt Engineering for Quality

**Prompt Template (AGN6 Report Authoring):**
```python
def generate_report_section_prompt(section_name: str, data: dict) -> str:
    """Generate prompt for Arabic report section authoring."""
    return f"""
أنت مساعد ذكي متخصص في إعداد التقارير الرسمية للجهات الحكومية في أبوظبي.

المهمة: اكتب قسم "{section_name}" من تقرير تحليل العملاء باللغة العربية الفصحى.

البيانات:
{json.dumps(data, ensure_ascii=False, indent=2)}

المتطلبات:
١. استخدم اللغة العربية الفصحى المناسبة للتقارير الحكومية الرسمية
٢. اذكر جميع المصادر باستخدام صيغة [REF: معرف_المصدر]
٣. اكتب فقرات واضحة ومختصرة (٣-٥ جمل لكل فقرة)
٤. استخدم المصطلحات الموحدة للمفاهيم التقنية
٥. تجنب التعميمات غير المدعومة بالبيانات

النبرة: رسمية، موضوعية، قائمة على الأدلة

الطول: {data.get('target_length', '٢٠٠-٣٠٠')} كلمة
"""
```

**Quality Validation (Human Review):**
- Analyst reviews generated Arabic for grammatical correctness
- Section Head assesses linguistic quality as part of final approval
- Subjective quality rating: 1-5 scale (target ≥4/5)

### Linguistic Quality Checklist

**Pre-Deployment Validation:**
- [ ] Native Arabic speaker reviews sample generated reports
- [ ] Grammar checking (manual or automated tool like Microsoft Word Arabic grammar checker)
- [ ] Terminology consistency validated against approved glossary
- [ ] Readability assessment (Flesch-Kincaid equivalent for Arabic, if available)

---

## AR-004: Reporting Conventions

### Constraint Statement
All reports follow standardized Arabic formatting conventions for government documents, including title formatting, section headers, numbering systems, and date formats.

### Report Structure

**Title Format:**
```
تقرير تحليل العملاء — [اسم الفترة]
إدارة خدمة العملاء — دائرة [اسم الدائرة]
حكومة أبوظبي
```

**Example:**
```
تقرير تحليل العملاء — نوفمبر ٢٠٢٤
إدارة خدمة العملاء — دائرة رعاية العملاء
حكومة أبوظبي
```

**Section Headers:**
- Use Arabic numbering (١، ٢، ٣) or bullets (•) for lists
- Section headers right-aligned (RTL direction)
- Consistent header hierarchy: H1 (الملخص التنفيذي) → H2 (نتائج التحليل الكمي) → H3 (توزيع مستويات الربحية)

**Date Format:**
- Arabic: `١ نوفمبر ٢٠٢٤` (day-month-year, Arabic-Indic numerals optional)
- ISO format for data fields: `2024-11-01`

**Numerical Data:**
- Use Western numerals (0-9) in tables and charts for international readability
- Arabic-Indic numerals (٠-٩) optional in narrative text for stylistic consistency
- Comma as thousands separator: `1,234` (international convention)
- Period as decimal separator: `4.2` (not Arabic comma)

### Report Sections (Standard Order)

1. **الملخص التنفيذي (Executive Summary)**
   - 100-150 words
   - Key findings, primary segment, high-level recommendations

2. **التحليل الكمي (Quantitative Analysis)**
   - Customer count, coverage percentage, profitability tier distribution
   - Service cost/revenue metrics, benchmarks

3. **الرؤى السلوكية (Behavioral Insights)**
   - Engagement levels, channel preferences, escalation patterns
   - Service interaction trends

4. **تحليل الرضا (Satisfaction Analysis)**
   - Average satisfaction score, sentiment distribution
   - Top satisfaction drivers and detractors

5. **نتائج التقسيم (Segmentation Results)**
   - Segment profiles with characteristics and customer counts
   - Segment-specific recommendations

6. **التوصيات (Recommendations)**
   - Prioritized action items (numbered list)
   - Owner and timeline for each recommendation

7. **الملاحق (Appendices) [Optional]**
   - Detailed data tables, technical notes

### Citation Format

**Format:** `[REF: source_type:source_id]`

**Examples:**
- Service report: `[REF: service_report:SR-2024-001234]`
- Survey response: `[REF: survey:SV-2024-005678]`
- Classification framework: `[REF: framework:DPS4:section-2.3]`

**Placement:** Inline after claim, or at end of paragraph if multiple claims share same source

**Example in Narrative:**
```
أظهر التحليل أن ٦٥٪ من العملاء مرتفعي التفاعل يفضلون التواصل عبر الهاتف [REF: service_report:SR-2024-001234, SR-2024-001567, SR-2024-002134]، 
بينما يفضل العملاء منخفضو التفاعل البوابة الإلكترونية [REF: service_report:SR-2024-003456].
```

---

## AR-005: Right-to-Left (RTL) Layout

### Constraint Statement
All Arabic text displays and report formats MUST respect right-to-left (RTL) text direction. Mixed-direction content (Arabic + English technical terms) must handle bidirectional text correctly.

### Technical Requirements

**TR-005.1: Markdown Reports**
- Use Unicode RTL direction marks where necessary: `U+200F (RIGHT-TO-LEFT MARK)`
- Markdown processors should auto-detect Arabic and apply RTL rendering

**TR-005.2: HTML Reports (Hardening Phase)**
- Use `dir="rtl"` attribute on Arabic content containers
- Use `lang="ar"` attribute for language declaration
- CSS: `text-align: right;` for Arabic paragraphs

**Example:**
```html
<div dir="rtl" lang="ar">
  <h1>تقرير تحليل العملاء — نوفمبر ٢٠٢٤</h1>
  <p>أظهر التحليل أن متوسط تقييم الرضا بلغ ٤.١ من ٥.٠...</p>
</div>
```

**TR-005.3: Mixed-Direction Text**
- Use Unicode bidirectional algorithm (UBA) marks for mixed content
- Example: Arabic text with English technical term: `تقييم الرضا (Satisfaction Score) بلغ ٤.٢`
- No manual direction overrides needed if text properly marked

---

## AR-006: Arabic Font Rendering

### Constraint Statement
Generated reports MUST use Arabic-optimized fonts that correctly render connected letterforms (ligatures) and diacritics.

### Recommended Fonts (MVP: Text-Based Reports)

**Primary:** System default Arabic font (no font embedding in MVP)
- Windows: Segoe UI Arabic
- macOS: Geeza Pro
- Linux: Noto Sans Arabic

**Hardening (PDF Reports):**
- Embed **Noto Sans Arabic** (open-source, comprehensive Unicode coverage)
- Or: **Traditional Arabic** (Microsoft font, good for formal documents)

### Rendering Validation

**Manual Check:**
- Open generated report in text editor or browser
- Verify connected letterforms render correctly (e.g., ـب vs. ب)
- Verify diacritics appear above/below letters (not detached)

---

## AR-007: Translation Strategy (Deferred to Hardening)

### MVP Scope: Arabic-Only

**No English translation required for MVP.**
- All reports generated in Arabic only
- Technical documentation (code, README) in English
- System logs in English (technical audience)

### Hardening Scope: Bilingual Reports

**Translation Approach:**
1. Generate Arabic report (AGN6)
2. LLM-based translation to English (separate translation prompt)
3. Human review of translation quality (optional for hardening)
4. Side-by-side bilingual report layout (Arabic right column, English left column)

**Translation Quality Standards:**
- Preserve meaning and tone (formal register in both languages)
- Technical terms: Use standardized English equivalents (e.g., "profitability tier" for "مستوى الربحية")
- No machine-translation artifacts (e.g., awkward phrasing, literal translations)

---

## AR-008: Glossary of Standardized Terms

### Customer Analysis Domain Terminology

| English | Arabic | Usage Context |
|---------|--------|---------------|
| Customer Analysis | تحليل العملاء | Report title, system name |
| Profitability Tier | مستوى الربحية | Classification framework |
| Engagement Level | مستوى التفاعل | Behavioral analysis |
| Satisfaction Score | تقييم الرضا | Survey metrics |
| Service Report | تقرير الخدمة | CRM data |
| Section Head | رئيس القسم | Approval authority |
| Analyst | محلل | Review role |
| Cycle | دورة | Analysis period (e.g., monthly cycle) |
| Coverage | التغطية | Data completeness metric |
| Citation | مرجع / استشهاد | Source reference |
| Workflow | سير العمل | Process state machine |
| Gate | بوابة | Quality gate (G1, G2, G3) |
| Review Queue | قائمة المراجعة | HITL review items |
| Segmentation | تقسيم العملاء | Customer grouping |
| Recommendation | توصية | Action item |

### Profitability Tiers

| Tier (EN) | Arabic Label | Abbreviation |
|-----------|-------------|--------------|
| High Profitability | مرتفع الربحية | عالي |
| Medium Profitability | متوسط الربحية | متوسط |
| Low Profitability | منخفض الربحية | منخفض |
| Negative Profitability | ربحية سلبية | سلبي |

### Engagement Levels

| Level (EN) | Arabic Label |
|------------|-------------|
| High Engagement | مرتفع التفاعل |
| Medium Engagement | متوسط التفاعل |
| Low Engagement | منخفض التفاعل |
| Dormant | خامل |

---

## AR-009: Validation and Testing

### Arabic Text Quality Tests

**Test 1: Encoding Integrity**
```python
def test_arabic_encoding_integrity():
    """Validate Arabic text survives round-trip through storage."""
    test_text = "تحليل عملاء نوفمبر ٢٠٢٤: مرتفع الربحية، متوسط التفاعل"
    
    # Store and retrieve from database
    customer = Customer(customer_id="C001", customer_name_ar=test_text)
    db.add(customer)
    db.commit()
    
    retrieved = db.query(Customer).filter_by(customer_id="C001").first()
    assert retrieved.customer_name_ar == test_text
```

**Test 2: Normalization Consistency**
```python
def test_arabic_normalization():
    """Validate normalization produces consistent results."""
    # Same text with different whitespace
    text1 = "تحليل   العملاء"  # Multiple spaces
    text2 = "تحليل العملاء"   # Single space
    
    normalized1 = normalize_arabic_text(text1)
    normalized2 = normalize_arabic_text(text2)
    
    assert normalized1 == normalized2 == "تحليل العملاء"
```

**Test 3: Linguistic Quality (Human Review)**
- Sample 5 generated reports per release
- Native Arabic speaker reviews and rates 1-5
- Target: Average rating ≥4.0

---

## References

- **Data Contracts:** `payload/air/data-contracts.md` (Arabic field naming conventions)
- **Functional Requirements:** `payload/requirements/functional-requirements.md` (Arabic reporting requirements)
- **Business Context:** `payload/requirements/business-context.md` (DG-CC Arabic-first policy)
- **Agent Architecture:** `payload/air/agent-architecture.md` (AGN4, AGN6 Arabic processing)

---

**Version:** 1.0.0  
**Last Updated:** 2026-11-12  
**Status:** Binding for MVP implementation
