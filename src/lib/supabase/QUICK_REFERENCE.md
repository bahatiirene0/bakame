# Supabase Quick Reference

Quick reference for common Supabase operations in the Bakame AI project.

## Setup

```bash
# .env file
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_DB_POOLER_URL=postgres://[user]:[password]@[host]:6543/postgres?pgbouncer=true  # Optional but recommended
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For admin operations
```

## Client-Side Usage

```typescript
import { getSupabaseClient } from '@/lib/supabase';

// Get client (singleton)
const supabase = getSupabaseClient();

// SELECT
const { data, error } = await supabase
  .from('users')
  .select('id, name, email')
  .eq('active', true);

// INSERT
const { data, error } = await supabase
  .from('users')
  .insert({ name: 'John', email: 'john@example.com' });

// UPDATE
const { data, error } = await supabase
  .from('users')
  .update({ name: 'Jane' })
  .eq('id', userId);

// DELETE
const { data, error } = await supabase
  .from('users')
  .delete()
  .eq('id', userId);
```

## Server-Side Usage

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';

// In API routes or Server Components
const supabase = await createServerSupabaseClient();

const { data, error } = await supabase
  .from('users')
  .select('*');
```

## Admin Operations

```typescript
import { createServerSupabaseAdminClient } from '@/lib/supabase/server';

// Bypasses Row Level Security - use carefully!
const supabase = await createServerSupabaseAdminClient();

const { data, error } = await supabase
  .from('users')
  .update({ role: 'admin' })
  .eq('id', userId);
```

## Authentication

```typescript
import { getSupabaseClient, resetSupabaseClient } from '@/lib/supabase';

const supabase = getSupabaseClient();

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Sign out
await supabase.auth.signOut();
resetSupabaseClient();  // Reset singleton

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

## File Storage

```typescript
import { getSupabaseClient } from '@/lib/supabase';

const supabase = getSupabaseClient();

// Upload
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.png`, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.png`);

// Download
const { data, error } = await supabase.storage
  .from('avatars')
  .download(`${userId}/avatar.png`);

// Delete
const { data, error } = await supabase.storage
  .from('avatars')
  .remove([`${userId}/avatar.png`]);
```

## Realtime Subscriptions

```typescript
import { getSupabaseClient } from '@/lib/supabase';

const supabase = getSupabaseClient();

// Subscribe to changes
const channel = supabase
  .channel('messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `room_id=eq.${roomId}`
    },
    (payload) => {
      console.log('New message:', payload.new);
    }
  )
  .subscribe();

// Cleanup
channel.unsubscribe();
```

## Direct Database Access (Advanced)

```bash
# First install
npm install postgres
```

```typescript
import { executeQuery, executeTransaction } from '@/lib/supabase/db';

// Simple query
const users = await executeQuery(async (sql) => {
  return await sql`
    SELECT u.*, COUNT(p.id) as project_count
    FROM users u
    LEFT JOIN projects p ON p.user_id = u.id
    GROUP BY u.id
  `;
});

// Transaction
await executeTransaction(async (sql) => {
  await sql`UPDATE accounts SET balance = balance - 100 WHERE id = ${fromId}`;
  await sql`UPDATE accounts SET balance = balance + 100 WHERE id = ${toId}`;
  await sql`INSERT INTO transactions (from_id, to_id, amount) VALUES (${fromId}, ${toId}, 100)`;
});
```

## Common Patterns

### Pagination

```typescript
const { data } = await supabase
  .from('posts')
  .select('*')
  .range(0, 9)  // First 10 items
  .order('created_at', { ascending: false });
```

### Filtering

```typescript
const { data } = await supabase
  .from('posts')
  .select('*')
  .eq('status', 'published')
  .gte('created_at', '2024-01-01')
  .ilike('title', '%search%');
```

### Joins

```typescript
const { data } = await supabase
  .from('posts')
  .select(`
    *,
    author:users(id, name, email),
    comments(id, content, created_at)
  `)
  .eq('status', 'published');
```

### Counting

```typescript
const { count } = await supabase
  .from('posts')
  .select('*', { count: 'exact', head: true });
```

## Error Handling

```typescript
import { logger } from '@/lib/logger';

const { data, error } = await supabase
  .from('users')
  .select('*');

if (error) {
  logger.error('Failed to fetch users', {
    error: error.message,
    code: error.code,
  });
  // Handle error
  return;
}

// Use data
console.log(data);
```

## Performance Tips

1. **Select specific columns**: `select('id, name')` not `select('*')`
2. **Use indexes**: Create indexes for frequently queried columns
3. **Paginate large results**: Use `.range()` or `.limit()`
4. **Use connection pooler**: Set `SUPABASE_DB_POOLER_URL` in production
5. **Cache when possible**: Use React Query or similar for client-side caching

## Security Checklist

- ✅ Enable Row Level Security (RLS) on all tables
- ✅ Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code
- ✅ Validate all user input before queries
- ✅ Use prepared statements (automatic with Supabase)
- ✅ Review RLS policies regularly
- ✅ Use admin client only when necessary
- ✅ Sanitize logs to prevent sensitive data leaks

## Debugging

```typescript
// Enable debug mode
const supabase = getSupabaseClient();

// Check connection
const { data, error } = await supabase
  .from('users')
  .select('count');

// Check logs
// Logs are automatically created with logger
```

## Type Safety

```typescript
import type { Database } from '@/lib/supabase/types';

// Use generated types
type User = Database['public']['Tables']['users']['Row'];
type InsertUser = Database['public']['Tables']['users']['Insert'];
type UpdateUser = Database['public']['Tables']['users']['Update'];
```

## Need Help?

- Full Documentation: `src/lib/supabase/README.md`
- Migration Guide: `SUPABASE_MIGRATION_GUIDE.md`
- Supabase Docs: https://supabase.com/docs
