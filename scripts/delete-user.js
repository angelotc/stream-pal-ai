import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Get user ID from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error('Please provide a user ID as an argument');
  console.error('Usage: node scripts/delete-user.js <user-id>');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function deleteUser() {
  console.log('Attempting to delete user:', userId);

  try {
    // First delete from public.users
    console.log('Deleting from public.users...');
    const { error: userError } = await adminClient
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (userError) {
      console.error('Error deleting from public.users:', userError);
      throw userError;
    }
    console.log('Successfully deleted from public.users');

    // Then delete from auth.users
    console.log('Deleting from auth.users...');
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('Error deleting from auth.users:', authError);
      throw authError;
    }
    console.log('Successfully deleted from auth.users');

    console.log('Successfully deleted user:', userId);
    process.exit(0);
  } catch (error) {
    console.error('Failed to delete user:', error);
    process.exit(1);
  }
}

// Run the deletion
deleteUser().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
