#!/usr/bin/env node
/**
 * encrypt-writeup.mjs — seal an active-machine writeup for publication.
 *
 * HTB policy: writeups for ACTIVE machines may only be published password-protected,
 * and the password MUST be the machine's root flag (so only those who already rooted
 * the box can read it). This script encrypts the writeup body with AES-256-GCM using
 * a key derived from that flag (PBKDF2-SHA256). Only ciphertext is written to the repo.
 *
 * Usage:
 *   WRITEUP_PASSWORD='HTB{...root_flag...}' \
 *     node scripts/encrypt-writeup.mjs --json src/content/protected/<slug>.json \
 *                                      --body protected-src/<slug>.md
 *
 *   # or let it prompt (hidden input), so the flag never lands in your shell history:
 *   node scripts/encrypt-writeup.mjs --json ... --body ...
 *
 * The --json file holds the PUBLIC metadata (machine, difficulty, summary, …) plus a
 * `payload` field, which this script overwrites with the freshly-encrypted body.
 * The --body file (plaintext markdown) must live OUTSIDE git (protected-src/ is gitignored).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pbkdf2Sync, randomBytes, createCipheriv } from 'node:crypto';
import { createInterface } from 'node:readline';

const ITER = 210000;

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const onData = (char) => {
      const c = char + '';
      if (c === '\n' || c === '\r' || c === '\u0004') process.stdin.removeListener('data', onData);
      else process.stdout.write('\x1b[2K\x1b[200D' + question);
    };
    process.stdout.write(question);
    process.stdin.on('data', onData);
    rl.question('', (value) => { rl.close(); process.stdout.write('\n'); resolve(value); });
  });
}

const jsonPath = arg('--json');
const bodyPath = arg('--body');
if (!jsonPath || !bodyPath) {
  console.error('Usage: node scripts/encrypt-writeup.mjs --json <metadata.json> --body <plaintext.md>');
  process.exit(1);
}

const password = process.env.WRITEUP_PASSWORD || (await promptHidden('Root flag (password): '));
if (!password) { console.error('No password provided.'); process.exit(1); }

const meta = JSON.parse(readFileSync(jsonPath, 'utf8'));
const body = readFileSync(bodyPath, 'utf8');

const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, ITER, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const ct = Buffer.concat([cipher.update(body, 'utf8'), cipher.final(), cipher.getAuthTag()]);

meta.payload = {
  v: 1,
  kdf: 'PBKDF2-SHA256',
  iter: ITER,
  cipher: 'AES-256-GCM',
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  ct: ct.toString('base64'),
};

writeFileSync(jsonPath, JSON.stringify(meta, null, 2) + '\n');
console.log(`✓ Sealed ${bodyPath} → ${jsonPath} (${ct.length} bytes ciphertext).`);
console.log('  Commit the .json. Never commit the plaintext body or the flag.');
