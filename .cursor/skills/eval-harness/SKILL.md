---
name: eval-harness
description: Eval-driven development (EDD) for AI-assisted features — capability evals, regression evals, pass@k metrics, grader types, and structured eval harness setup.
origin: ECC
---

# Eval Harness

Evaluation-driven development for AI-assisted features and LLM integrations.

## When to Activate

- Building features that use LLMs or AI models
- Testing AI-generated outputs for quality
- Preventing regressions in AI behavior
- Measuring AI capability improvements
- Setting up structured evals for prompts

## Core Concepts

### Eval-Driven Development (EDD)

Write evals before implementing AI features:

1. **Define expected behavior** — what should the AI do?
2. **Write eval cases** — inputs and expected outputs
3. **Implement the feature** — make evals pass
4. **Track metrics over time** — prevent regressions

### Eval Types

| Type | Purpose | When to Use |
|------|---------|-------------|
| **Capability eval** | Does it work at all? | New features |
| **Regression eval** | Does it still work? | After changes |
| **Comparison eval** | Is version B better than A? | Model upgrades |
| **Adversarial eval** | Does it handle edge cases? | Security, robustness |

## Grader Types

### Exact Match

```typescript
// For deterministic outputs
const grader = {
  type: "exact_match",
  grade: (output: string, expected: string) => output.trim() === expected.trim(),
};
```

### Contains Match

```typescript
// For outputs that must include specific content
const grader = {
  type: "contains",
  grade: (output: string, expected: string) => output.includes(expected),
};
```

### LLM-as-Judge

```typescript
// For subjective quality assessment
const grader = {
  type: "llm_judge",
  grade: async (output: string, criteria: string) => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an evaluator. Rate the output as PASS or FAIL based on the criteria.",
        },
        {
          role: "user",
          content: `Criteria: ${criteria}\n\nOutput: ${output}\n\nVerdict (PASS/FAIL):`,
        },
      ],
    });
    return response.choices[0].message.content?.includes("PASS") ?? false;
  },
};
```

### Semantic Similarity

```typescript
// For outputs that should be semantically equivalent
const grader = {
  type: "semantic_similarity",
  threshold: 0.85,
  grade: async (output: string, expected: string) => {
    const [outputEmbed, expectedEmbed] = await Promise.all([
      getEmbedding(output),
      getEmbedding(expected),
    ]);
    const similarity = cosineSimilarity(outputEmbed, expectedEmbed);
    return similarity >= this.threshold;
  },
};
```

## Eval Harness Structure

```typescript
// evals/harness.ts
interface EvalCase {
  id: string;
  input: Record<string, unknown>;
  expected: string | Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface EvalResult {
  caseId: string;
  passed: boolean;
  output: string;
  expected: string;
  score?: number;
  latencyMs: number;
  error?: string;
}

interface EvalSuite {
  name: string;
  cases: EvalCase[];
  grader: Grader;
  model?: string;
}

async function runEvalSuite(suite: EvalSuite): Promise<EvalReport> {
  const results: EvalResult[] = [];

  for (const evalCase of suite.cases) {
    const start = Date.now();
    try {
      const output = await runModel(evalCase.input, suite.model);
      const passed = await suite.grader.grade(output, evalCase.expected as string);

      results.push({
        caseId: evalCase.id,
        passed,
        output,
        expected: evalCase.expected as string,
        latencyMs: Date.now() - start,
      });
    } catch (error) {
      results.push({
        caseId: evalCase.id,
        passed: false,
        output: "",
        expected: evalCase.expected as string,
        latencyMs: Date.now() - start,
        error: (error as Error).message,
      });
    }
  }

  return generateReport(suite.name, results);
}
```

## pass@k Metric

Measures probability that at least one of k samples passes:

```typescript
// pass@k: generate k outputs, pass if any one passes
async function passAtK(
  evalCase: EvalCase,
  k: number,
  grader: Grader,
  model: string
): Promise<number> {
  const results = await Promise.all(
    Array.from({ length: k }, () => runModel(evalCase.input, model))
  );

  const passed = await Promise.all(
    results.map(output => grader.grade(output, evalCase.expected as string))
  );

  return passed.some(Boolean) ? 1 : 0;
}

// Run pass@k across eval suite
async function evalPassAtK(suite: EvalSuite, k: number): Promise<number> {
  const scores = await Promise.all(
    suite.cases.map(c => passAtK(c, k, suite.grader, suite.model ?? "gpt-4o"))
  );
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}
```

## Example: Category Extraction Eval

```typescript
// evals/category-extraction.eval.ts
const categoryExtractionSuite: EvalSuite = {
  name: "category-extraction",
  model: "gpt-4o-mini",
  grader: {
    type: "exact_match",
    grade: (output, expected) => {
      const parsed = JSON.parse(output);
      const expectedParsed = JSON.parse(expected);
      return parsed.category === expectedParsed.category;
    },
  },
  cases: [
    {
      id: "electronics-1",
      input: { text: "I need a new laptop charger" },
      expected: JSON.stringify({ category: "Electronics" }),
    },
    {
      id: "clothing-1",
      input: { text: "Looking for winter jackets" },
      expected: JSON.stringify({ category: "Clothing" }),
    },
    {
      id: "ambiguous-1",
      input: { text: "Something for my home" },
      expected: JSON.stringify({ category: "Home & Garden" }),
    },
  ],
};

// Run eval
const report = await runEvalSuite(categoryExtractionSuite);
console.log(`Pass rate: ${report.passRate * 100}%`);
```

## Eval Report Format

```typescript
interface EvalReport {
  suiteName: string;
  timestamp: string;
  model: string;
  passRate: number;       // 0.0 to 1.0
  totalCases: number;
  passed: number;
  failed: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  results: EvalResult[];
  failedCases: EvalResult[];
}

// Example output
{
  "suiteName": "category-extraction",
  "timestamp": "2025-01-15T10:30:00Z",
  "model": "gpt-4o-mini",
  "passRate": 0.87,
  "totalCases": 23,
  "passed": 20,
  "failed": 3,
  "avgLatencyMs": 450,
  "p95LatencyMs": 1200,
  "failedCases": [
    {
      "caseId": "ambiguous-1",
      "output": "{\"category\": \"General\"}",
      "expected": "{\"category\": \"Home & Garden\"}",
      "passed": false
    }
  ]
}
```

## CI Integration

```yaml
# .github/workflows/evals.yml
name: AI Evals

on:
  push:
    branches: [main]
    paths:
      - "apps/api/src/ai/**"
      - "evals/**"

jobs:
  run-evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run evals
        run: pnpm evals
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Check pass rate
        run: |
          PASS_RATE=$(cat eval-results/summary.json | jq '.passRate')
          if (( $(echo "$PASS_RATE < 0.80" | bc -l) )); then
            echo "Eval pass rate $PASS_RATE is below threshold 0.80"
            exit 1
          fi

      - name: Upload eval results
        uses: actions/upload-artifact@v4
        with:
          name: eval-results
          path: eval-results/
```

## Best Practices

1. **Write evals before implementing** — define success criteria first
2. **Keep evals deterministic** — use temperature=0 for reproducible results
3. **Track metrics over time** — store results in a database or file
4. **Set pass rate thresholds** — fail CI if pass rate drops below baseline
5. **Include adversarial cases** — test edge cases and failure modes
6. **Use diverse test data** — avoid overfitting to specific examples
7. **Separate capability from regression evals** — different purposes, different cadence
8. **Cost awareness** — use cheaper models for large eval suites, expensive for final validation
