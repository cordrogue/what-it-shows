<script lang="ts">
  // What #4471 really holds: one row per problem, counted from the export at render time.
  // causes.ts places each report by its tenant (parser / hint); the desk's one-day moves
  // (desk-notes.json) are a third problem that causes.ts files under its tenant's cause.
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { causeOf, uniqueById, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';

  type Problem = 'parser' | 'hint' | 'shift' | 'unplaced';
  type Row = { problem: Problem; what: string; href?: string };

  let {
    ticket,
    tickets = {},
  }: { ticket: number; tickets?: Partial<Record<Problem, string>> } = $props();

  const WHAT: Record<Problem, string> = {
    parser: 'Shared parser reads day-first dates month first',
    hint: 'booking-v3 form hint says MM/DD/YYYY to day-first tenants',
    shift: 'Dates shown one day early (time zone)',
    unplaced: 'No tenant on file: not placed',
  };

  const shiftIds = new Set<string>(notes.oneDayMove);
  const problemOf = (r: Report): Problem =>
    shiftIds.has(r.id) ? 'shift' : (causeOf(r, tenantOf(r)) ?? 'unplaced');

  const rows = $derived.by(() => {
    const all = (reports as Report[]).filter((r) => r.mergedInto === ticket);
    const merged = uniqueById(all);
    const by = new Map<Problem, Report[]>();
    for (const r of merged) by.set(problemOf(r), [...(by.get(problemOf(r)) ?? []), r]);
    const groups = [...by.entries()]
      .map(([problem, rs]) => {
        const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
        return {
          problem,
          what: WHAT[problem],
          href: tickets[problem],
          count: rs.length,
          tenants: new Set(rs.map((r) => r.tenant)).size,
          firstSeen: days[0],
          lastSeen: days[days.length - 1],
          intakeAgrees: rs.filter((r) => r.meta.intakeTag === problem).length,
        };
      })
      .sort((a, b) => b.count - a.count);
    return { rowsInExport: all.length, merged: merged.length, groups };
  });

  const ticketNo = (href?: string) => href?.match(/\/issues\/(\d+)/)?.[1];
</script>

<p class="sum">
  <strong>{rows.merged}</strong> reports merged into #{ticket}
  ({rows.rowsInExport - rows.merged} repeated rows in the export dropped) ·
  <strong>{rows.groups.length}</strong> {rows.groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>seen</th><th>intake tag agrees</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each rows.groups as g (g.problem)}
      <tr>
        <td><code>{g.problem}</code> {g.what}</td>
        <td><strong>{g.count}</strong></td>
        <td>{g.tenants}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td>{g.intakeAgrees} of {g.count}</td>
        <td>
          {#if g.href}<a href={g.href}>#{ticketNo(g.href) ?? 'ticket'}</a>{:else}<span class="none">no ticket</span>{/if}
        </td>
      </tr>
    {/each}
  </tbody>
  <tfoot>
    <tr><td>total</td><td><strong>{rows.groups.reduce((n, g) => n + g.count, 0)}</strong></td><td colspan="4"></td></tr>
  </tfoot>
</table>

<style>
  .sum { font-size: 1.1rem; }
  .none { color: var(--warn); font-weight: 600; }
  tfoot td { border-top: 2px solid var(--line); }
</style>
