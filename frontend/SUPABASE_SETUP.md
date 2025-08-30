# Supabase Setup for Chat Persistence

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (usually takes 2-3 minutes)

## 2. Get Your Credentials

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the **Project URL** and **anon/public key**

## 3. Set Environment Variables

1. Copy `env.example` to `.env.local` in your frontend directory
2. Fill in your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. Create Database Tables

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the contents of `supabase-schema.sql`
3. Run the SQL commands

## 5. Features Enabled

✅ **Chat Persistence**: All messages are saved to Supabase  
✅ **Session Management**: Chat sessions persist across browser refreshes  
✅ **Memory**: Bot remembers previous conversations  
✅ **Real-time**: Messages sync across devices  

## 6. Security

- Row Level Security (RLS) is enabled
- Public read/write access for demo purposes
- Modify policies in `supabase-schema.sql` for production use

## 7. Testing

1. Start your application
2. Send a message
3. Refresh the page
4. Your chat history should persist!

## 8. Troubleshooting

- Check browser console for errors
- Verify environment variables are set correctly
- Ensure database tables are created
- Check Supabase logs for any issues
