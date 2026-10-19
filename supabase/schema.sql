-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ACCOUNTS (Tenants)
create table public.accounts (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  plan text check (plan in ('basic', 'premium')) default 'basic',
  modules text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- USERS (Extends Supabase Auth)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text,
  role text check (role in ('superadmin', 'admin', 'user', 'manager', 'editor', 'data_user')) default 'user',
  account_id uuid references public.accounts(id),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PROJECTS
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  address text,
  account_id uuid references public.accounts(id) not null,
  status text check (status in ('active', 'completed', 'archived')) default 'active',
  logo_url text,
  cde_config jsonb default '{}'::jsonb, -- configuration for cloud providers
  card_config jsonb default '{}'::jsonb, -- worker card design configuration
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PROJECT MEMBERS (Access Control)
create table public.project_members (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text check (role in ('manager', 'editor', 'viewer', 'data_user')) default 'viewer',
  allowed_modules text[] default array[]::text[],
  company_id uuid, -- For data_user restriction (circular ref handled by straight uuid type if table not created yet)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, user_id)
);

-- COMPANIES
create table public.companies (
  id uuid default uuid_generate_v4() primary key,
  account_id uuid references public.accounts(id) not null,
  project_id uuid references public.projects(id), -- Optional direct link, though often it's many-to-many via subcontracts. Assuming simple list for now.
  
  name text not null,
  nif text,
  activity text,
  impic text,
  email text,
  phone text,
  address text,
  
  -- Site Details
  entry_date date,
  work_schedule text,
  site_manager text,
  site_contact text,
  
  -- Insurance & Docs
  insurance_civil_date date,
  insurance_civil_policy text,
  insurance_work_acc_date date,
  insurance_work_acc_policy text,
  clean_ss_date date,
  clean_fin_date date,
  ss_discount_sheet text, -- Ref to file or string
  pss_acceptance_date date,
  
  -- Hierarchy
  tier integer check (tier between 1 and 4),
  parent_id uuid references public.companies(id), -- Self referential for subcontracts
  exit_date date,
  work_schedule_delivered boolean default false,
  
  -- Workflow
  workflow_status text check (workflow_status in ('draft', 'data_requested', 'validation_pending', 'validated', 'incomplete', 'off_site')) default 'draft',
  assigned_data_user_id uuid references public.users(id),
  field_validations jsonb default '{}'::jsonb,
  
  archived boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- WORKERS
create table public.workers (
  id uuid default uuid_generate_v4() primary key,
  account_id uuid references public.accounts(id) not null,
  project_id uuid references public.projects(id),
  company_id uuid references public.companies(id) not null,
  
  name text not null,
  role text,
  email text,
  phone text,
  nif text,
  
  -- Identification
  birth_date date,
  id_card_expiry date,
  address text,
  is_foreign boolean default false,
  residency_expiry date,
  
  -- Professional
  contract_expiry date,
  
  -- Safety
  medical_expiry date,
  epi_date date,
  induction_date date,
  specific_training_date date,
  
  -- Access
  access_card_code text unique,
  access_card_valid boolean default false,
  avatar_url text,
  
  -- Workflow
  workflow_status text check (workflow_status in ('draft', 'data_requested', 'validation_pending', 'validated', 'expired', 'incomplete')) default 'draft',
  assigned_data_user_id uuid references public.users(id),
  field_validations jsonb default '{}'::jsonb,
  
  archived boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- EQUIPMENT
create table public.equipment (
  id uuid default uuid_generate_v4() primary key,
  account_id uuid references public.accounts(id) not null,
  project_id uuid references public.projects(id),
  company_id uuid references public.companies(id) not null,
  
  name text not null,
  type text not null,
  serial_number text,
  status text check (status in ('operational', 'maintenance', 'out_of_service')) default 'operational',
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- DOCUMENTS
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  size text,
  type text,
  url text,
  entity_id uuid not null, -- Polymorphic ID (Company, Worker, etc.)
  project_id uuid references public.projects(id),
  category text,
  provider text check (provider in ('onedrive', 'gdrive', 'dropbox', 'local')) default 'local',
  status text check (status in ('synced', 'pending', 'error')) default 'synced',
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PDF TEMPLATES
create table public.pdf_templates (
  id uuid default uuid_generate_v4() primary key,
  account_id uuid references public.accounts(id) not null,
  name text not null,
  config jsonb not null default '{}'::jsonb,
  header_data jsonb not null default '{}'::jsonb,
  footer_data jsonb not null default '{}'::jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
