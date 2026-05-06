CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.branding_status AS ENUM ('submitted', 'manager_approved', 'manager_rejected', 'assigned', 'in_progress', 'executed', 'verified');
CREATE TYPE public.employee_doc_type AS ENUM ('address_proof', 'id_proof', 'other');
CREATE TYPE public.user_status AS ENUM ('pending_completion', 'pending_approval', 'approved', 'rejected', 'active', 'inactive');
CREATE TYPE public.pm_project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE public.pm_task_status AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled', 'overdue');
CREATE TYPE public.pm_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE public.pm_task_type AS ENUM ('epic', 'story', 'task', 'bug', 'idea', 'milestone');
CREATE TYPE public.pm_sprint_status AS ENUM ('planning', 'active', 'completed', 'cancelled');
CREATE TYPE public.pm_member_role AS ENUM ('owner', 'manager', 'developer', 'designer', 'tester', 'viewer');