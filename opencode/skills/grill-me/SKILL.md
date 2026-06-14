---
name: grill-me
description: |
  Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
license: MIT
metadata:
  author: community
  version: "1.0.0"
  category: productivity
---

# Grill Me

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

## Guidelines

- Ask the questions **one at a time**
- If a question can be answered by exploring the codebase, explore the codebase instead of asking
- For each question, provide your **recommended answer**
- Resolve dependencies between decisions **one-by-one**

## Workflow

1. Start by asking about the **core goal** or **primary problem** being solved
2. Explore each branch of the design/decision tree:
   - **Scope** — What's in scope? What's explicitly out of scope?
   - **Dependencies** — What does this depend on? What does this enable?
   - **Alternatives** — What else was considered? Why was this approach chosen?
   - **Risks** — What could go wrong? What's the contingency?
   - **Success criteria** — How do we know if this worked?
3. Continue until **shared understanding** is reached