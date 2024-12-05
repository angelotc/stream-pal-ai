-- Create the transcripts table
create table transcripts (
  id uuid not null primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  text text not null,
  type text not null check (type in ('transcript', 'twitch', 'system')),
  timestamp timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS (Row Level Security)
alter table transcripts enable row level security;

-- Create policies
create policy "Users can view their own transcripts"
  on transcripts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transcripts"
  on transcripts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transcripts"
  on transcripts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own transcripts"
  on transcripts for delete
  using (auth.uid() = user_id);

-- Create index for faster queries
create index transcripts_user_id_idx on transcripts(user_id);
create index transcripts_type_idx on transcripts(type);
create index transcripts_timestamp_idx on transcripts(timestamp); 