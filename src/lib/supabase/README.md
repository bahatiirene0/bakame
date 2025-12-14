# Supabase Integration Guide

This directory contains the production-ready Supabase integration for the Bakame AI project, featuring connection pooling, proper error handling, and type-safe database operations.

## Features

- **Connection Pooling**: Optimized database connections using Supabase's connection pooler
- **Singleton Pattern**: Prevents unnecessary client instances on the browser
- **Error Handling**: Comprehensive error handling with structured logging
- **Type Safety**: Full TypeScript support with generated database types
- **Auto Session Management**: Automatic token refresh and session persistence
- **Admin Operations**: Separate admin client for elevated privileges

## File Structure

```
src/lib/supabase/
├── README.md           # This file
├── client.ts           # Browser client (singleton pattern)
├── server.ts           # Server client (with pooling support)
├── db.ts              # Direct database access (optional)
├── index.ts           # Public exports
└── types.ts           # Generated database types
```

## Quick Start

### 1. Environment Setup

Add these variables to your `.env` file:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional but recommended for production
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_POOLER_URL=postgres://[user]:[password]@[host]:6543/postgres?pgbouncer=true
```

### 2. Get Connection Pooler URL

1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **Database**
3. Find **Connection Pooling** section
4. Copy the **Connection string** (Transaction mode recommended)
5. Add it to your `.env` as `SUPABASE_DB_POOLER_URL`

## Usage Examples

### Client-Side (Browser)

Use the singleton client for all browser-side operations:

```typescript
// In a React component
import { getSupabaseClient } from '@/lib/supabase';

export function UserProfile() {
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function fetchProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    }

    fetchProfile();
  }, []);
}
```

### Server-Side (API Routes)

Use the server client for API routes and server components:

```typescript
// app/api/users/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ users: data });
}
```

### Server Components

```typescript
// app/dashboard/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const { data: user } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id);

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
      <ProjectList projects={projects} />
    </div>
  );
}
```

### Admin Operations

Use the admin client when you need to bypass Row Level Security (RLS):

```typescript
// app/api/admin/users/route.ts
import { createServerSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  // Verify admin permissions first!
  const supabase = await createServerSupabaseAdminClient();

  // This bypasses RLS
  const { data, error } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('id', userId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ user: data });
}
```

### Direct Database Access (Advanced)

For complex queries or admin operations that need raw SQL:

```typescript
// First install: npm install postgres
import { executeQuery, executeTransaction } from '@/lib/supabase/db';

// Simple query
const users = await executeQuery(async (sql) => {
  return await sql`
    SELECT u.*, COUNT(p.id) as project_count
    FROM users u
    LEFT JOIN projects p ON p.user_id = u.id
    WHERE u.active = true
    GROUP BY u.id
  `;
});

// Transaction
await executeTransaction(async (sql) => {
  // Transfer credits between users
  await sql`UPDATE users SET credits = credits - 100 WHERE id = ${fromUserId}`;
  await sql`UPDATE users SET credits = credits + 100 WHERE id = ${toUserId}`;
  await sql`
    INSERT INTO transactions (from_user, to_user, amount)
    VALUES (${fromUserId}, ${toUserId}, 100)
  `;
});
```

## Authentication

### Sign Up

```typescript
import { getSupabaseClient } from '@/lib/supabase';

const supabase = getSupabaseClient();

const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
});
```

### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});
```

### Sign Out

```typescript
import { getSupabaseClient, resetSupabaseClient } from '@/lib/supabase';

const supabase = getSupabaseClient();
await supabase.auth.signOut();

// Reset the singleton instance
resetSupabaseClient();
```

### Get Current User

```typescript
// Client-side
const { data: { user } } = await supabase.auth.getUser();

// Server-side
const supabase = await createServerSupabaseClient();
const { data: { user } } = await supabase.auth.getUser();
```

## Realtime Subscriptions

Subscribe to database changes in real-time:

```typescript
import { getSupabaseClient } from '@/lib/supabase';

const supabase = getSupabaseClient();

// Subscribe to new messages
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
      setMessages((prev) => [...prev, payload.new]);
    }
  )
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(channel);
};
```

## Storage (File Uploads)

Upload and manage files:

```typescript
import { getSupabaseClient } from '@/lib/supabase';

const supabase = getSupabaseClient();

// Upload file
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.png`, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.png`);

// Download file
const { data, error } = await supabase.storage
  .from('avatars')
  .download(`${userId}/avatar.png`);
```

## Type Generation

Keep your TypeScript types in sync with your database:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Generate types
supabase gen types typescript --project-id your-project-id > src/lib/supabase/types.ts
```

## Performance Best Practices

### 1. Use Connection Pooler

Always configure `SUPABASE_DB_POOLER_URL` for production. This reduces connection overhead significantly.

### 2. Use Select Sparingly

Only select the columns you need:

```typescript
// Bad: Fetches all columns
const { data } = await supabase.from('users').select('*');

// Good: Only fetch what you need
const { data } = await supabase.from('users').select('id, name, email');
```

### 3. Use Pagination

For large datasets, always paginate:

```typescript
const { data } = await supabase
  .from('posts')
  .select('*')
  .range(0, 9); // First 10 items
```

### 4. Optimize RLS Policies

Keep Row Level Security policies simple and indexed. Complex policies can slow down queries.

### 5. Use Indexes

Create indexes for frequently queried columns:

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
```

## Error Handling

All functions include proper error handling with structured logging:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      logger.error('Failed to fetch users', {
        error: error.message,
        code: error.code,
      });
      return Response.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    return Response.json({ users: data });
  } catch (error) {
    logger.error('Unexpected error in users endpoint', {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Security Best Practices

### 1. Never Expose Service Role Key

Keep `SUPABASE_SERVICE_ROLE_KEY` secret. Never use it in client-side code.

### 2. Use RLS Policies

Always enable Row Level Security on your tables:

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);
```

### 3. Validate Input

Always validate user input before database operations:

```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

const validated = createUserSchema.parse(input);
```

### 4. Use Admin Client Carefully

Only use the admin client when absolutely necessary and after verifying permissions.

## Monitoring

The integration includes structured logging for monitoring:

```typescript
import { logger } from '@/lib/logger';

// Logs are automatically created for:
// - Client creation
// - Connection pooler usage
// - Query execution times
// - Errors and failures

// Add custom logging as needed
logger.info('User created successfully', {
  userId: user.id,
  email: user.email,
});
```

## Troubleshooting

### Connection Pool Exhausted

If you see connection errors in production:

1. Check if `SUPABASE_DB_POOLER_URL` is configured
2. Verify the pooler URL format is correct
3. Consider increasing pool size in Supabase dashboard
4. Review your queries for connection leaks

### Client Not Found

If you get "client not found" errors:

1. Verify environment variables are set
2. Check that you're using the correct import
3. Ensure you're not calling client functions during module initialization

### Type Errors

If TypeScript shows type errors:

1. Regenerate types: `supabase gen types typescript`
2. Restart TypeScript server in your IDE
3. Verify your database schema matches the types

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Connection Pooling Guide](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooling)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## Support

For issues or questions:
1. Check the logs using the logger
2. Review Supabase dashboard for errors
3. Consult the official Supabase documentation
4. Check database connection pool statistics
