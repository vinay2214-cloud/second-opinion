// JSON imports are shared by the browser build and the test runner.
import rubricJson from '../../data/triage-rubric.json';
import advisorJson from '../../data/advisors.json';
import shiftJson from '../../data/shift-config.json';
import templatesJson from '../../data/case-templates.json';
import debriefJson from '../../data/debrief-lines.json';
import coachJson from '../../data/coach-prompt.json';
import casesJson from '../../data/cases.seed.json';
import type { Advisor, AdvisorId, Band, Case, Category, CategoryConfig, ModuleId, Vital, Zone } from './types.js';

// JSON string literals/tuples are widened by the importer; narrow only at this data boundary.
export const rubric = rubricJson as unknown as Omit<typeof rubricJson, 'zones' | 'bands' | 'flags'> & {
  zones: Zone[];
  bands: Record<Vital, Record<'adult' | 'child', Band[]>>;
  flags: Record<string, { points: number; label: string }>;
};
export const advisorData = advisorJson as Omit<typeof advisorJson, 'categories' | 'advisors'> & {
  categories: Category[];
  advisors: Record<AdvisorId, Advisor>;
};
export const shiftConfig = shiftJson as Omit<typeof shiftJson, 'lineups' | 'modules'> & {
  lineups: Record<ModuleId, AdvisorId[]>;
  modules: Record<ModuleId, { driftEnabled: boolean; tokens: number | null; patients: number; surgeIndices: number[] }>;
};
export const caseTemplates = templatesJson as Omit<typeof templatesJson, 'categories'> & {
  categories: Record<Category, CategoryConfig>;
};
export const debriefLines = debriefJson;
export const coachConfig = coachJson;
// The reference parses fresh data on each call. Preserve that ownership contract.
export const loadCases = (): Case[] => JSON.parse(JSON.stringify(casesJson)) as Case[];
