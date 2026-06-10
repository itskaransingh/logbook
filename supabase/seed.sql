-- Seed file for local development
--
-- Logbook has no public signup: employee accounts are created by admins
-- from inside the app, and the very first admin is seeded here.
--
-- Local dev credentials: admin@logbook.dev / password123
-- In production, create the first admin via the Supabase dashboard
-- (Authentication > Users) and then:
--   update public.profiles set role = 'admin' where id = '<user-id>';

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'authenticated',
  'authenticated',
  'admin@logbook.dev',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- An email identity row is required for password sign-in.
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  gen_random_uuid(),
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  '{"sub": "f47ac10b-58cc-4372-a567-0e02b2c3d479", "email": "admin@logbook.dev", "email_verified": true}',
  'email',
  now(),
  now(),
  now()
);

-- The profile row was created by the handle_new_user trigger; promote it.
update public.profiles
  set role = 'admin', full_name = 'Admin'
  where id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
