export default function BriefStub({
  searchParams,
}: {
  searchParams: { primary?: string; sub?: string };
}) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold">New request</h1>
      <p className="text-sm text-neutral-600">Step 2 — Brief (Phase 4)</p>
      <pre className="text-xs bg-neutral-50 rounded-xl p-3">
        {JSON.stringify(searchParams, null, 2)}
      </pre>
    </div>
  );
}
