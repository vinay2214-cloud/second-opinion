/** Shared domain shapes. Tuning values are imported from data/, never repeated here. */
export type Zone = 'green' | 'amber' | 'red';
export type AgeBand = 'adult' | 'senior' | 'child';
export type Category = 'cardiac' | 'breathing' | 'injury' | 'children' | 'infection';
export type AdvisorId = 'dash' | 'sage' | 'ledger' | 'orator' | 'echo';
export type ModuleId = 'module1' | 'module2' | 'module3';
export type Vital = 'pulse' | 'sbp' | 'spo2' | 'temp';
export type Direction = 'low' | 'high' | 'normal';
export type Difficulty = 1 | 2 | 3;
export type Band = [number, number, number];
export type Vitals = Record<Vital, number> & { dbp: number };
export interface TriageResult {
  score: number;
  zone: Zone;
  difficulty: Difficulty;
  parts: Array<{ label: string; points: number }>;
}
export interface Case {
  id: string;
  category: Category;
  ageBand: AgeBand;
  complaint: string;
  flags: string[];
  vitals: Vitals;
  score: number;
  truthZone: Zone;
  difficulty: Difficulty;
  whyLine: string;
}
export interface Advisor {
  name: string;
  style: string;
  reliability: Record<Category, number>;
  errorMode?: 'adjacent' | 'upgrade';
  redFloor?: number;
  mirror?: boolean;
  eloquent?: boolean;
  statedConfidence: 'medium' | 'high' | 'very_high';
  lines: string[];
}
export interface Advice {
  advisorId: AdvisorId;
  call: Zone;
  correct: boolean;
  statedConfidence: Advisor['statedConfidence'];
  line: string;
}
export type PublicAdvice = Omit<Advice, 'correct'>;
export interface Drift {
  advisorId: AdvisorId;
  category: Category | '*';
  delta: number;
  atIndex: number;
}
export interface Patient {
  index: number;
  caseId: string;
  case: Case;
  arrivalSec: number;
  windowSec: number;
  surge: boolean;
  leadAdvisor: AdvisorId;
  advice: Partial<Record<AdvisorId, Advice>>;
}
export interface Shift {
  seed: string;
  module: ModuleId;
  lineup: AdvisorId[];
  tokens: number | null;
  drift: Drift | null;
  patients: Patient[];
  hardCapSeconds: number;
  estimatedEndSec: number;
}
export type Reliance = 'agree' | 'switch-right' | 'hold-right' | 'switch-wrong' | 'hold-wrong' | 'both-wrong' | 'other';
export interface RelianceInput {
  commit: Zone | null;
  advice: Zone;
  final: Zone;
  truth: Zone;
}
export interface OutcomeInput {
  final: Zone;
  truth: Zone;
  msToCommit?: number | null;
  missed?: boolean;
}
export interface DebriefEntry extends RelianceInput {
  index: number;
  category: Category;
  advisorId: AdvisorId;
  reliance: Reliance;
  surge?: boolean;
  missed?: boolean;
}
export interface LogEntry extends DebriefEntry {
  caseId: string;
  msToCommit: number | null;
  surge: boolean;
  missed: boolean;
  usedVerify: boolean;
  delta: number;
}
export interface VerifyOutcome {
  revealedDisagreement?: boolean;
  fixedWrongCall?: boolean;
}
export interface VerifyEvent extends VerifyOutcome {
  index: number;
  advisorId: AdvisorId;
  revealedDisagreement: boolean;
  fixedWrongCall: boolean;
}
export interface Score { outcome: number; restraint: number; total: number }
export interface Calibration {
  counts: Record<Reliance, number>;
  scorable: number;
  index: number | null;
  overRelianceRate: number | null;
  underRelianceRate: number | null;
}
export interface TrustRow {
  advisorId: AdvisorId;
  category: Category;
  disagreements: number;
  followed: number;
  adviceRight: number;
  followRate: number;
  adviceAccuracy: number;
}
export type HeadlineKey = 'notEnough' | 'mixed' | 'overReliance' | 'underReliance' | 'balanced';
export interface Debrief extends Calibration {
  verifyYield: number | null;
  drift: { detected: boolean; affected: number; held: number } | null;
  headlineKey: HeadlineKey;
  headline: string;
  findings: string[];
  nextStep: string;
}
export interface DebriefOptions {
  entries: readonly DebriefEntry[];
  shift?: { drift: Omit<Drift, 'delta'> | null } | null;
  verifyEvents?: readonly VerifyOutcome[];
  advisorNames?: Partial<Record<AdvisorId, string>>;
}
export interface Resolution {
  truth: Zone;
  whyLine: string;
  delta: number;
  reliance: Reliance;
}
export type PatientStatus = 'pending' | 'arrived' | 'committed' | 'resolved';
export interface PublicView {
  index: number;
  status: PatientStatus;
  surge: boolean;
  arrivalSec: number;
  windowSec: number;
  case: Pick<Case, 'id' | 'ageBand' | 'complaint' | 'vitals' | 'category'>;
  leadAdvisor: AdvisorId;
  commit: Zone | null;
  lead?: PublicAdvice;
  verified?: Array<Pick<PublicAdvice, 'advisorId' | 'call' | 'line'>>;
  result?: Resolution;
}
export type RuntimeEvent =
  | { type: 'arrive'; index: number }
  | ({ type: 'resolved'; index: number; missed: boolean } & Resolution)
  | { type: 'shiftEnd' };
// An absent patient yields undefined in the reference commit guard.
export interface Failure { ok: false | undefined; reason: string }
export type CommitResult = { ok: true; lead: PublicAdvice } | (Failure & { lead?: never });
export type VerifyResult = { ok: true; advice: PublicAdvice; tokens: number } | Failure;
export type FinalizeResult = { ok: true; result: Resolution } | Failure;
export interface Summary {
  entries: LogEntry[];
  score: Score;
  tokensLeft: number;
  debrief: Debrief;
}
export interface RuntimeOptions {
  shift: Shift;
  advisorNames?: Partial<Record<AdvisorId, string>>;
  calm?: boolean;
}
export interface ShiftRuntime {
  start(nowMs: number): RuntimeEvent[];
  tick(nowMs: number): RuntimeEvent[];
  commit(i: number, zone: Zone, nowMs: number): CommitResult;
  verify(i: number, advisorId: AdvisorId, nowMs: number): VerifyResult;
  finalize(i: number, zone: Zone, nowMs: number): FinalizeResult;
  publicView(i: number): PublicView;
  availableVerifiers(i: number): AdvisorId[];
  driftCue(nowMs: number): { advisorId: AdvisorId; text: string } | null;
  readonly tokens: number;
  readonly ended: boolean;
  elapsedSec(nowMs: number): number;
  remainingSec(nowMs: number): number;
  log(): LogEntry[];
  score(): Score;
  summary(): Summary;
}
export interface CalendarValue {
  getFullYear(): number;
  getMonth(): number;
  getDate(): number;
}
export type VitalRule = 'normal' | 'any' | 'mild' | { dir: Direction; min?: number; max?: number };
export type VitalRules = Partial<Record<Vital, VitalRule>>;
export interface CaseTemplate { text: string; flags: string[]; zones: Zone[]; vitalRules?: VitalRules }
export interface CategoryConfig { ageBands: AgeBand[]; defaultVitalRules?: VitalRules; templates: CaseTemplate[] }
