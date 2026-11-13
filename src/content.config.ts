import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writeups = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writeups' }),
  schema: z.object({
    title: z.string(),
    machine: z.string(),
    platform: z.string().default('HackTheBox'),
    difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Insane']),
    os: z.string(),
    season: z.string().optional(),
    points: z.number().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    summary: z.string(),
    repo: z.string().url().optional(),
    draft: z.boolean().default(false),
  }),
});

// Active-season machines: public metadata + an encrypted body (sealed with the root flag).
// Only ciphertext lives here; plaintext stays in protected-src/ (gitignored).
const protectedWriteups = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/protected' }),
  schema: z.object({
    title: z.string(),
    machine: z.string(),
    platform: z.string().default('HackTheBox'),
    difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Insane']),
    os: z.string(),
    season: z.string().optional(),
    points: z.number().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    summary: z.string(),
    draft: z.boolean().default(false),
    payload: z.object({
      v: z.number(),
      kdf: z.string(),
      iter: z.number(),
      cipher: z.string(),
      salt: z.string(),
      iv: z.string(),
      ct: z.string(),
    }),
  }),
});

// AI / LLM security CTF writeups (agent exploitation) — separate from HTB boxes.
const ai = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/ai' }),
  schema: z.object({
    title: z.string(),
    platform: z.string().default('Arkx'),
    track: z.string(),            // Advanced | Expert | ...
    level: z.string(),            // e.g. "Level 7"
    vuln: z.string(),             // vulnerability class
    severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
    flag: z.string().optional(),
    owasp: z.array(z.string()).default([]),
    atlas: z.array(z.string()).default([]),
    image: z.string().optional(),
    order: z.number().default(99),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    summary: z.string(),
    repo: z.string().url().optional(),
    draft: z.boolean().default(false),
  }),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    summary: z.string(),
    draft: z.boolean().default(false),
  }),
});

const certifications = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/certifications' }),
  schema: z.object({
    code: z.string(),
    name: z.string(),
    issuer: z.string(),
    track: z.string(),
    status: z.enum(['earned', 'in-progress']).default('earned'),
    issued: z.coerce.date().optional(),
    expires: z.coerce.date().optional(),
    credentialId: z.string().optional(),
    verifyUrl: z.string().url().optional(),
    skills: z.array(z.string()).default([]),
    summary: z.string(),
    order: z.number().default(99),
  }),
});

export const collections = { writeups, protectedWriteups, articles, certifications, ai };
