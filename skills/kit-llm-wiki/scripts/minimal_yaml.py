"""Stdlib-only fallback YAML parser for lint_wiki.py.

Not a general YAML parser. Handles exactly the subset OKF frontmatter
uses per references/SPEC.md: block mappings, block lists (including
lists of small mappings like `sources:`), inline flow mappings/lists
(`{ by: x, at: y }`, `[a, b]`), and scalar strings/ints/dates/datetimes.
Used only when PyYAML is not installed - prefer PyYAML when available,
since it is the correct, complete implementation.
"""

import re
from datetime import date, datetime

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
DATETIME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}")


class MinimalYAMLError(ValueError):
    pass


def minimal_yaml_load(text):
    lines = [ln for ln in text.split("\n") if ln.strip() != "" and not ln.strip().startswith("#")]
    if not lines:
        return None
    value, i = _parse_block(lines, 0, _indent_of(lines[0]))
    return value


def _indent_of(line):
    return len(line) - len(line.lstrip(" "))


def _parse_scalar(raw):
    raw = raw.strip()
    if raw == "" or raw in ("null", "~"):
        return None
    if raw in ("true", "True"):
        return True
    if raw in ("false", "False"):
        return False
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in ("'", '"'):
        return raw[1:-1]
    if DATETIME_RE.match(raw):
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return raw
    if DATE_RE.match(raw):
        try:
            return date.fromisoformat(raw)
        except ValueError:
            return raw
    try:
        return int(raw)
    except ValueError:
        pass
    try:
        return float(raw)
    except ValueError:
        pass
    return raw


def _split_flow_items(inner):
    items, depth, cur = [], 0, ""
    for ch in inner:
        if ch in "{[":
            depth += 1
        elif ch in "}]":
            depth -= 1
        if ch == "," and depth == 0:
            items.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip() != "":
        items.append(cur)
    return items


def _parse_flow(raw):
    raw = raw.strip()
    if raw.startswith("{") and raw.endswith("}"):
        result = {}
        for item in _split_flow_items(raw[1:-1]):
            if ":" not in item:
                continue
            k, v = item.split(":", 1)
            result[k.strip()] = _parse_flow(v.strip()) if v.strip().startswith(("{", "[")) else _parse_scalar(v)
        return result
    if raw.startswith("[") and raw.endswith("]"):
        return [
            _parse_flow(item.strip()) if item.strip().startswith(("{", "[")) else _parse_scalar(item)
            for item in _split_flow_items(raw[1:-1])
        ]
    return _parse_scalar(raw)


def _peek_indent(lines, i):
    if i >= len(lines):
        return None
    return _indent_of(lines[i])


def _parse_block(lines, i, indent):
    if i < len(lines) and lines[i].strip().startswith("-"):
        return _parse_list(lines, i, indent)
    return _parse_mapping(lines, i, indent)


def _parse_mapping(lines, i, indent):
    result = {}
    while i < len(lines):
        line = lines[i]
        cur_indent = _indent_of(line)
        if cur_indent != indent:
            break
        stripped = line.strip()
        if ":" not in stripped:
            raise MinimalYAMLError(f"expected 'key: value', got: {stripped!r}")
        key, _, rest = stripped.partition(":")
        key = key.strip()
        rest = rest.strip()
        i += 1
        if rest == "":
            child_indent = _peek_indent(lines, i)
            if child_indent is not None and child_indent > indent:
                value, i = _parse_block(lines, i, child_indent)
            else:
                value = None
        elif rest.startswith("{") or rest.startswith("["):
            value = _parse_flow(rest)
        else:
            value = _parse_scalar(rest)
        result[key] = value
    return result, i


def _parse_list(lines, i, indent):
    result = []
    while i < len(lines):
        line = lines[i]
        cur_indent = _indent_of(line)
        if cur_indent != indent or not line.strip().startswith("-"):
            break
        content = line.strip()[1:].strip()
        field_indent = cur_indent + 2
        i += 1
        if content == "":
            child_indent = _peek_indent(lines, i)
            item, i = _parse_block(lines, i, child_indent if child_indent is not None else field_indent)
        elif content.startswith("{") or content.startswith("["):
            item = _parse_flow(content)
        elif ":" in content:
            first_key, _, first_rest = content.partition(":")
            first_rest = first_rest.strip()
            item = {first_key.strip(): _parse_flow(first_rest) if first_rest.startswith(("{", "[")) else _parse_scalar(first_rest)}
            while i < len(lines) and _indent_of(lines[i]) == field_indent and ":" in lines[i].strip() and not lines[i].strip().startswith("-"):
                k, _, v = lines[i].strip().partition(":")
                v = v.strip()
                item[k.strip()] = _parse_flow(v) if v.startswith(("{", "[")) else _parse_scalar(v)
                i += 1
        else:
            item = _parse_scalar(content)
        result.append(item)
    return result, i
