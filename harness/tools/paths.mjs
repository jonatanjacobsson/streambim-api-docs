// Repository locations used by the tools, independent of the current working directory.
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const WIDGET_DOCS = join(REPO_ROOT, 'widget');
export const VERIFICATION = join(WIDGET_DOCS, 'verification');
