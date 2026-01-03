// export function CaseCard({ caseId, raw }: { caseId: number; raw: unknown }) {
//   return (
//     <div className="border p-2">
//       <b>#{caseId}</b>
//       <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(raw, (_, v) => typeof v === "bigint" ? String(v) : v, 2)}</pre>
//     </div>
//   );
// }

const L = ["payer", "payee", "amount", "specs", "deliverables", "reviewDeadline", "status"];

export function CaseCard({ caseId, raw }: { caseId: number; raw: readonly unknown[] }) {
  return (
    <div className="border p-2">
      <b>#{caseId}</b>
      {L.map((l, i) => <div key={l} className="text-sm">{l}: {String(raw[i] ?? "")}</div>)}
    </div>
  );
}