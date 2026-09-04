# Freight frontend CI source authority

- Source branch: `fe/release-readiness-v4`
- Promotion target: `development`
- Required policy: `scripts/ci/validate_repository.py` from the protected branch train
- Runtime deployment authorized: **No**
- External effects authorized: **No**

This file records that the existing application source must pass the repository-wide exact-head required CI before it can be promoted beyond `development`.
