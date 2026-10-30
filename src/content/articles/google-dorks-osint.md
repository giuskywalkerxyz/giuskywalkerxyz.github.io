---
title: "Google Dorks: an OSINT cheatsheet (and the breaches that prove it works)"
date: 2026-10-30T10:00:00
tags: ["osint", "recon", "google-dorks", "methodology", "cheatsheet"]
summary: "Advanced search operators turn Google into the cheapest recon tool you own. The operators, a copy-paste OSINT cheatsheet, how to defend against it — and real incidents where a search query was the first step of the attack."
---

> `giuskywalker@death-star:~$ cat ./notes/google-dorks.md`

Every recon phase I run starts the same way: before a single packet touches the
target, I ask Google what it already knows. Search engines crawl relentlessly
and index whatever a misconfigured server hands them — config files, backups,
login panels, spreadsheets, directory listings. **Google dorking** (or *Google
hacking*) is just the skill of asking for that material precisely.

The term goes back to Johnny Long, who started collecting "googledorks" in the
early 2000s. His list became the **Google Hacking Database (GHDB)**, which
Exploit-DB now maintains. Thousands of community queries, sorted by category,
still updated today.

> **Scope.** Dorking is passive. You're reading what a search engine already
> published. *Using* what you find is another matter. Logging in with leaked
> credentials or touching a panel you found is unauthorized access unless it's
> in scope. Keep it to engagements, bug bounty programs (read the policy) and
> your own organization's footprint.

## How a dork is built

A dork is a normal query plus **operators** that narrow it by where the text
appears, the file type, or the site. Three rules cover most of the syntax:

- `operator:value` takes **no space** after the colon (`site:example.com`).
- `"exact phrase"` forces a literal match. `-term` excludes. `OR` (uppercase)
  or `|` gives alternation, and `( )` groups.
- Operators **stack**. One clause finds noise; three clauses together find a leak.

```text
site:example.com filetype:xlsx intext:"password" -site:www.example.com
```

That reads as: spreadsheets on any `example.com` host except `www` that contain
the word *password*.

## Operator reference

| Operator | What it does | Example |
|---|---|---|
| `site:` | Restrict to a domain/subdomain/TLD | `site:example.com`, `site:*.gov.br` |
| `filetype:` / `ext:` | Restrict by file extension | `filetype:pdf`, `ext:sql` |
| `intitle:` | Word appears in the page `<title>` | `intitle:"index of"` |
| `allintitle:` | *All* words appear in the title | `allintitle:admin login` |
| `inurl:` | Word appears in the URL | `inurl:wp-admin` |
| `allinurl:` | *All* words appear in the URL | `allinurl:admin config` |
| `intext:` | Word appears in the body text | `intext:"DB_PASSWORD"` |
| `allintext:` | *All* words appear in the body | `allintext:username password` |
| `"..."` | Exact phrase | `"confidential - internal use only"` |
| `-` | Exclude term/operator | `-site:www.example.com` |
| `OR` / `\|` | Either term | `ext:env OR ext:ini` |
| `*` | Wildcard word inside a phrase | `"powered by * version"` |
| `before:` / `after:` | Date-bound results | `after:2025-01-01` |
| `cache:` | **Retired** by Google in 2024. Use the Wayback Machine instead | — |

> Google quietly changes operator behavior. `link:` and `cache:` are gone, `~`
> and `+` were retired years ago, and `inurl:`/`intext:` are best-effort hints,
> not guarantees. If a dork returns nothing, run the same query on **Bing**
> (`instreamset:`, `ip:`), **DuckDuckGo** or **Yandex** before you give up.
> Their indexes differ.

## The OSINT cheatsheet

Swap `example.com` for the target in scope. All of these are well-known GHDB
patterns.

### 1. Map the attack surface

```text
site:*.example.com -site:www.example.com          # subdomains Google knows about
site:*.*.example.com                              # deeper subdomains
site:example.com inurl:dev | inurl:staging | inurl:test | inurl:uat
site:example.com inurl:api | inurl:swagger | inurl:graphql
site:example.com intitle:"swagger ui"             # exposed API docs
site:example.com ext:php | ext:aspx | ext:jsp     # fingerprint the stack
```

Pair this with certificate transparency (`crt.sh`). Google gives you the hosts
someone *linked to*, and CT logs give you the ones that got a certificate.

### 2. Directory listings and exposed files

```text
site:example.com intitle:"index of"
site:example.com intitle:"index of" "parent directory" backup
site:example.com intitle:"index of" ".git"
site:example.com intitle:"index of" "wp-content/uploads"
```

### 3. Config files, secrets and keys

```text
site:example.com ext:env | ext:ini | ext:cfg | ext:conf | ext:yml
site:example.com ext:env intext:"DB_PASSWORD"
site:example.com ext:xml intext:"<password>"
site:example.com ext:json intext:"api_key" | intext:"secret"
site:example.com "-----BEGIN RSA PRIVATE KEY-----" | "-----BEGIN OPENSSH PRIVATE KEY-----"
site:example.com ext:log intext:"password"
```

### 4. Database dumps and backups

```text
site:example.com ext:sql intext:"INSERT INTO"
site:example.com ext:sql | ext:dbf | ext:mdb | ext:sqlite
site:example.com ext:bak | ext:old | ext:backup | ext:swp | ext:zip | ext:tar.gz
site:example.com inurl:backup | inurl:dump
```

### 5. Documents and metadata

```text
site:example.com filetype:pdf "confidential" | "internal use only"
site:example.com filetype:xlsx | filetype:csv intext:"email"
site:example.com filetype:docx | filetype:pptx
site:example.com filetype:pdf after:2025-01-01
```

Download what's in scope and run `exiftool` on it. Author fields, internal
usernames, software versions and printer/share paths come back almost every
time. That's how you work out the username format and build a password-spray
list.

### 6. Login panels and admin interfaces

```text
site:example.com inurl:login | inurl:signin | inurl:admin | intitle:"admin panel"
site:example.com inurl:wp-login.php | inurl:administrator
site:example.com intitle:"phpMyAdmin" | intitle:"Adminer"
site:example.com intitle:"Grafana" | intitle:"Kibana" | intitle:"Jenkins"
site:example.com inurl:"/manager/html"                 # Tomcat manager
```

### 7. Errors and debug pages (stack fingerprinting)

```text
site:example.com intext:"sql syntax near" | intext:"mysql_fetch_array()"
site:example.com intext:"Warning: include(" | intext:"Fatal error:"
site:example.com intitle:"Whoops! There was an error"   # Laravel debug
site:example.com "Traceback (most recent call last)"
site:example.com intext:"phpinfo()" | inurl:phpinfo.php
```

### 8. Third-party leaks (the target isn't the host)

Secrets often live on *someone else's* platform. Drop `site:example.com` and
search for the target's name or domain:

```text
site:trello.com "example.com"
site:pastebin.com | site:ghostbin.co "example.com"
site:github.com | site:gitlab.com "example.com" "password" | "api_key"
site:docs.google.com | site:drive.google.com "example.com"
site:s3.amazonaws.com "example"
site:blob.core.windows.net "example"
site:storage.googleapis.com "example"
site:atlassian.net | site:*.jira.com "example"
site:postman.com "example.com"                         # public Postman workspaces
```

### 9. People and organization recon

```text
site:linkedin.com/in "Example Corp" "security engineer"
"@example.com" -site:example.com                        # email harvesting
site:example.com intext:"@example.com" filetype:pdf
"Example Corp" intitle:"resume" | intitle:"cv"
```

This feeds the social-engineering half of an engagement. If you run phishing
simulations, it shows you what an attacker can learn before they write the
lure.

### 10. Exposed devices (generic, no target)

```text
intitle:"webcamXP 5" | inurl:"view/index.shtml"         # IP cameras
intitle:"RouterOS" inurl:webfig                          # MikroTik
intitle:"index of" "printer"
```

For devices, Google is the slow tool. **Shodan**, **Censys** and **FOFA** index
banners directly. Use Google to find the human-facing pages and those engines
for the services.

## Workflow and tooling

1. **Scope first.** Write down the domains, brands and third parties you're
   allowed to look at.
2. **Go wide, then narrow.** Start with `site:` alone, then add one operator at
   a time. Too many clauses at once and you'll miss things.
3. **Log every query and result URL**, with timestamps. It's evidence, and it
   stops you repeating searches.
4. **Rotate engines.** Google, Bing, DuckDuckGo, Yandex and the Wayback Machine
   (`web.archive.org/web/*/example.com/*`) all hold different data.
5. **Expect CAPTCHAs.** Google rate-limits heavy dorking. For volume, use the
   **Programmable Search Engine API** rather than scraping.

Tools worth knowing: the **GHDB** on Exploit-DB, `pagodo` (automates GHDB
queries via the API), `theHarvester` (emails/subdomains across engines),
`waybackurls`/`gau` (historical URLs), and `exiftool`.

## Defending against dorks

Defenders get the most out of this article from this part. **Dork yourself
before someone else does.**

- **Run the cheatsheet against your own domains** on a schedule. Treat every hit
  as an incident: remove it, rotate anything exposed, and find the root cause.
- **`robots.txt` is not access control.** It asks crawlers politely, and it also
  *advertises* the paths you wanted hidden. Protect with authentication, not
  with robots.
- Use **`X-Robots-Tag: noindex`** (header) or `<meta name="robots"
  content="noindex">` for pages that must be public but shouldn't be indexed.
- **Turn off directory listing** (`Options -Indexes` on Apache, `autoindex off`
  on nginx).
- **Never deploy** `.env`, `.git/`, `*.bak`, `*.sql` or editor swap files to the
  web root. Block them at the server and in CI.
- **Run production with debug off.** Stack traces fingerprint your stack and
  sometimes print credentials.
- **Lock down SaaS defaults.** Public Trello boards, "anyone with the link"
  Google Docs, public Postman workspaces, open buckets. Audit them regularly.
- If something leaked: fix it at the source **first**, then use **Google Search
  Console → Removals** (or Google's outdated-content tool) to purge the cached
  copy. Assume someone already downloaded it and rotate the secrets anyway.
- **Strip metadata** from documents before you publish them.

## When a search query was the attack: real cases

### Bowman Avenue Dam, New York (2013)

The best-known dorking case. Between **August 28 and September 18, 2013**,
Iranian hacker **Hamid Firoozi** repeatedly accessed the SCADA system of the
Bowman Avenue Dam, a small flood-control dam in Rye Brook, NY. According to
reporting on the investigation, he **found the system through Google dorking**:
targeted searches that surfaced an internet-exposed control interface. A sluice
gate happened to be offline for maintenance, so he couldn't operate it, but he
could read water levels, temperature and gate status.

In **March 2016** the U.S. Department of Justice unsealed an indictment against
seven Iranians linked to ITSecTeam and Mersad. It covered the dam intrusion and
a DDoS campaign against U.S. banks. These were the first U.S. criminal charges
against hackers tied to the Iranian government. The lesson: no zero-day was
involved. The first step was a search engine and an operational-technology
interface that should never have been reachable from the internet.

### FBI/DHS "Google dorking" bulletin (2014)

On **July 7, 2014**, the FBI, DHS and the National Counterterrorism Center sent
law enforcement and security personnel a FOUO bulletin warning that
*"malicious cyber actors"* were using advanced search operators to find
sensitive data and vulnerable websites. It recommended that organizations audit
their exposure, using tools like the GHDB. People criticized the wording, since
search operators are legal and every pentester uses them. Still, the bulletin
showed the technique had moved from a hobbyist trick to something the federal
government was formally warning about. The dam case later showed why.

### Public Trello boards: UN and UK/Canadian governments (2018) and more (2020)

In **2018**, researcher **Kushagra Pathak** used Google searches limited to
`trello.com` to find public Trello boards. Google indexes them as ordinary web
pages. On those boards he found credentials for a **United Nations** file
server, an internal conferencing system and a web development platform, across
about 60 UN-linked boards. In a separate search he found around 50 boards from
the **UK and Canadian governments** with passwords and internal security
information. The Intercept reported the findings, and the organizations
responded.

In **January 2020**, Craig Jones (with coverage from Sophos) ran the same kind
of search and found more public boards with personal data, bank details and
credentials. The root cause was the same: users switched boards from the
private default to public, Google indexed them, and one query listed them all.
This case is why *section 8* of the cheatsheet exists.

### The NSA's own dorking manual (released 2013)

This one is a technique rather than a breach. The NSA's internal research guide
*Untangling the Web* had a full chapter on Google hacking: finding Excel files
and internal documents on foreign sites with `filetype:` and `site:` operators.
It became public in **2013** through a FOIA request. If an intelligence agency
trained its analysts on these operators, that tells you how much information
sits in search indexes.

### And every bug bounty program, every week

Most dorking successes never make the news. Bounty hunters regularly report
exposed `.env` files, open `.git/` directories, Swagger UIs listing internal
endpoints, debug pages that leak keys, and staging environments, all found with
queries from the sections above. Programs pay for them because a criminal would
find the same results with the same search.

## Takeaways

- **Dorking is passive recon with a high hit rate.** It's the cheapest step in
  any engagement, so it should always be the first.
- **Operators stack.** `site:` + `ext:` + `intext:` beats any single clause.
- **The target often isn't the host.** Trello, GitHub, Postman, Docs and
  buckets leak more than corporate web servers do.
- **Defenders: dork yourselves on a schedule.** The Bowman Avenue Dam and the
  Trello boards weren't sophisticated attacks. Something private was
  publicly indexed, and someone searched for it.

> `giuskywalker@death-star:~$ echo "if Google can see it, so can the Empire"`
