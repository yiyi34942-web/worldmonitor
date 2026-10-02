# R6 Final Static Gate Validation Report

Generated: 2026-10-02T06:00:58.087086Z

## Global Registry Schema
- Role: 5/5 PASS
- Profile: 10/10 PASS
- Methodology: 31/31 PASS
- API: 237/237 PASS
- Source: 20/20 PASS

## Validator Fail-Closed
- Result computed after ALL checks (single final path)
- valid=false → exit!=0
- Recursive schema validation for all registries

## Profile↔Bindings Bijection
- Declared: 85, Bound: 85, Missing: 0, Extra: 0

## Role↔Method Consistency
- Default violations: 0
- All role defaults allowed by method roles

## Source Policy
- 31/31 with explicit source_binding_mode
- EXPLICIT/INHERIT_FROM_API_BINDINGS/NONE all valid

## A-Field Dual-Layer Model
- Base fields: boolean
- State fields: string enum (VERIFIED/NOT_APPLICABLE/BLOCKED_STATIC_EVIDENCE/PENDING_GROK_BUILD/PENDING)
- 735+118 A-fields migrated from string→boolean base

## Negative Mutations: 6/6 caught

## Tests: 152/152 PASS
## Contract Version: 2.1.2
