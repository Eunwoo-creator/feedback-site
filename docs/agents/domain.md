# Domain Docs

How the engineering skills should consume this project's domain documentation when exploring the codebase.

## Before exploring, read these

- `GLOSSARY.md` at the project root.
- ADRs under `docs/adr/` that touch the area you are about to work in.

If any of these files do not exist, proceed silently. Do not flag their absence or suggest creating them upfront. Domain documentation is created lazily when terms or decisions actually get resolved; `/domain-modeling`, if installed later, supports this workflow.

## File structure

This project uses the single-context layout:

```text
/
├── GLOSSARY.md
└── docs/
    └── adr/
        └── 0001-<decision-slug>.md
```

These paths describe the convention; they do not require placeholder files.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, or a test name), use the term as defined in `GLOSSARY.md`. Do not drift to synonyms the glossary explicitly avoids.

If the concept you need is not in the glossary yet, reconsider whether you are inventing language the project does not use or whether there is a real gap to record when domain modeling occurs.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding it. Name the relevant ADR and explain why reopening the decision may be warranted.
