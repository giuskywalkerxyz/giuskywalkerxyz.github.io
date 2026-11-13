---
title: "Arkx — Master of Resources"
platform: "Arkx"
track: "Advanced"
level: "Level 7"
vuln: "MCP resources/tools exposed behind an Origin-only (DNS-rebinding) guard"
severity: "High"
flag: "flag-5a7c89"
owasp: ["LLM06 Excessive Agency", "LLM02 Sensitive Information Disclosure"]
atlas: ["AML.T0057 LLM Data Leakage", "AML.T0053 LLM Plugin Compromise"]
image: "/arkx/a7-master-of-resources.jpg"
order: 2
date: 2026-11-13
tags: ["ai", "llm", "mcp", "access-control", "dns-rebinding"]
summary: "The UI is 'down', but the backing MCP server isn't — its only guard is an Origin check that a non-browser client bypasses by sending no Origin at all."
draft: false
---

## Result

The level claims its "main interface is down". It isn't the whole story: the agent is backed by a **Model Context Protocol** server (Python MCP SDK, Streamable HTTP, `serverInfo.name = "Weather"`) reachable at `/level/7/mcp`. Its only protection is a DNS-rebinding **`Origin` check** — which exists to stop browsers, not clients.

**Flag:** `flag-5a7c89`

## Exploit

**1 — The insight.** A browser `fetch()` always sends an `Origin` header → the server rejects it (403, DNS-rebinding guard). Requests with **no `Origin`** are allowed. A browser can't drop its own `Origin`, so you need a non-browser HTTP client. (The level's normal session cookies authenticate the request; used only against the target, for this one authorized call.)

**2 — Handshake.** `POST /level/7/mcp` with `Accept: application/json, text/event-stream`, the JSON-RPC `initialize` body, and **no `Origin` header** → `200`, and the server hands back an `Mcp-Session-Id`. Then `notifications/initialized` (202) and `resources/list`:

```text
resource://flag          → "the flag is locked"
resource://super-secret  → (a rick-roll decoy)
```

**3 — Enumerate tools.** `tools/list` → a single tool, `unlock_flag` (no arguments).

**4 — Exploit.** Call it, then read the resource:

```text
tools/call  unlock_flag            → "Flag has been unlocked"
resources/read resource://flag     → "You did it! the flag is: flag-5a7c89"
```

## Root cause

A sensitive resource and the tool that unlocks it are published on an MCP server. MCP is *designed* to expose its resources and tools to any client that can reach it — and the only barrier here, an `Origin`/DNS-rebinding check, is an anti-CSRF measure, **not** an authorization control. There is no per-resource auth at the MCP layer.

## Impact

Anyone who can reach the endpoint reads "protected" resources and invokes privileged tools, bypassing the UI and its auth entirely. Takeaway: protected data should never live on an MCP surface, and MCP tools/resources need real authorization — the transport guard is not it.
