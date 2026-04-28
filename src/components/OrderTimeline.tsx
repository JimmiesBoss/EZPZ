interface TimelineEntry {
  at: string;
  event: string;
  actorId?: string;
}

export default function OrderTimeline({ timelineJson }: { timelineJson: string }) {
  let entries: TimelineEntry[] = [];
  try {
    const parsed = JSON.parse(timelineJson);
    if (Array.isArray(parsed)) entries = parsed;
  } catch {
    /* ignore */
  }
  if (entries.length === 0) {
    return <p className="text-sm text-neutral-500">No activity yet.</p>;
  }
  return (
    <ol className="flex flex-col gap-2 text-sm">
      {entries.map((e, i) => (
        <li key={i} className="flex justify-between gap-2">
          <span className="font-medium">{e.event.replace(/_/g, " ").toLowerCase()}</span>
          <span className="text-neutral-500 text-xs">{new Date(e.at).toLocaleString()}</span>
        </li>
      ))}
    </ol>
  );
}
