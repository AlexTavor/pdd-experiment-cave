# Finder for arm P

Arm P is PDD run as the product: the structural decomposition plus the taxonomy and skills as
shipped at `pdd_commit`. There is no separately authored prompt here, on purpose. P uses
PDD's own MAP finder unchanged.

For provenance, record at run time:

- `pdd_commit` (the exact PDD version).
- the skills and gate config in effect (the `.pdd/config.yaml` and the active skill set).
- the decomposition units P analyzed, so C can be given the same structural units minus the
  taxonomy.
