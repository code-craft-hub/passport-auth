```bash

### Redis Production Settings

For production Redis (GCP MemoryStore or self-hosted):

```bash
# Redis persistence - REQUIRED for BullMQ
appendonly yes
appendfsync everysec

# Memory policy - CRITICAL
maxmemory-policy noeviction

# Disable key eviction
timeout 0
```

**Why `noeviction`?** BullMQ cannot work properly if Redis evicts keys arbitrarily. Unlike cache use-cases, queue data must persist.

---