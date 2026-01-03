// export function CaseCard({ caseId, raw }: { caseId: number; raw: unknown }) {
//   return (
//     <div className="border p-2">
//       <b>#{caseId}</b>
//       <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(raw, (_, v) => typeof v === "bigint" ? String(v) : v, 2)}</pre>
//     </div>
//   );
// }

const L = ["payer", "payee", "amount", "specs", "deliverables", "reviewDeadline"];
const STATUS = ["Funded", "Submitted", "Disputed", "Resolved"];


export function CaseCard({ caseId, raw }: { caseId: number; raw: readonly unknown[] }) {
  return (
    <div className="border p-2">
      <b>#{caseId}</b>
      <div className="uppercase  text-gray-500">Status: {STATUS[Number(raw[6] ?? 0)]}</div>
      {L.map((l, i) => <div key={l} className="text-sm">{l}: {String(raw[i] ?? "")}</div>)}
    </div>
  );
}