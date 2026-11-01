// Reference docs served to agents: the repo's api/ (REST), widget/ (widget API) and openui/ folders.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

// prefix: folder name shown to agents, e.g. 'api' -> paths like 'api/topics.md'.
export function loadDocs(rootDir, prefix = '') {
  const docs = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.md')) {
        const text = readFileSync(p, 'utf8');
        const path = (prefix ? prefix + '/' : '') + relative(rootDir, p).replaceAll('\\', '/');
        const title = (text.match(/^#\s+(.+)$/m) || [, entry.name])[1].trim();
        docs.push({ path, title, text });
      }
    }
  };
  walk(rootDir);
  return docs;
}

/** Naive section-level search: returns the markdown sections that mention every term. */
export function searchDocs(docs, query, { maxResults = 8, maxChars = 1800 } = {}) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = [];
  for (const doc of docs) {
    const sections = doc.text.split(/\n(?=#{2,4}\s)/);
    for (const section of sections) {
      const lower = section.toLowerCase();
      if (!terms.every((t) => lower.includes(t))) continue;
      const score = terms.reduce((s, t) => s + lower.split(t).length - 1, 0) + (/^#{2,4}\s.*/.test(section) && terms.some((t) => section.split('\n')[0].toLowerCase().includes(t)) ? 10 : 0);
      hits.push({ path: doc.path, heading: section.split('\n')[0].replace(/^#+\s*/, ''), score, text: section.slice(0, maxChars) });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, maxResults);
}
