# projectX — top lessons (distilled 2026-07-09, evidence in .claude/skills/projectX-project-lessons/)

1. State "X causes Y because Z" (Z observed) before any fix; a re-reported bug means no mechanism was established.
2. Data-shaped bug + migration candidate ⇒ run the counting query first; 0 rows = query bug (see #602/#603).
3. Field-array rows: key on business identity, never `field.id` (#583/#597/#605).
4. Prod bug ⇒ confirm prod runs the code you're reading before debugging HEAD.
5. Authorization = exactly the action the user named; host/DB/others'-PR writes need a one-line ask.
