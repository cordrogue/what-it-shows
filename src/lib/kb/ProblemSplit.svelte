<script lang="ts">
  // What #4471 really holds: one row per problem, counted from the export at render time,
  // the desk's way. causes.ts places each report by its tenant (parser / hint), as the
  // #4471 cause table does. The desk's one-day moves (desk-notes.json) are a problem of their
  // own; like the cause table, they stay counted where they are filed and show as a row under it.
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { groupByCause, readAs, uniqueById, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';

  type Problem = 'parser' | 'hint' | 'shift' | 'unplaced';
  type Outcome = { state: 'fixed' | 'wontfix' | 'open'; note: string };

  let {
    ticket,
    tickets = {},
    outcomes = {},
  }: {
    ticket: number;
    tickets?: Partial<Record<Problem, string>>;
    outcomes?: Partial<Record<Problem, Outcome>>;
  } = $props();

  const WHAT: Record<Problem, string> = {
    parser: 'Shared parser reads day-first dates month first',
    hint: 'booking-v3 form hint says MM/DD/YYYY to day-first tenants',
    shift: 'Dates shown one day early (time zone)',
    unplaced: 'No tenant on file: not placed',
  };
  const STATE = { fixed: 'fixed', wontfix: "won't fix", open: 'open' } as const;

  const view = $derived.by(() => {
    const all = (reports as Report[]).filter((r) => r.mergedInto === ticket);
    const merged = uniqueById(all);
    const groups = groupByCause(merged, tenantOf);
    const rows = groups.flatMap((g) => {
      const row = { problem: g.cause as Problem, count: g.reports.length, tenants: g.tenants, firstSeen: g.firstSeen, lastSeen: g.lastSeen, within: null as Problem | null };
      const moved = g.reports.filter((r) => notes.oneDayMove.includes(r.id));
      if (!moved.length) return [row];
      const days = moved.map((r) => r.receivedAt.slice(0, 10)).sort();
      return [
        row,
        { problem: 'shift' as Problem, count: readAs(g, notes.oneDayMove), tenants: new Set(moved.map((r) => r.tenant)).size, firstSeen: days[0], lastSeen: days[days.length - 1], within: g.cause as Problem },
      ];
    });
    return { rowsInExport: all.length, merged: merged.length, total: groups.reduce((n, g) => n + g.reports.length, 0), rows };
  });

  const ticketNo = (href?: string) => href?.match(/\/issues\/(\d+)/)?.[1];
</script>

<p class="sum">
  <strong>{view.merged}</strong> reports merged into #{ticket}
  ({view.rowsInExport - view.merged} repeated rows in the export dropped) ·
  <strong>{view.rows.length}</strong> {view.rows.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>seen</th><th>ticket</th><th>now</th></tr>
  </thead>
  <tbody>
    {#each view.rows as r (r.problem)}
      {@const o = outcomes[r.problem]}
      <tr class:sub={r.within}>
        <td>
          <code>{r.problem}</code> {WHAT[r.problem]}
          {#if r.within}<br /><small>counted inside <code>{r.within}</code>, where the desk filed them</small>{/if}
        </td>
        <td><strong>{r.count}</strong></td>
        <td>{r.tenants}</td>
        <td>{r.firstSeen} → {r.lastSeen}</td>
        <td>
          {#if tickets[r.problem]}<a href={tickets[r.problem]}>#{ticketNo(tickets[r.problem]) ?? 'ticket'}</a>{:else}<span class="warn">no ticket</span>{/if}
        </td>
        <td>
          {#if o}<span class="state {o.state}">{STATE[o.state]}</span> <small>{o.note}</small>{:else}<span class="warn">unknown</span>{/if}
        </td>
      </tr>
    {/each}
  </tbody>
  <tfoot>
    <tr><td>total in #{ticket}</td><td><strong>{view.total}</strong></td><td colspan="4"></td></tr>
  </tfoot>
</table>

<style>
  .sum { font-size: 1.1rem; }
  .warn { color: var(--warn); font-weight: 600; }
  .sub td:first-child { padding-left: 1.5rem; }
  small { color: var(--muted); }
  .state { border: 1px solid var(--line); border-radius: 99px; padding: 0 0.5rem; font-size: 0.85em; white-space: nowrap; }
  .state.fixed { color: var(--accent); border-color: var(--accent); }
  .state.open { color: var(--warn); border-color: var(--warn); font-weight: 600; }
  tfoot td { border-top: 2px solid var(--line); }
</style>
