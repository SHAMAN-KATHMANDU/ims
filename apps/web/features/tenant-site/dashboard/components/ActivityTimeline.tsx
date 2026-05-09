interface ActivityTimelineProps {
  activities: Array<{
    who: string;
    what: string;
    target: string;
    time: string;
  }>;
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <div className="space-y-0 p-1">
      {activities.map((activity, i) => (
        <div key={i} className="flex gap-2.5 px-3 py-2 text-xs">
          <div className="relative flex-shrink-0 pt-1">
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--ink-4)" }}
            />
            {i < activities.length - 1 && (
              <div
                className="absolute left-[2.5px] top-3.5 w-px"
                style={{
                  height: "calc(100% + 20px)",
                  background: "var(--line)",
                }}
              />
            )}
          </div>
          <div className="flex-1 leading-relaxed">
            <span className="font-semibold">{activity.who}</span>{" "}
            <span style={{ color: "var(--ink-3)" }}>{activity.what}</span>{" "}
            {activity.target}
            <div
              className="mono mt-0.5 text-xs"
              style={{ color: "var(--ink-4)" }}
            >
              {activity.time} ago
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
