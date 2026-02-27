---
name: continuous-learning-v2
description: Instinct-based learning via PreToolUse/PostToolUse hooks — confidence scoring, pattern detection, /instinct-status and /evolve commands for evolving AI behavior over time.
origin: ECC
---

# Continuous Learning v2

An advanced instinct-based learning system that evolves AI behavior based on observed patterns and outcomes.

## When to Activate

- Setting up automated learning for a long-running project
- When you want AI behavior to improve over time without manual skill updates
- After noticing repeated patterns that should become automatic
- When building a feedback loop for AI-assisted development

## Core Concept

Instead of manually writing skills after sessions (v1), v2 uses hooks to automatically detect patterns and build "instincts" — probabilistic rules that activate based on confidence scores.

```
Tool call happens
    ↓
PreToolUse hook: Should I apply an instinct here?
    ↓
Action taken
    ↓
PostToolUse hook: Did the instinct help or hurt?
    ↓
Confidence score updated
    ↓
Instinct strengthened or weakened
```

## Instinct Structure

```typescript
interface Instinct {
  id: string;
  name: string;
  trigger: {
    tool: string;           // Which tool triggers this
    pattern: string;        // Pattern in the input
    context?: string;       // Additional context
  };
  action: string;           // What to do when triggered
  confidence: number;       // 0.0 to 1.0
  activations: number;      // Times triggered
  successes: number;        // Times it helped
  failures: number;         // Times it hurt
  createdAt: string;
  lastActivated: string;
}
```

## Confidence Scoring

```typescript
// Confidence thresholds
const THRESHOLDS = {
  SUPPRESS: 0.2,    // Below this: never activate
  SUGGEST: 0.5,     // Above this: suggest as option
  AUTO: 0.8,        // Above this: activate automatically
  PROMOTE: 0.9,     // Above this: promote to permanent skill
};

// Update confidence after outcome
function updateConfidence(instinct: Instinct, success: boolean): Instinct {
  const weight = 0.1; // Learning rate
  const outcome = success ? 1 : 0;
  const newConfidence = instinct.confidence * (1 - weight) + outcome * weight;

  return {
    ...instinct,
    confidence: newConfidence,
    activations: instinct.activations + 1,
    successes: success ? instinct.successes + 1 : instinct.successes,
    failures: success ? instinct.failures : instinct.failures + 1,
  };
}
```

## Hook Implementation

### PreToolUse Hook

```typescript
// .cursor/hooks/pre-tool-use.ts
import { instinctStore } from "./instinct-store";

export async function preToolUse(tool: string, input: unknown) {
  const relevantInstincts = instinctStore.findRelevant(tool, input);

  for (const instinct of relevantInstincts) {
    if (instinct.confidence >= THRESHOLDS.AUTO) {
      // Automatically apply
      console.log(`[Instinct] Auto-applying: ${instinct.name}`);
      return applyInstinct(instinct, input);
    } else if (instinct.confidence >= THRESHOLDS.SUGGEST) {
      // Suggest to user
      console.log(`[Instinct] Suggestion (${Math.round(instinct.confidence * 100)}% confidence): ${instinct.action}`);
    }
  }
}
```

### PostToolUse Hook

```typescript
// .cursor/hooks/post-tool-use.ts
export async function postToolUse(
  tool: string,
  input: unknown,
  output: unknown,
  activatedInstincts: Instinct[]
) {
  for (const instinct of activatedInstincts) {
    const success = evaluateOutcome(output);
    const updated = updateConfidence(instinct, success);
    await instinctStore.update(updated);

    if (updated.confidence >= THRESHOLDS.PROMOTE) {
      console.log(`[Instinct] Promoting to skill: ${instinct.name}`);
      await promoteToSkill(updated);
    }
  }
}
```

## Commands

### `/instinct-status`

View current instincts and their confidence scores:

```
/instinct-status

Output:
┌─────────────────────────────────────────────────────────────┐
│ Instinct Status                                             │
├─────────────────────────────────────────────────────────────┤
│ Name                    │ Confidence │ Activations │ Status │
├─────────────────────────────────────────────────────────────┤
│ prisma-tenant-scope     │ 0.94       │ 47          │ AUTO   │
│ zod-before-service      │ 0.87       │ 23          │ AUTO   │
│ ok-fail-response        │ 0.82       │ 31          │ AUTO   │
│ getAuthContext-not-user  │ 0.71       │ 15          │ SUGGEST│
│ concurrent-index        │ 0.45       │ 8           │ SUGGEST│
│ avoid-select-star       │ 0.18       │ 3           │ SUPPRESS│
└─────────────────────────────────────────────────────────────┘
```

### `/evolve`

Manually trigger the evolution cycle — review instincts and promote/retire:

```
/evolve

Output:
Analyzing 12 instincts...

Promoting to permanent skills:
  ✓ prisma-tenant-scope (confidence: 0.94, 47 activations)
  ✓ zod-before-service (confidence: 0.87, 23 activations)

Retiring low-confidence instincts:
  ✗ avoid-select-star (confidence: 0.18, only 3 activations)

Keeping for more data:
  ~ getAuthContext-not-user (confidence: 0.71, need 10 more activations)
  ~ concurrent-index (confidence: 0.45, mixed results)
```

## Instinct Storage

```
.cursor/
  instincts/
    instincts.json          # All instincts with confidence scores
    history/
      2025-01-15.jsonl      # Daily activation log
      2025-01-16.jsonl
```

```json
// instincts.json
{
  "version": "2",
  "instincts": [
    {
      "id": "inst_001",
      "name": "prisma-tenant-scope",
      "trigger": {
        "tool": "write_file",
        "pattern": "prisma\\.\\w+\\.findMany",
        "context": "repository file"
      },
      "action": "Always include tenantId in where clause",
      "confidence": 0.94,
      "activations": 47,
      "successes": 44,
      "failures": 3,
      "createdAt": "2025-01-01T00:00:00Z",
      "lastActivated": "2025-01-15T10:30:00Z"
    }
  ]
}
```

## Promotion to Permanent Skill

When an instinct reaches `confidence >= 0.9` with `activations >= 20`, it's promoted:

```typescript
async function promoteToSkill(instinct: Instinct) {
  const skillContent = generateSkillFromInstinct(instinct);
  const skillPath = `.cursor/skills/learned/${instinct.name}/SKILL.md`;

  await writeFile(skillPath, skillContent);
  await instinctStore.markPromoted(instinct.id);

  console.log(`Promoted instinct "${instinct.name}" to permanent skill at ${skillPath}`);
}
```

## Difference from v1

| Feature | v1 (Manual) | v2 (Instinct-based) |
|---------|-------------|---------------------|
| Capture method | Manual at session end | Automatic via hooks |
| Activation | Manual reading | Automatic based on confidence |
| Improvement | Manual updates | Automatic confidence updates |
| Promotion | Manual | Automatic at threshold |
| Effort | High | Low after setup |

## Setup

```bash
# Initialize instinct store
mkdir -p .cursor/instincts/history
echo '{"version":"2","instincts":[]}' > .cursor/instincts/instincts.json

# Install hooks (if supported by your Cursor version)
# See Cursor documentation for hook configuration
```

## Best Practices

1. **Start with v1** — manually capture patterns first, then automate with v2
2. **Review `/instinct-status` weekly** — ensure instincts are accurate
3. **Run `/evolve` monthly** — promote high-confidence instincts, retire low ones
4. **Don't trust low-confidence instincts** — they need more data
5. **Override when needed** — instincts are suggestions, not mandates
