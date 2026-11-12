#!/usr/bin/env python3
"""Generic OKF markdown-wiki structure validator.

Point it at a single .md file to check that file's structure, or at a
bundle directory for the full sweep (structure + link graph + orphan
detection). Checks are generic OKF conformance only (per references/SPEC.md):
frontmatter parses, required `type` is present, `verified`/`generated`/
`sources` are shaped correctly, links resolve, pages are reachable from
index.md. It does not know about any domain's folder layout, page
templates, or headings - those are judgment calls, not structural ones.

Usage:
    python3 lint_wiki.py <path> [--json] [--strict]

Exit code: 1 if any error-level finding, 0 otherwise (warnings never fail
the run unless --strict is passed).
"""

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

try:
    import yaml

    def yaml_safe_load(text):
        return yaml.safe_load(text)

    YAMLError = yaml.YAMLError
except ImportError:
    from minimal_yaml import minimal_yaml_load, MinimalYAMLError

    def yaml_safe_load(text):
        return minimal_yaml_load(text)

    YAMLError = MinimalYAMLError

RESERVED_FILENAMES = {"index.md", "log.md"}
FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n?(.*)$", re.DOTALL)
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
LOG_DATE_HEADING_RE = re.compile(r"^##\s+(\d{4}-\d{2}-\d{2})\s*$")
COMMAND_LOOKING = re.compile(r"^(rg|grep|find|ls|cat|git|awk|sed)\b")


@dataclass
class Finding:
    path: str
    severity: str  # "error" | "warn"
    check: str
    message: str


@dataclass
class Doc:
    path: Path
    text: str
    frontmatter: dict = field(default_factory=dict)
    body: str = ""
    parse_error: str = ""


def load_doc(path: Path) -> Doc:
    text = path.read_text(encoding="utf-8")
    doc = Doc(path=path, text=text)
    m = FRONTMATTER_RE.match(text)
    if not m:
        doc.parse_error = "no frontmatter block found"
        doc.body = text
        return doc
    raw_fm, body = m.group(1), m.group(2)
    doc.body = body
    try:
        parsed = yaml_safe_load(raw_fm)
        doc.frontmatter = parsed if isinstance(parsed, dict) else {}
        if parsed is not None and not isinstance(parsed, dict):
            doc.parse_error = "frontmatter did not parse to a mapping"
    except YAMLError as e:
        doc.parse_error = f"invalid YAML: {e}"
    return doc


def extract_links(body: str):
    return [m.group(1) for m in LINK_RE.finditer(body) if not m.group(1).startswith("http")]


def resolve_link(link: str, from_path: Path, root: Path) -> Path:
    link = link.split("#", 1)[0]
    if not link:
        return None
    if link.startswith("/"):
        return (root / link.lstrip("/")).resolve()
    return (from_path.parent / link).resolve()


def check_conformance(doc: Doc, is_reserved: bool) -> list:
    findings = []
    rel = str(doc.path)
    if is_reserved:
        return findings  # reserved files checked separately
    if doc.parse_error:
        findings.append(Finding(rel, "error", "frontmatter", doc.parse_error))
        return findings
    fm = doc.frontmatter
    if not fm.get("type"):
        findings.append(Finding(rel, "error", "required-type", "missing or empty required `type` field"))
    verified = fm.get("verified")
    if isinstance(verified, dict) and ("by" not in verified or "at" not in verified):
        findings.append(Finding(rel, "warn", "verified-shape", "`verified` mapping is missing `by` or `at`"))
    generated = fm.get("generated")
    if isinstance(generated, dict) and "by" not in generated:
        findings.append(Finding(rel, "warn", "generated-shape", "`generated` is missing required `by`"))
    stale_after = fm.get("stale_after")
    if stale_after:
        try:
            if isinstance(stale_after, date) and date.today() >= stale_after:
                findings.append(Finding(rel, "warn", "stale", f"stale_after={stale_after} has passed"))
        except TypeError:
            pass
    sources = fm.get("sources") or []
    if isinstance(sources, dict):
        sources = [sources]
    for entry in sources:
        if not isinstance(entry, dict):
            continue
        resource = str(entry.get("resource", ""))
        if not resource:
            findings.append(Finding(rel, "error", "source-resource", "sources[] entry missing `resource`"))
        elif COMMAND_LOOKING.match(resource.strip()) or " --" in resource:
            findings.append(Finding(
                rel, "error", "source-not-a-command",
                f"sources[].resource looks like a shell command, not a path/URL: {resource!r}",
            ))
    return findings


def check_reserved_file(doc: Doc) -> list:
    findings = []
    rel = str(doc.path)
    if doc.path.name == "log.md":
        if not LOG_DATE_HEADING_RE_search(doc.body):
            findings.append(Finding(rel, "warn", "log-format", "log.md has no ISO `## YYYY-MM-DD` date heading"))
    return findings


def LOG_DATE_HEADING_RE_search(body: str) -> bool:
    return any(LOG_DATE_HEADING_RE.match(line) for line in body.splitlines())


def lint_single_file(path: Path) -> list:
    doc = load_doc(path)
    findings = check_conformance(doc, is_reserved=path.name in RESERVED_FILENAMES)
    if path.name in RESERVED_FILENAMES:
        findings.extend(check_reserved_file(doc))
    return findings


def lint_bundle(root: Path) -> list:
    findings = []
    all_md = sorted(root.rglob("*.md"))
    concept_docs = {}
    reserved_docs = {}

    for path in all_md:
        doc = load_doc(path)
        is_reserved = path.name in RESERVED_FILENAMES
        if is_reserved:
            reserved_docs[path] = doc
            findings.extend(check_reserved_file(doc))
        else:
            concept_docs[path] = doc
            findings.extend(check_conformance(doc, is_reserved=False))

    # link graph: broken links + reachability from root index.md
    graph = {}
    for path, doc in {**concept_docs, **reserved_docs}.items():
        targets = set()
        for link in extract_links(doc.body):
            target = resolve_link(link, path, root)
            if target is None:
                continue
            if not target.exists():
                findings.append(Finding(str(path), "warn", "broken-link", f"link target does not exist: {link}"))
            else:
                targets.add(target)
        graph[path.resolve()] = targets

    root_index = root / "index.md"
    if not root_index.exists():
        findings.append(Finding(str(root), "warn", "missing-index", "bundle root has no index.md"))
    else:
        seen = set()
        stack = [root_index.resolve()]
        while stack:
            cur = stack.pop()
            if cur in seen:
                continue
            seen.add(cur)
            stack.extend(graph.get(cur, ()))
        for path in concept_docs:
            if path.resolve() not in seen:
                findings.append(Finding(str(path), "warn", "orphan-page", "page is not reachable from root index.md"))

    return findings


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", help="a single .md file or a wiki bundle directory")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--strict", action="store_true", help="treat warnings as failures")
    args = parser.parse_args()

    target = Path(args.path)
    if not target.exists():
        print(f"error: {target} does not exist", file=sys.stderr)
        sys.exit(2)

    if target.is_file():
        findings = lint_single_file(target)
    else:
        findings = lint_bundle(target)

    if args.json:
        print(json.dumps([f.__dict__ for f in findings], indent=2))
    else:
        if not findings:
            print("no findings")
        for f in sorted(findings, key=lambda f: (f.severity, f.path)):
            print(f"[{f.severity.upper()}] {f.path} ({f.check}): {f.message}")
        print(f"\n{len(findings)} finding(s): "
              f"{sum(1 for f in findings if f.severity == 'error')} error(s), "
              f"{sum(1 for f in findings if f.severity == 'warn')} warning(s)")

    has_error = any(f.severity == "error" for f in findings)
    has_warn = any(f.severity == "warn" for f in findings)
    sys.exit(1 if has_error or (args.strict and has_warn) else 0)


if __name__ == "__main__":
    main()
