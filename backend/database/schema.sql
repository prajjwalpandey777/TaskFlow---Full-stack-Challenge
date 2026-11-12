CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(120) NOT NULL,
  description VARCHAR(1000) NOT NULL DEFAULT '',
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  category VARCHAR(40) NOT NULL DEFAULT 'General',
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_user_created_idx
  ON public.tasks (user_id, created_at DESC);
