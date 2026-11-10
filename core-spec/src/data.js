// Loads the JSON data files. In the IWSDK app, import the JSON directly (Vite handles it).
import { readFileSync } from 'node:fs';

const dataDir = new URL('../../data/', import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, dataDir), 'utf8'));

export const rubric = load('triage-rubric.json');
export const advisorData = load('advisors.json');
export const shiftConfig = load('shift-config.json');
export const caseTemplates = load('case-templates.json');
export const debriefLines = load('debrief-lines.json');
export const coachConfig = load('coach-prompt.json');
export const loadCases = () => load('cases.seed.json');
