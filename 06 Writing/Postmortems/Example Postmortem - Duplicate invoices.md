---
type: postmortem
status: draft
project: "[[Example Project - Billing API]]"
incident_date: 2026-09-05
severity: sev3
tags:
  - postmortem
  - example
---
# Duplicate invoices

Sample postmortem. Blameless: describe systems and decisions, not people.

## Summary
A retried request created a second invoice.

## Root cause
The endpoint had no idempotency key.

## Action items
- [ ] Add idempotency keys to the invoice endpoint #project/example-project-billing-api
