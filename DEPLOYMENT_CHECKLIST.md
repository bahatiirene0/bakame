# Deployment Checklist - Database Connection Pooling

Quick checklist for deploying the new Supabase connection pooling setup.

## Pre-Deployment

### 1. Get Connection Pooler URL

- [ ] Log in to Supabase Dashboard
- [ ] Navigate to: **Settings** → **Database** → **Connection Pooling**
- [ ] Select: **Transaction mode** (recommended)
- [ ] Copy the connection string (format: `postgres://postgres.xxx:[password]@xxx.pooler.supabase.com:6543/postgres?pgbouncer=true`)

### 2. Update Environment Variables

**Development (.env.local)**
```bash
SUPABASE_DB_POOLER_URL=postgres://postgres.xxx:[password]@xxx.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Production (Vercel/Hosting Platform)**
- [ ] Add `SUPABASE_DB_POOLER_URL` to environment variables
- [ ] Verify all other Supabase variables are set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (if using admin operations)

### 3. Test Locally

```bash
# Install dependencies (no new ones required unless using db.ts)
npm install

# Run development server
npm run dev

# Test these features:
```

- [ ] User login/logout
- [ ] Database queries (read/write)
- [ ] File uploads (if used)
- [ ] Real-time features (if used)
- [ ] Check logs for: `"Using Supabase connection pooler"`

## Deployment

### 4. Deploy to Staging (if available)

```bash
# Deploy to staging
git add .
git commit -m "Add database connection pooling"
git push origin staging
```

- [ ] Verify deployment successful
- [ ] Check application logs for pooler usage
- [ ] Test critical user flows
- [ ] Monitor database connection count in Supabase

### 5. Deploy to Production

```bash
# Deploy to production
git push origin main
```

- [ ] Verify deployment successful
- [ ] Monitor logs for errors
- [ ] Check performance metrics
- [ ] Verify connection pooler is being used

## Post-Deployment

### 6. Monitor Performance

**First 24 Hours:**
- [ ] Check database connection count (should decrease)
- [ ] Monitor query response times (should improve)
- [ ] Watch error rates (should stay same or decrease)
- [ ] Review application logs

**Week 1:**
- [ ] Compare performance metrics vs. baseline
- [ ] Review Supabase dashboard for connection statistics
- [ ] Check for any connection pool exhaustion warnings
- [ ] Gather user feedback on performance

### 7. Verify Logging

Check logs for these messages:
```
✅ "Using Supabase connection pooler"
✅ "Created Supabase server client"
✅ "Created Supabase browser client"
```

### 8. Performance Metrics to Track

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Avg DB connections | ? | ? | -50% |
| Avg query time | ? | ? | -20% |
| Error rate | ? | ? | Same or less |
| Memory usage | ? | ? | Slight decrease |

## Optional Enhancements

### 9. Add Direct Database Access (Optional)

If you need raw SQL queries:

```bash
# Install postgres.js
npm install postgres
```

- [ ] Update package.json
- [ ] Test executeQuery() function
- [ ] Test executeTransaction() function
- [ ] Update relevant code to use direct DB access

### 10. Update Team Documentation

- [ ] Share `SUPABASE_MIGRATION_GUIDE.md` with team
- [ ] Update team wiki/docs with new patterns
- [ ] Train team on new admin client usage
- [ ] Document connection pooler URL location

## Rollback Plan (If Needed)

If issues occur:

### Immediate Rollback
1. Remove `SUPABASE_DB_POOLER_URL` from environment variables
2. Restart application
3. System will automatically use direct URLs
4. No code changes needed

### Full Rollback (if necessary)
```bash
git revert [commit-hash]
git push origin main
```

## Verification Commands

### Check Environment Variables
```bash
# Development
cat .env.local | grep SUPABASE

# Production (Vercel)
vercel env ls
```

### Check Logs
```bash
# Local
npm run dev

# Production
vercel logs
```

### Test Database Connection
```bash
# In browser console (after login)
const supabase = window.__supabase_client__;
const { data, error } = await supabase.from('users').select('count');
console.log(data, error);
```

## Success Criteria

✅ All tests pass
✅ Connection pooler URL is being used
✅ No increase in error rates
✅ Performance metrics improve
✅ Database connections decrease
✅ Application functions normally
✅ Team is informed and trained

## Support Contacts

- **Supabase Support**: https://supabase.com/support
- **Documentation**: `/home/bahati/bakame-ai/src/lib/supabase/README.md`
- **Quick Reference**: `/home/bahati/bakame-ai/src/lib/supabase/QUICK_REFERENCE.md`

## Notes

- Connection pooling is **backward compatible** - existing code continues to work
- Pooler URL is **optional** - system falls back to direct connection if not set
- All changes are **production-ready** and tested
- **No breaking changes** to the API

---

**Status**: Ready for deployment ✅

**Date**: 2025-12-14

**Deployed By**: _____________

**Deployment Time**: _____________

**Verification Complete**: _____________
