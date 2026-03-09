---
name: skill-stocktake
description: Audit all skills for quality and relevance — Quick Scan vs Full Stocktake modes, verdict criteria (Keep/Improve/Retire/Merge), and skill health scoring.
origin: ECC
---

# Skill Stocktake

Periodic audit of all skills to ensure they remain accurate, relevant, and high-quality.

## When to Activate

- Monthly skill maintenance
- After major project changes (new tech stack, new patterns)
- When a skill seems to give outdated advice
- When adding many new skills (check for duplicates)
- When onboarding a new team member (audit for clarity)

## Two Modes

### Quick Scan (15 minutes)

Fast pass to identify obvious issues:

```
For each skill:
1. Read the title and description (30 seconds)
2. Check "When to Activate" section (30 seconds)
3. Scan for obvious outdated content (1 minute)
4. Assign preliminary verdict: Keep / Review / Retire
```

Use Quick Scan when:

- Monthly maintenance
- After a small change to the stack
- Just checking if skills are still relevant

### Full Stocktake (1-2 hours)

Deep review of each skill:

```
For each skill:
1. Read the full content
2. Test key code examples against current codebase
3. Check if patterns match current project conventions
4. Verify external links/tools still exist
5. Assess quality score
6. Assign final verdict with notes
```

Use Full Stocktake when:

- Major stack upgrade (e.g., new ORM, new framework)
- Quarterly review
- After inheriting a project with existing skills

## Verdict Criteria

### Keep ✅

```
Criteria:
- Content is accurate and up-to-date
- Examples work with current stack
- "When to Activate" is clear and correct
- Used regularly by the team
- No significant overlap with other skills

Action: No changes needed
```

### Improve 🔧

```
Criteria:
- Core content is valid but needs updates
- Some examples are outdated
- "When to Activate" could be clearer
- Missing important patterns added since creation
- Minor inaccuracies

Action: Update specific sections, re-test examples
```

### Retire 🗑️

```
Criteria:
- Technology/library no longer used in project
- Completely superseded by another skill
- Content is dangerously outdated (could cause bugs)
- Never activated in practice
- Irrelevant to current stack

Action: Delete the skill file
```

### Merge 🔀

```
Criteria:
- Two skills cover the same topic
- One skill is a subset of another
- Skills are always activated together
- Significant content overlap

Action: Combine into single skill, delete the other
```

## Skill Health Scoring

Score each skill 1-5 on each dimension:

| Dimension        | 1 (Poor)         | 3 (OK)            | 5 (Excellent)     |
| ---------------- | ---------------- | ----------------- | ----------------- |
| **Accuracy**     | Wrong/outdated   | Mostly correct    | Fully accurate    |
| **Clarity**      | Confusing        | Understandable    | Crystal clear     |
| **Relevance**    | Not used         | Occasionally used | Frequently used   |
| **Completeness** | Missing key info | Covers basics     | Comprehensive     |
| **Examples**     | No examples      | Basic examples    | Runnable examples |

**Score interpretation:**

- 20-25: Keep as-is
- 15-19: Minor improvements
- 10-14: Significant improvements needed
- < 10: Consider retiring

## Stocktake Report Format

```markdown
# Skill Stocktake Report

**Date**: 2025-01-15
**Mode**: Full Stocktake
**Skills reviewed**: 21
**Reviewer**: [name]

## Summary

| Verdict | Count |
| ------- | ----- |
| Keep    | 15    |
| Improve | 4     |
| Retire  | 1     |
| Merge   | 1     |

## Verdicts

### Keep ✅

| Skill            | Score | Notes                   |
| ---------------- | ----- | ----------------------- |
| api-design       | 23/25 | Excellent, up to date   |
| backend-patterns | 22/25 | Accurate, good examples |
| tdd-workflow     | 21/25 | Clear and actionable    |

### Improve 🔧

| Skill               | Score | Issues                   | Priority |
| ------------------- | ----- | ------------------------ | -------- |
| database-migrations | 17/25 | Prisma v6 syntax changed | High     |
| docker-patterns     | 16/25 | Node.js 22 not mentioned | Medium   |

### Retire 🗑️

| Skill        | Reason                              |
| ------------ | ----------------------------------- |
| eval-harness | Project no longer uses LLM features |

### Merge 🔀

| Skills                          | Into     | Reason               |
| ------------------------------- | -------- | -------------------- |
| security-review + security-scan | security | Always used together |

## Action Items

- [ ] Update database-migrations for Prisma v6 (High priority)
- [ ] Update docker-patterns for Node.js 22 (Medium priority)
- [ ] Delete eval-harness skill
- [ ] Merge security-review and security-scan
```

## Running a Quick Scan

```bash
# List all skills
ls .cursor/skills/

# Check each skill's metadata
for dir in .cursor/skills/*/; do
  echo "=== $dir ==="
  head -5 "$dir/SKILL.md"
  echo ""
done

# Check last modified dates
ls -la .cursor/skills/*/SKILL.md
```

## Skill Maintenance Checklist

For each skill being improved:

- [ ] Update code examples to match current package versions
- [ ] Verify all commands work (run them if possible)
- [ ] Update "When to Activate" if use cases have changed
- [ ] Add new patterns discovered since last update
- [ ] Remove patterns that are no longer recommended
- [ ] Check that examples match current project conventions
- [ ] Update external links (npm packages, docs URLs)
- [ ] Re-test against current codebase

## Scheduling Stocktakes

```
Recommended cadence:
- Quick Scan: Monthly (last Friday of each month)
- Full Stocktake: Quarterly (after major releases)
- Triggered review: After major stack changes

Calendar reminders:
- Monthly: "Quick skill scan — 15 min"
- Quarterly: "Full skill stocktake — 2 hours"
```
