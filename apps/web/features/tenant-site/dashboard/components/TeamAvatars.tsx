import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TeamMember {
  initials: string;
  name: string;
  role: string;
  color: string;
}

interface TeamAvatarsProps {
  team: TeamMember[];
}

export function TeamAvatars({ team }: TeamAvatarsProps) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {team.map((member) => (
        <div key={member.initials} className="flex items-center gap-2">
          <Avatar className="h-6.5 w-6.5">
            <AvatarFallback
              className="text-xs font-semibold"
              style={{ backgroundColor: member.color, color: "#fff" }}
            >
              {member.initials}
            </AvatarFallback>
          </Avatar>
          <div className="text-xs">
            <div className="font-medium">{member.name}</div>
            <div style={{ color: "var(--ink-4)" }} className="mono text-xs">
              {member.role}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
