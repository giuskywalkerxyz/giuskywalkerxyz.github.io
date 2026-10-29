---
title: "CWL API RTA — a webshop that published its own signing key"
date: 2026-10-29T03:30:00
tags: ["api", "red-team", "jwt", "idor", "bola", "bfla", "ssrf", "sqli", "aws", "cwl", "certification"]
summary: "The API Red Team exam, written up defender-first: a JWKS endpoint that leaked the HS256 secret, token forging into IDOR and role escalation, client-trusted pricing, a Lambda /debug that dumped the cloud, an SSRF-into-S3 object read, and a UNION SQLi for the rest. Sanitised — live card number, gift-card code and secret stay out."
draft: false
---

> `giuskywalker@death-star:~$ cat ./notes/cwl-api-rta.md`

CWL's **API RTA** is one target — **VulnCart**, a Flask webshop with an "Ask AI"-free,
old-fashioned REST API — and a scavenger hunt of answers hidden behind the API's
own trust assumptions. No single flag; you pull a credit card, a gift-card code,
and a pile of AWS facts out of an environment that trusts the client far too much.
It's the OWASP API Top 10, live, and it pairs nicely with the cloud-pivot muscle
from the [AI RTA box](/articles/cwl-ai-rta/).

> **Scope.** Authorised engagement on a certification lab I hold a seat in.
> **Sanitised and defender-first**: the live card number, the gift-card code and the
> literal signing secret are redacted; the mechanism is the teaching value, and
> every stage ends with the fix.

## The chain

```
GET /  → JWT cookie (HS256)           ← anonymous session token
GET /.well-known/jwks.json            ← leaks the HS256 secret as an "oct" key
  → forge any token:
      user_id swap   → IDOR  (read any account / orders)
      role: admin    → BFLA  (unlock hidden product id 1337)
POST /orders {price, discount}        ← client-trusted pricing (discount capped 90%)
order response → Lambda Function URL  → GET /debug  (account id, bucket, env)
Lambda ?path=  → arbitrary S3 GetObject → payments/credit_card.json  (SSRF→S3)
GET /products/search?name='…          ← UNION SQLi → giftcards table
```

## 1. The front door hands you the key

The root sets a `vulncart_token` cookie — a **HS256** JWT:
`{"user_id":0,"role":"anonymous","scope":["products:read","wallet:read","orders:read"]}`.

Symmetric signing means *the verify key is the sign key*. And the app publishes a
key set at **`/.well-known/jwks.json`** — but instead of an RSA public key, it
serves an **`oct`** (symmetric) entry whose `k` base64url-decodes straight to the
HMAC secret: **`vulncart-user-****`** (redacted). Game over before authentication
even starts.

> **Fix.** JWKS is for **asymmetric public** keys. Never put an HMAC secret in it —
> never expose it anywhere. If you're on HS256, the secret is a server-only
> credential; better yet, move to RS256/EdDSA so the published key genuinely is public.

## 2. Forge → IDOR (BOLA) and role escalation (BFLA)

With the secret I can mint arbitrary tokens. Two bugs fall out of the same primitive:

- **IDOR / BOLA** — the API derives "who you are" from the token's `user_id`.
  Forge `user_id: <victim>` and `GET /api/v1/users/me` and `/orders` return *their*
  balance, email and order history. No per-object ownership check.
- **BFLA** — authorisation for privileged actions reads the token's `role` claim.
  Anonymous gets `403` adding the hidden product (`id 1337`, "Hack Me Not") to the
  cart; a forged `role: admin` returns `{"status":"added"}`. Role is client-controlled.

> **Fix.** Authorise every object access against the **authenticated session**, not
> an ID in the request, and enforce function-level roles **server-side** from
> trusted state — never from a claim the client can rewrite. (Both collapse the
> moment the signing key leaks, so stage 1 is the real root cause.)

## 3. Client-trusted pricing

Checkout is `POST /api/v1/orders` with `price` and `discount_percentage` **in the
request body**. The server honours the client's `price` (so raw price tampering is
unbounded), and applies the discount with a single guard: it's **capped at 90 %**.
The hidden product's real price is **1000**, so the lowest a straight discount can
take it is **100** (`1000 × 0.10`). That 100 is not a coincidence — see stage 6.

> **Fix.** Price is server state. Look it up by `product_id`; never accept a
> client-supplied price or an uncapped/trusted discount. Compute totals server-side.

## 4. The order points at a Lambda — which debugs itself

Every order response carries an `order_status` URL:
`https://<id>.lambda-url.ap-south-1.on.aws/fetch_order_status` — an **AWS Lambda
Function URL** (so: *Order Status is hosted on AWS Lambda*). The function has a
second route, **`/debug`**, that returns its whole world:

```json
{ "aws_account_id": "3671********", "bucket_name": "api-rta-exam-bucket-********",
  "lambda_arn": "arn:aws:lambda:ap-south-1:3671********:function:API-RTA-Exam-Lab",
  "environment_variables": { … "AWS_SESSION_TOKEN": "IQoJ…", … } }
```

Account ID, the backing S3 bucket, and the runtime environment — including a live
session token — handed over unauthenticated.

> **Fix.** Ship debug routes to `/dev/null` in production. A function URL is public
> by default; everything behind it needs auth, and credentials/ARNs never belong in
> a response body.

## 5. SSRF-into-S3: arbitrary object read

`fetch_order_status` takes a **`path`** parameter and does `s3:GetObject(bucket, path)`,
parsing the result as JSON. The default is `orders/order_status.json`; swap it and
you read **any object in the bucket**. NoSuchKey vs. valid-JSON errors make blind
enumeration easy. `payments/credit_card.json` gives up the target:

```
cardholder "Sherlock Holmes", 4367 **** **** ****, VISA, 221B Baker Street
```

(The Flask app also fetches this Lambda via `GET /orders/track?callback=` — a
**server-side request** gated by a domain allow-list. That's the SSRF the exam names;
the Lambda's `path` is the exploitable, un-gated cousin that turns it into object read.)

> **Fix.** Treat a path/URL that crosses a trust boundary as hostile input. Bind the
> object key to the authenticated request (an order the caller owns), don't let the
> client choose arbitrary keys, and scope the Lambda's IAM role to exactly the prefix
> it needs — least privilege, not `GetObject *`.

## 6. UNION SQLi for the rest

Not everything lives in S3. `GET /api/v1/products/search?name=` concatenates input
into a SQL string — a single quote 500s, and `' OR '1'='1` leaks the hidden product.
Three columns, SQLite 3.37.x, so classic UNION extraction:

```sql
zzz' UNION SELECT 1, group_concat(name), 3 FROM sqlite_master WHERE type='table'-- -
→ users, products, orders, giftcards, giftcard_redemptions, cart
```

The `giftcards` table (`code, value, redeemed`) yields a code worth exactly **100** —
the same 100 the capped discount leaves on the hidden product. The intended "lowest
purchase" is *buy it down to 100, then zero it with the gift card.* `users` and
`orders` are fully readable too, a second path to everything in stage 2.

> **Fix.** Parameterised queries, always. One `?` placeholder kills this whole
> section — and with it the second route to the card data.

## Takeaways

- **A symmetric JWT secret is a secret.** Publishing it in JWKS is the single
  mistake that unlocks IDOR *and* role escalation at once. Prefer asymmetric signing
  so "publish the key" is safe by design.
- **The client is not an authority** — not on identity (`user_id`), not on role, not
  on price. Each one re-derived from the request is a vuln.
- **"Internal"/serverless isn't a boundary.** A public Lambda URL with a `/debug`
  route and a client-controlled S3 key is a data-exfil pipeline; scope the IAM role.
- **Two bugs, one secret.** The gift card came from SQLi, the card from SSRF→S3 —
  defence-in-depth means both layers have to hold, and here neither did.

A tidy OWASP API Top 10 run: **BOLA**, **BFLA**, **SSRF**, broken-property pricing,
secret exposure and SQLi — all downstream of trusting the caller.
