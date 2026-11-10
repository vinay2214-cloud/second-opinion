// The only place in the scene lane that reads the wall clock (owner decision,
// 10 Nov 2026). It turns "today" into the YYYY-MM-DD string that
// src/persist/history.ts needs for the streak. Never used for game logic.
export function localDate(): string {
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}
