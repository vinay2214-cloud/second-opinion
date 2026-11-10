// node tools/validate-cases.js  -> validates data/cases.seed.json (use after any agent edits the pool).
import { loadCases } from '../src/data.js';
import { validateCases } from '../src/validate.js';

const problems = validateCases(loadCases());
if (problems.length) {
  console.error('INVALID:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('cases.seed.json is valid');
