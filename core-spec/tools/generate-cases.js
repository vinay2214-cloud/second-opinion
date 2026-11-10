// node tools/generate-cases.js [seed]  -> writes ../data/cases.seed.json after validating.
import { writeFileSync } from 'node:fs';
import { generateCases } from '../src/generator.js';
import { validateCases } from '../src/validate.js';

const seed = process.argv[2] ?? 'second-opinion-v1';
const cases = generateCases({ seed });
const problems = validateCases(cases);
if (problems.length) {
  console.error('VALIDATION FAILED:\n' + problems.join('\n'));
  process.exit(1);
}
const out = new URL('../../data/cases.seed.json', import.meta.url);
writeFileSync(out, JSON.stringify(cases, null, 2) + '\n');
console.log(`wrote ${cases.length} cases (seed "${seed}") to data/cases.seed.json`);
