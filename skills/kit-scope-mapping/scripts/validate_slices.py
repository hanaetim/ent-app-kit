#!/usr/bin/env python3
"""Structural validator for specs/product-delivery-slices.md.

This script intentionally checks only structural invariants. It does not prove
semantic gates such as runway overreach, layer splits, or altitude drift.
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path


PM_ID_RE = re.compile(r"\bPM-[A-Z]+-\d{3,}\b")
PIT_ID_RE = re.compile(r"\bPIT-\d{3,}\b")
SLICE_ID_RE = re.compile(r"[a-z][a-z0-9-]*-s\d{3,}")
SLICE_HEADING_RE = re.compile(r"^###\s+([a-z][a-z0-9-]*-s\d{3,})\b")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
FIELD_RE = re.compile(r"^-\s+([^:]+):\s*(.*)$")

REQUIRED_SECTIONS = [
    "Source Artifact Inventory",
    "Product / Boundary Model",
    "Source Identifier Translation",
    "Decomposition Decision",
    "Assumptions, Deferrals, And Pitfalls",
    "Coverage Map",
    "Delivery Slices",
    "Gate Record",
    "Final Convergence (not a slice)",
]

REQUIRED_SLICE_FIELDS = [
    "Slice class",
    "Class validity evidence",
    "Method framing",
    "Business outcome",
    "Included behavior",
    "Out of scope",
    "Source references",
    "Constraints and fidelity notes",
    "Relevant skills",
    "Dependencies",
    "Target method artifact",
    "Split/merge trigger",
    "Acceptance checks",
]

VALID_SLICE_CLASSES = {
    "Experience / Capability",
    "Enterprise Walking Skeleton / Runway Enabler",
    "Integration",
    "Operations / Control",
    "Quality / Compliance / Remediation",
    "Migration / Modernization",
    "Exploration / Spike",
}

GATE_TERMS = {
    "technical layer",
    "layer",
    "setup",
    "scaffold",
    "runway",
    "workflow",
    "backend",
    "frontend",
    "ui",
    "contract",
    "integration",
    "migration",
    "modernization",
    "quality",
    "risk",
    "evidence",
    "capability",
}

DECOMPOSITION_FIELDS = [
    "Delivery pattern",
    "Why this pattern",
    "Invalid split risks",
    "Sizing basis",
    "Ordering rationale",
]

GATE_RECORD_PHRASES = [
    "Validator run result",
    "Every payload artifact is inventoried",
    "Every Product / Boundary Model ID appears exactly once",
    "Every slice owns at least one Product Model ID",
    "Source Identifier Translation records",
    "Every applicable PIT placement target contains",
    "Semantic gates were reviewed separately",
    "No do-not-proceed gate remains open",
]

VALID_PIT_PLACEMENT_TYPES = {"coverage", "slice-acceptance", "final-convergence", "none"}

VALID_PM_TYPES = {
    "workflow",
    "entity",
    "state",
    "integration",
    "ui",
    "design",
    "agent",
    "fidelity",
    "constraint",
    "nfr",
    "done",
    "migration",
    "report",
    "quality",
}


@dataclass(frozen=True)
class Section:
    name: str
    start: int
    end: int


def fail(errors: list[str], line: int | None, section: str, message: str) -> None:
    loc = f"line {line}" if line else "line ?"
    errors.append(f"{loc} [{section}] {message}")


def split_cells(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def normalize_header(cells: list[str]) -> list[str]:
    return [re.sub(r"\s+", " ", c).strip().lower() for c in cells]


def is_separator(line: str) -> bool:
    cells = split_cells(line)
    return bool(cells) and all(re.fullmatch(r":?-{3,}:?", c.strip()) for c in cells)


def collect_sections(lines: list[str]) -> dict[str, Section]:
    found: list[tuple[str, int]] = []
    for idx, line in enumerate(lines, start=1):
        match = HEADING_RE.match(line)
        if match and match.group(1) == "##":
            found.append((match.group(2).strip(), idx))

    sections: dict[str, Section] = {}
    for pos, (name, start) in enumerate(found):
        end = found[pos + 1][1] - 1 if pos + 1 < len(found) else len(lines)
        sections[name] = Section(name, start, end)
    return sections


def section_lines(lines: list[str], section: Section) -> list[tuple[int, str]]:
    return [(idx, lines[idx - 1]) for idx in range(section.start + 1, section.end + 1)]


def find_table(lines: list[tuple[int, str]], required_headers: list[str]) -> tuple[int, list[str], list[tuple[int, list[str]]]] | None:
    wanted = [h.lower() for h in required_headers]
    for offset, (line_no, line) in enumerate(lines):
        if not line.lstrip().startswith("|"):
            continue
        headers = normalize_header(split_cells(line))
        if not all(h in headers for h in wanted):
            continue
        if offset + 1 >= len(lines) or not is_separator(lines[offset + 1][1]):
            continue
        rows: list[tuple[int, list[str]]] = []
        for row_no, row_line in lines[offset + 2 :]:
            if not row_line.lstrip().startswith("|") or is_separator(row_line):
                break
            rows.append((row_no, split_cells(row_line)))
        return line_no, headers, rows
    return None


def cell(row: list[str], headers: list[str], name: str) -> str:
    try:
        return row[headers.index(name.lower())].strip()
    except (ValueError, IndexError):
        return ""


def parse_product_model(lines: list[str], sections: dict[str, Section], errors: list[str]) -> dict[str, int]:
    section = sections.get("Product / Boundary Model")
    if not section:
        return {}
    table = find_table(section_lines(lines, section), ["Product Model ID", "Type", "Item", "Source refs"])
    if not table:
        fail(errors, section.start, section.name, "missing Product / Boundary Model table with required headers")
        return {}

    _, headers, rows = table
    pm_ids: dict[str, int] = {}
    for line_no, row in rows:
        pm_id = cell(row, headers, "product model id")
        pm_type = cell(row, headers, "type")
        item = cell(row, headers, "item")
        source_refs = cell(row, headers, "source refs")
        boundary_driver = cell(row, headers, "boundary driver?")
        if not pm_id or pm_id.startswith("["):
            continue
        if not PM_ID_RE.fullmatch(pm_id):
            fail(errors, line_no, section.name, f"invalid Product Model ID '{pm_id}'")
            continue
        if pm_id in pm_ids:
            fail(errors, line_no, section.name, f"duplicate Product Model ID '{pm_id}'")
        pm_ids[pm_id] = line_no
        if pm_type not in VALID_PM_TYPES:
            fail(errors, line_no, section.name, f"{pm_id} has invalid Type '{pm_type}'")
        if not meaningful(item):
            fail(errors, line_no, section.name, f"{pm_id} has empty Item")
        if not meaningful(source_refs):
            fail(errors, line_no, section.name, f"{pm_id} is missing source refs")
        if not meaningful(boundary_driver):
            fail(errors, line_no, section.name, f"{pm_id} has empty Boundary driver?")
    if not pm_ids:
        fail(errors, section.start, section.name, "no concrete PM-* IDs declared")
    return pm_ids


def validate_source_inventory(
    lines: list[str],
    sections: dict[str, Section],
    slice_ids: set[str],
    errors: list[str],
) -> None:
    section = sections.get("Source Artifact Inventory")
    if not section:
        return
    table = find_table(section_lines(lines, section), ["Artifact", "Tier", "Binding role", "Used by slices"])
    if not table:
        fail(errors, section.start, section.name, "missing Source Artifact Inventory table with required headers")
        return
    _, headers, rows = table
    concrete = 0
    for line_no, row in rows:
        artifact = cell(row, headers, "artifact")
        tier = cell(row, headers, "tier").upper()
        if not artifact or artifact.startswith("["):
            continue
        concrete += 1
        if tier not in {"BINDING", "INFORMATIVE"}:
            fail(errors, line_no, section.name, f"{artifact} has invalid tier '{tier}'")
        if not meaningful(cell(row, headers, "binding role")):
            fail(errors, line_no, section.name, f"{artifact} is missing binding/informative role")
        used_by = cell(row, headers, "used by slices")
        if not meaningful(used_by):
            fail(errors, line_no, section.name, f"{artifact} has no concrete Used by slices value")
            continue
        referenced = [
            token
            for token in re.split(r"[\s,]+", used_by)
            if token and token not in {"and", "&"}
        ]
        invalid = [token for token in referenced if not SLICE_ID_RE.fullmatch(token)]
        missing = [token for token in referenced if SLICE_ID_RE.fullmatch(token) and token not in slice_ids]
        if invalid:
            fail(errors, line_no, section.name, f"{artifact} has non-slice Used by slices value(s): {', '.join(invalid)}")
        if missing:
            fail(errors, line_no, section.name, f"{artifact} references undeclared slice(s): {', '.join(missing)}")
    if concrete == 0:
        fail(errors, section.start, section.name, "no concrete source artifacts listed")


def validate_decomposition_decision(lines: list[str], sections: dict[str, Section], errors: list[str]) -> None:
    section = sections.get("Decomposition Decision")
    if not section:
        return
    body = "\n".join(line for _, line in section_lines(lines, section))
    for field in DECOMPOSITION_FIELDS:
        match = re.search(rf"^-\s+{re.escape(field)}:\s*(.+)$", body, flags=re.MULTILINE)
        if not match or not meaningful(match.group(1)):
            fail(errors, section.start, section.name, f"missing or empty '{field}'")


def parse_coverage(
    lines: list[str],
    sections: dict[str, Section],
    pm_ids: dict[str, int],
    errors: list[str],
) -> tuple[dict[str, str], dict[int, list[str]]]:
    section = sections.get("Coverage Map")
    if not section:
        return {}, {}
    table = find_table(
        section_lines(lines, section),
        ["Product Model ID", "Accountable slice", "Enforcement touchpoints", "Evidence expectation"],
    )
    if not table:
        fail(errors, section.start, section.name, "missing Coverage Map table with required headers")
        return {}, {}

    _, headers, rows = table
    coverage: dict[str, str] = {}
    touchpoints_by_line: dict[int, list[str]] = {}
    seen: dict[str, int] = {}
    for line_no, row in rows:
        pm_id = cell(row, headers, "product model id")
        accountable = cell(row, headers, "accountable slice")
        enforcement = cell(row, headers, "enforcement touchpoints")
        evidence = cell(row, headers, "evidence expectation")
        if not pm_id or pm_id.startswith("["):
            continue
        if not PM_ID_RE.fullmatch(pm_id):
            fail(errors, line_no, section.name, f"coverage row uses non-PM prose key '{pm_id}'")
            continue
        if pm_id not in pm_ids:
            fail(errors, line_no, section.name, f"coverage row references undeclared Product Model ID '{pm_id}'")
        if pm_id in seen:
            fail(errors, line_no, section.name, f"duplicate accountable coverage row for '{pm_id}'")
        seen[pm_id] = line_no
        if not SLICE_ID_RE.fullmatch(accountable):
            fail(errors, line_no, section.name, f"{pm_id} has invalid accountable slice '{accountable}'")
        coverage[pm_id] = accountable
        if not meaningful_allow_none(enforcement):
            fail(errors, line_no, section.name, f"{pm_id} has empty Enforcement touchpoints")
        else:
            normalized = enforcement.strip().lower()
            if normalized not in {"—", "-", "none"}:
                touchpoints = [
                    token
                    for token in re.split(r"[\s,]+", enforcement)
                    if token and token not in {"and", "&"}
                ]
                invalid = [token for token in touchpoints if not SLICE_ID_RE.fullmatch(token)]
                if invalid:
                    fail(errors, line_no, section.name, f"{pm_id} has non-slice Enforcement touchpoint(s): {', '.join(invalid)}")
                touchpoints_by_line[line_no] = [token for token in touchpoints if SLICE_ID_RE.fullmatch(token)]
        if not meaningful(evidence):
            fail(errors, line_no, section.name, f"{pm_id} has empty Evidence expectation")

    for pm_id, line_no in pm_ids.items():
        if pm_id not in coverage:
            fail(errors, line_no, section.name, f"{pm_id} is declared but missing from Coverage Map")
    return coverage, touchpoints_by_line


def validate_coverage_touchpoints(
    touchpoints_by_line: dict[int, list[str]],
    slice_ids: set[str],
    errors: list[str],
) -> None:
    for line_no, touchpoints in touchpoints_by_line.items():
        missing = [touchpoint for touchpoint in touchpoints if touchpoint not in slice_ids]
        if missing:
            fail(errors, line_no, "Coverage Map", f"Enforcement touchpoints reference undeclared slice(s): {', '.join(missing)}")


def parse_slices(lines: list[str], sections: dict[str, Section], coverage: dict[str, str], errors: list[str]) -> dict[str, int]:
    section = sections.get("Delivery Slices")
    if not section:
        return {}

    slice_ids: dict[str, int] = {}
    current_id: str | None = None
    fields: dict[str, tuple[int, str]] = {}

    def flush() -> None:
        if not current_id:
            return
        for required in REQUIRED_SLICE_FIELDS:
            if required not in fields:
                fail(errors, slice_ids[current_id], section.name, f"{current_id} missing required field '{required}'")
        class_name = fields.get("Slice class", (0, ""))[1].strip()
        if class_name not in VALID_SLICE_CLASSES:
            fail(errors, slice_ids[current_id], section.name, f"{current_id} has invalid Slice class '{class_name}'")

        class_evidence_raw = fields.get("Class validity evidence", (0, ""))[1].strip()
        class_evidence = class_evidence_raw.lower()
        if not meaningful(class_evidence_raw) or len(class_evidence_raw) < 25:
            fail(errors, slice_ids[current_id], section.name, f"{current_id} has empty Class validity evidence")
        elif not any(term in class_evidence for term in GATE_TERMS):
            fail(errors, slice_ids[current_id], section.name, f"{current_id} Class validity evidence does not name a gate or validity rationale")

        for required_non_empty in [
            "Method framing",
            "Business outcome",
            "Included behavior",
            "Source references",
            "Relevant skills",
            "Target method artifact",
            "Acceptance checks",
        ]:
            line_no, value = fields.get(required_non_empty, (slice_ids[current_id], ""))
            if not meaningful(value):
                fail(errors, line_no, section.name, f"{current_id} field '{required_non_empty}' is empty")

        for required_allow_none in [
            "Out of scope",
            "Constraints and fidelity notes",
            "Dependencies",
            "Split/merge trigger",
        ]:
            line_no, value = fields.get(required_allow_none, (slice_ids[current_id], ""))
            if not meaningful_allow_none(value):
                fail(errors, line_no, section.name, f"{current_id} field '{required_allow_none}' is empty")

        target = fields.get("Target method artifact", (0, ""))[1].strip()
        if target and not re.search(r"(specs/\d{3}-|openspec/changes/|BMAD|bmad|blocked)", target):
            fail(errors, fields.get("Target method artifact", (slice_ids[current_id], ""))[0], section.name, f"{current_id} Target method artifact has unclear method shape")

        acceptance = fields.get("Acceptance checks", (0, ""))[1].strip()
        if acceptance and len([part for part in re.split(r";|\.|,", acceptance) if part.strip()]) < 1:
            fail(errors, fields.get("Acceptance checks", (slice_ids[current_id], ""))[0], section.name, f"{current_id} Acceptance checks do not contain a concrete check")

    for line_no, line in section_lines(lines, section):
        match = SLICE_HEADING_RE.match(line)
        if match:
            flush()
            current_id = match.group(1)
            fields = {}
            if current_id in slice_ids:
                fail(errors, line_no, section.name, f"duplicate slice id '{current_id}'")
            slice_ids[current_id] = line_no
            continue
        if current_id:
            field = FIELD_RE.match(line)
            if field:
                fields[field.group(1).strip()] = (line_no, field.group(2).strip())
    flush()

    covered_slices = {slice_id for slice_id in coverage.values() if SLICE_ID_RE.fullmatch(slice_id)}
    for slice_id, line_no in slice_ids.items():
        if slice_id not in covered_slices:
            fail(errors, line_no, section.name, f"{slice_id} owns no Coverage Map row")
    for slice_id in covered_slices:
        if slice_id not in slice_ids:
            fail(errors, None, section.name, f"Coverage Map references missing delivery slice '{slice_id}'")
    return slice_ids


def validate_source_identifier(lines: list[str], sections: dict[str, Section], errors: list[str]) -> None:
    section = sections.get("Source Identifier Translation")
    if not section:
        return
    decision_line: tuple[int, str] | None = None
    reason_line: tuple[int, str] | None = None
    section_rows = section_lines(lines, section)
    for line_no, line in section_rows:
        match = FIELD_RE.match(line)
        if not match:
            continue
        field = match.group(1).strip().lower()
        value = match.group(2).strip()
        if field == "decision":
            decision_line = (line_no, value)
        elif field == "reason or path":
            reason_line = (line_no, value)

    if not decision_line:
        fail(errors, section.start, section.name, "missing '- Decision: not-needed|inline-map|external-map'")
        return

    decision_line_no, decision = decision_line
    normalized = decision.lower()
    valid_decisions = {"not-needed", "inline-map", "external-map"}
    if normalized not in valid_decisions:
        fail(errors, decision_line_no, section.name, "Decision must be one of not-needed, inline-map, external-map")
        return

    reason = reason_line[1] if reason_line else ""
    if normalized == "not-needed":
        if not meaningful(reason):
            fail(errors, reason_line[0] if reason_line else decision_line_no, section.name, "not-needed requires a meaningful reason")
    elif normalized == "external-map":
        if reason.strip() != "specs/source-identifier-map.md":
            fail(errors, reason_line[0] if reason_line else decision_line_no, section.name, "external-map requires Reason or path: specs/source-identifier-map.md")
    elif normalized == "inline-map":
        table = find_table(
            section_rows,
            ["Source ID", "Meaning", "Classification", "Implementation/config naming", "UI guidance", "Raw ID remains in"],
        )
        if not table:
            fail(errors, section.start, section.name, "inline-map requires the inline Source ID table")
        else:
            _, headers, rows = table
            concrete_rows = [
                row
                for _, row in rows
                if meaningful(cell(row, headers, "source id")) and meaningful(cell(row, headers, "meaning"))
            ]
            if not concrete_rows:
                fail(errors, table[0], section.name, "inline-map requires at least one concrete Source ID row")


def load_registry_pit_ids(errors: list[str]) -> set[str]:
    registry = Path(__file__).resolve().parents[2] / "kit-pitfall-registry" / "references" / "pitfall-registry.md"
    if not registry.is_file():
        fail(errors, None, "Pitfall registry", f"canonical registry not found at {registry}")
        return set()
    text = registry.read_text(encoding="utf-8")
    return set(PIT_ID_RE.findall(text))


def validate_pitfalls(lines: list[str], sections: dict[str, Section], errors: list[str]) -> None:
    section = sections.get("Assumptions, Deferrals, And Pitfalls")
    if not section:
        return
    table = find_table(
        section_lines(lines, section),
        ["PIT ID", "Applicable", "Placement type", "Placement target", "Reason if N/A"],
    )
    if not table:
        fail(errors, section.start, section.name, "missing pitfall table with required columns")
        return

    expected_pits = load_registry_pit_ids(errors)
    _, headers, rows = table
    seen_pits: set[str] = set()
    for line_no, row in rows:
        pit_id = cell(row, headers, "pit id")
        if not pit_id or pit_id.startswith("["):
            continue
        if not PIT_ID_RE.fullmatch(pit_id):
            fail(errors, line_no, section.name, f"invalid PIT ID '{pit_id}'")
            continue
        if pit_id in seen_pits:
            fail(errors, line_no, section.name, f"duplicate pitfall disposition for {pit_id}")
        seen_pits.add(pit_id)
        applicable = cell(row, headers, "applicable").strip().lower()
        placement_type = cell(row, headers, "placement type").strip().lower()
        target = cell(row, headers, "placement target")
        reason = cell(row, headers, "reason if n/a")
        if placement_type not in VALID_PIT_PLACEMENT_TYPES:
            fail(errors, line_no, section.name, f"{pit_id} has invalid Placement type '{placement_type}'")
        if applicable in {"yes", "y", "true", "applicable"}:
            if placement_type == "none":
                fail(errors, line_no, section.name, f"{pit_id} is applicable but Placement type is none")
            if not target_matches_placement_type(target, placement_type):
                fail(errors, line_no, section.name, f"{pit_id} Placement type '{placement_type}' does not match target '{target}'")
            if not target or target in {"—", "-", "none"}:
                fail(errors, line_no, section.name, f"{pit_id} is applicable but has no placement target")
            elif not target_has_marker(lines, sections, target, pit_id):
                fail(errors, line_no, section.name, f"{pit_id} is applicable but marker is absent from named target")
        elif applicable in {"no", "n", "false", "n/a", "na"}:
            if not reason or reason in {"—", "-", "none"}:
                fail(errors, line_no, section.name, f"{pit_id} is N/A but has no reason")
        else:
            fail(errors, line_no, section.name, f"{pit_id} has invalid Applicable value '{applicable}'")

    for pit_id in sorted(expected_pits - seen_pits):
        fail(errors, section.start, section.name, f"missing pitfall disposition for {pit_id}")


def target_has_marker(lines: list[str], sections: dict[str, Section], target: str, pit_id: str) -> bool:
    marker = f"({pit_id})"
    target = target.strip()

    coverage = sections.get("Coverage Map")
    if PM_ID_RE.fullmatch(target) and coverage:
        for _, line in section_lines(lines, coverage):
            if target in line and marker in line:
                return True
        return False

    delivery = sections.get("Delivery Slices")
    if SLICE_ID_RE.fullmatch(target) and delivery:
        in_slice = False
        for _, line in section_lines(lines, delivery):
            heading = SLICE_HEADING_RE.match(line)
            if heading:
                in_slice = heading.group(1) == target
            elif in_slice and marker in line:
                return True
        return False

    final_convergence = sections.get("Final Convergence (not a slice)")
    if target.lower() in {"final-convergence", "final convergence", "final convergence (not a slice)"} and final_convergence:
        return any(marker in line for _, line in section_lines(lines, final_convergence))

    return any(target in line and marker in line for line in lines)


def target_matches_placement_type(target: str, placement_type: str) -> bool:
    target = target.strip()
    if placement_type == "coverage":
        return bool(PM_ID_RE.fullmatch(target))
    if placement_type == "slice-acceptance":
        return bool(SLICE_ID_RE.fullmatch(target))
    if placement_type == "final-convergence":
        return target.lower() in {"final-convergence", "final convergence", "final convergence (not a slice)"}
    if placement_type == "none":
        return target in {"", "—", "-", "none"}
    return False


def validate_required_sections(lines: list[str], sections: dict[str, Section], errors: list[str]) -> None:
    for section_name in REQUIRED_SECTIONS:
        if section_name not in sections:
            fail(errors, None, section_name, "missing required section")


def validate_gate_record(lines: list[str], sections: dict[str, Section], errors: list[str]) -> None:
    section = sections.get("Gate Record")
    if not section:
        return
    for phrase in GATE_RECORD_PHRASES:
        matching_lines = [
            (line_no, line)
            for line_no, line in section_lines(lines, section)
            if phrase in line
        ]
        if not matching_lines:
            fail(errors, section.start, section.name, f"missing Gate Record item containing '{phrase}'")
            continue
        if not any(re.match(r"^-\s+\[[xX]\]\s+", line) for _, line in matching_lines):
            fail(errors, matching_lines[0][0], section.name, f"Gate Record item containing '{phrase}' must be checked")
            continue
        checked = [line for _, line in matching_lines if re.match(r"^-\s+\[[xX]\]\s+", line)]
        if not any(":" in line and meaningful(line.split(":", 1)[1]) for line in checked):
            fail(errors, matching_lines[0][0], section.name, f"Gate Record item containing '{phrase}' must include a meaningful note after ':'")


def meaningful(value: str) -> bool:
    stripped = value.strip()
    if not stripped:
        return False
    lowered = stripped.lower()
    if lowered in {"tbd", "todo", "n/a", "na", "none", "-", "—", "[...]", "[todo]"}:
        return False
    if stripped.startswith("<!--") or stripped.startswith("["):
        return False
    return True


def meaningful_allow_none(value: str) -> bool:
    stripped = value.strip()
    if not stripped:
        return False
    lowered = stripped.lower()
    if lowered in {"tbd", "todo", "[...]", "[todo]"}:
        return False
    if stripped.startswith("<!--") or stripped.startswith("["):
        return False
    return True


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: python3 scripts/validate_slices.py <path-to-product-delivery-slices.md>", file=sys.stderr)
        return 2

    path = Path(argv[1])
    if not path.is_file():
        print(f"line ? [file] not found: {path}", file=sys.stderr)
        return 2

    lines = path.read_text(encoding="utf-8").splitlines()
    errors: list[str] = []
    sections = collect_sections(lines)

    validate_required_sections(lines, sections, errors)
    validate_decomposition_decision(lines, sections, errors)
    pm_ids = parse_product_model(lines, sections, errors)
    coverage, touchpoints_by_line = parse_coverage(lines, sections, pm_ids, errors)
    slice_ids = parse_slices(lines, sections, coverage, errors)
    validate_coverage_touchpoints(touchpoints_by_line, set(slice_ids), errors)
    validate_source_inventory(lines, sections, set(slice_ids), errors)
    validate_source_identifier(lines, sections, errors)
    validate_pitfalls(lines, sections, errors)
    validate_gate_record(lines, sections, errors)

    if errors:
        for error in errors:
            print(error)
        return 1
    print(f"ok: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
