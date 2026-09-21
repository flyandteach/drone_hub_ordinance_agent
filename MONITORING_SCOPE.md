# Monitoring Scope and Research Rules

This repository monitors U.S. commercial drone package delivery and the ground-side facilities that support it, including Prime Air Drone Delivery Centers (PADDCs), Wing nests, Zipline docks/platforms and other drone hubs or ports.

## Tracked subjects

The monthly research sweep covers local planning and zoning, special-use permits, development approvals and denials, moratoria and interim controls, ordinances, council and planning-commission testimony, noise and visual-impact complaints, privacy and safety concerns, wildlife/environmental concerns, state legislation and preemption, FAA environmental review, Part 135 approvals, BVLOS/Part 108 developments that materially affect delivery operations, facility openings/closures/relocations, accidents or enforcement with land-use relevance, lawsuits, administrative appeals and court rulings.

## Verification standard

Prefer primary sources in this order: court records; statutes and regulations; FAA or other government documents; local ordinances, staff reports and meeting records; official operator filings or announcements. Reputable reporting may be used where primary material is unavailable or as corroboration. Do not add an item based only on social media, an unattributed claim, or an unsourced secondary summary.

Every event must include a direct source URL, date, jurisdiction, operator when known, status, category and concise factual summary. If a legal case cannot be verified, do not list it as active.

## Update workflow

1. Read the current `docs/data/events.json` and the latest report.
2. Search for new developments since the prior research cutoff and status changes to open matters.
3. De-duplicate by jurisdiction, operator, date and subject.
4. Add or revise only verified records.
5. Update the dashboard metadata and produce a new monthly report.
6. Create a dated Git branch and open a pull request against `main`.
7. Do not merge automatically.
