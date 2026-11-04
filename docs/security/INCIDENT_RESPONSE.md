# Security Incident Response Plan (SOP) — LAMID ONE & Ecosystem

This document establishes the Standard Operating Procedures (SOP) for identifying, triaging, containing, remediating, and post-auditing security incidents within the **LAMID ONE** and connected **LAMID GROUPWARE** application ecosystem.

---

## 1. Incident Severity Classification

| Severity Level | Definition | Response SLA | Escalation Target |
| :--- | :--- | :--- | :--- |
| **P1 - Critical** | Active data exfiltration, database breach, payment compromise, unauthorized admin account creation, remote code execution. | Immediate (< 15 mins) | Chief Architect & Lead DevOps |
| **P2 - High** | Account takeover attempt, repeated brute-force lockouts, webhook HMAC failure spikes, unauthorized cross-workspace access attempt. | < 1 hour | Security Engineering |
| **P3 - Medium** | Malicious file upload blocked, single account targeted, abnormal rate limit saturation, transient third-party auth failure. | < 4 hours | Backend Engineering |
| **P4 - Low** | Low-velocity failed logins, non-exploitable error leak, minor package advisory with no active vector. | < 24 hours | Development Team |

---

## 2. Five-Phase Response Workflow

```
[ Phase 1: Detection ]
         │
         ▼
[ Phase 2: Triage & Classification ]
         │
         ▼
[ Phase 3: Immediate Containment ]
         │
         ▼
[ Phase 4: Eradication & Remediation ]
         │
         ▼
[ Phase 5: Post-Mortem & Disclosure ]
```

### Phase 1: Detection & Triage
- Review centralized `security_alerts` ledger in PostgreSQL:
  ```sql
  SELECT * FROM security_alerts 
  WHERE severity IN ('warning', 'critical') 
  ORDER BY created_at DESC LIMIT 50;
  ```
- Inspect webhook audit failures in `groupware_sync_events`:
  ```sql
  SELECT * FROM groupware_sync_events 
  WHERE status = 'failed' 
  ORDER BY created_at DESC LIMIT 20;
  ```
- Check application server error log streams for rate limit triggers or authentication exceptions.

### Phase 2: Containment Procedures
1. **Compromised User Session Revocation:**
   - Terminate all active sessions for targeted user(s) immediately:
     ```sql
     DELETE FROM sessions WHERE user_id = '<target_user_id>';
     ```
2. **Account Lockout:**
   - Temporarily disable account access:
     ```sql
     UPDATE users 
     SET disabled_at = EXTRACT(EPOCH FROM NOW()) * 1000,
         locked_until = EXTRACT(EPOCH FROM NOW()) * 1000 + 86400000 
     WHERE id = '<target_user_id>';
     ```
3. **Integration Secret Rotation:**
   - If `GROUPWARE_API_KEY`, `GROUPWARE_API_SECRET`, or `GROUPWARE_WEBHOOK_SECRET` are suspected of being leaked:
     - Generate a new 32-byte cryptographically random secret in hex.
     - Update environment variables on both hosting platforms (Vercel / PaaS).
     - Trigger immediate zero-downtime redeployment.

### Phase 3: Eradication & Remediation
- Identify root vulnerability vector (e.g. malformed payload, dependency flaw, unverified credential).
- Deploy regression test covering the exploit pattern before code fix.
- Verify prepared statement integrity and parameterization on touched endpoints.
- Execute full test suite:
  ```bash
  node --test tests/*.test.mjs
  ```

### Phase 4: Post-Mortem & Audit Trail
- Preserve database logs, connection timestamps, and write-ahead sync records.
- Complete Root Cause Analysis (RCA) within 72 hours of incident resolution.
- Record findings, preventative architectural adjustments, and customer notification requirements in accordance with applicable privacy standards.

