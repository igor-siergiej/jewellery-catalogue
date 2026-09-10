# E2E coverage — auth + data-write audit (2026-09)

Audit of the Playwright suite (`packages/web/tests/e2e/`) against the
security- and data-integrity-critical paths. Conclusion: coverage is solid;
one gap (the login happy path) is now closed.

## Auth (`auth.spec.ts`)

- Register: form render, required-field validation, password-rule validation,
  **successful registration → `/home`**, duplicate-username error, navigation to
  login, password visibility toggle.
- Login: form render, required-field validation, **successful login → `/home`
  (added 2026-09)**, invalid-credentials error, navigation to register,
  password visibility toggle.

The login success path was previously only exercised indirectly via the
`loginUser` helper inside other specs — it now has an explicit assertion.

## Data-write

- **Materials** — `materials-crud.spec.ts`: create (AddMaterial form), delete,
  edit a non-price field without triggering the price dialog; price-change flow
  and skip-price-dialog behaviour.
- **Designs & stock** — `design-inventory.spec.ts`, `design-stock-quantity.spec.ts`:
  produce a simple design, produce a variant with a pre-selected variant, set
  stock directly, low-stock dashboard filtering.
- **Cost propagation** — `materials-designs.spec.ts`: a material cost change
  propagates to `variant.totalMaterialCosts`; low-stock edit pre-selects the
  right variant.
- **Etsy** — `listings.spec.ts` (search/filter), `design-etsy-image.spec.ts`
  (linked-listing image as design image), `design-edit-no-etsy-push.spec.ts`
  (editing / saving a description on an Etsy-linked design does not push to
  Etsy), stock sync from a linked listing.

## API side

`packages/api/src/**/*.test.ts` (Bun runner) plus integration tests against a
real MongoDB (`RUN_INTEGRATION_TESTS=1`) cover repository queries and the
authorization/validation in the domain services.
