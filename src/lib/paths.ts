import { getCollection } from 'astro:content';

// Shared getStaticPaths bodies so / and /pt-br/ build the same set of pages.
export async function writeupPaths() {
  const pub = await getCollection('writeups', (e) => !e.data.draft);
  const prot = await getCollection('protectedWriteups', (e) => !e.data.draft);
  return [
    ...pub.map((entry) => ({ params: { slug: entry.id }, props: { kind: 'public' as const, entry } })),
    ...prot.map((entry) => ({ params: { slug: entry.id }, props: { kind: 'protected' as const, entry } })),
  ];
}

export async function collectionPaths(name: 'articles' | 'ai' | 'cves') {
  const entries = await getCollection(name, (e: any) => !e.data.draft);
  return entries.map((entry: any) => ({ params: { slug: entry.id }, props: { entry } }));
}
