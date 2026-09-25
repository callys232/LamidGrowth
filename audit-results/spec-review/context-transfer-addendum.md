# Context-transfer addendum

Reviewed after the baseline snapshot: [captured implementation](../../data/spec-review-addendum/src/app/contextTransfer.mjs), [tests](../../data/spec-review-addendum/tests/context-transfer.test.mjs), and [hashes](addendum-manifest.json). This credits later work without rewriting the original evidence.

The new module implements explicit copy, reference, promote and anonymize requests between workspaces. It checks active target membership and source record/workspace/kind. Reference/promote resolution checks the target workspace and revoked status. Copies are independent records and are explicitly not revocable through the transfer endpoint. The current two regression tests passed: [executed log](context-transfer-tests-executed.log). The first sandbox attempt failed to spawn the test subprocess and is not a product failure.

F-SI-06 therefore must **not** be read as saying the current code has no context-transfer feature. This is a partial implementation of that contract. Remaining inspected limitations:

- `anonymize` preserves objective `title`, a free-text field capable of containing names or identifying facts. Dropping description/constraints does not establish anonymization. The tests confirm stripping selected fields, not anonymity.
- The schema accepts arbitrary record kinds for copy/reference/promote. It has no transfer-specific role, classification, owner-consent, purpose or expiry policy beyond workspace membership.
- Reference and promote have the same pointer behavior; separate promotion/approval semantics, aggregation and explicit share semantics are not implemented.
- Resolving a pointer fetches current source content without rechecking the grantor’s continued source membership, source policy or field permissions. Revocation of the transfer itself is enforced.
- Copies do not carry a general downstream invalidation/recomputation or evidence-lineage contract. Multi-person/shared-goal authority is not established by this module.

These are static limitations except for the two passing regression tests. No new production source changes were made for the addendum. Further changes after the captured addendum require a new comparison.
