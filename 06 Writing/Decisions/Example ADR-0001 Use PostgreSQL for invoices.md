---
type: adr
adr_number: 1
status: accepted
date: 2026-09-08
project: "[[Example Project - Billing API]]"
deciders:
  - "[[Example Person - Alex Rivera]]"
supersedes: 
tags:
  - adr
  - example
---
# ADR-0001 Use PostgreSQL for invoices

Sample decision record.

## Context
Invoices need transactions, constraints, and reporting queries.

## Decision
Store invoices in PostgreSQL, one schema per service.

## Options considered
1. PostgreSQL
2. Document store

## Consequences
Schema migrations become part of every release.

## Follow-up
- [ ] Add the migration step to the runbook #project/example-project-billing-api
