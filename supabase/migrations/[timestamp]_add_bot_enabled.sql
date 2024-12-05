-- Add bot_enabled column to users table
alter table users
add column bot_enabled boolean not null default true;
