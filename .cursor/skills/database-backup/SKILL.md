---
name: database-backup
description: pg_dump automation, point-in-time recovery (PITR), backup verification.
origin: projectX-audit
---

# Database Backup

Automated backup strategies for PostgreSQL.

## When to Activate

- Setting up production database
- Compliance requirements
- Disaster recovery planning
- After data loss incident

## pg_dump Automation

```bash
pg_dump -h localhost -U user -F c -f backup_$(date +%Y%m%d).dump dbname
```

- Schedule with cron (daily, off-peak)
- Store in S3 or equivalent with retention policy
- Test restore regularly

## Point-in-Time Recovery (PITR)

- Enable WAL archiving in PostgreSQL
- `archive_mode = on`
- `archive_command` to copy WAL to storage
- Restore to specific timestamp with `pg_restore` + replay WAL

## Verification

- Restore to staging periodically
- Verify row counts and checksums
- Document restore procedure
