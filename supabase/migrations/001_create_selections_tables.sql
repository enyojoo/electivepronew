-- Create course_selections table
create table public.course_selections (
  id uuid not null default gen_random_uuid (),
  student_id uuid not null,
  elective_courses_id uuid not null,
  status character varying(50) null default 'pending'::character varying,
  statement_url character varying(255) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  selected_course_ids uuid[] null,
  authorized_by text null,
  constraint course_selections_pkey primary key (id),
  constraint course_selections_elective_courses_id_fkey foreign KEY (elective_courses_id) references elective_courses (id) on delete RESTRICT,
  constraint course_selections_student_id_fkey foreign KEY (student_id) references profiles (id) on delete CASCADE,
  constraint course_selections_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'approved'::character varying,
            'rejected'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

-- Create indexes for course_selections
create index IF not exists idx_course_selections_student_id on public.course_selections using btree (student_id) TABLESPACE pg_default;
create index IF not exists idx_course_selections_elective_courses_id on public.course_selections using btree (elective_courses_id) TABLESPACE pg_default;
create index IF not exists idx_course_selections_status on public.course_selections using btree (status) TABLESPACE pg_default;

-- Create trigger for course_selections updated_at
create trigger update_course_selections_updated_at BEFORE
update on course_selections for EACH row
execute FUNCTION update_updated_at ();

-- Create exchange_selections table
create table public.exchange_selections (
  id uuid not null default gen_random_uuid (),
  student_id uuid not null,
  elective_exchange_id uuid not null,
  status character varying(50) null default 'pending'::character varying,
  statement_url character varying(255) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  selected_university_ids uuid[] null,
  authorized_by text null,
  constraint exchange_selections_pkey primary key (id),
  constraint exchange_selections_elective_exchange_id_fkey foreign KEY (elective_exchange_id) references elective_exchange (id) on delete RESTRICT,
  constraint exchange_selections_student_id_fkey foreign KEY (student_id) references profiles (id) on delete CASCADE,
  constraint exchange_selections_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'approved'::character varying,
            'rejected'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

-- Create indexes for exchange_selections
create index IF not exists idx_exchange_selections_student_id on public.exchange_selections using btree (student_id) TABLESPACE pg_default;
create index IF not exists idx_exchange_selections_elective_exchange_id on public.exchange_selections using btree (elective_exchange_id) TABLESPACE pg_default;
create index IF not exists idx_exchange_selections_status on public.exchange_selections using btree (status) TABLESPACE pg_default;

-- Create trigger for exchange_selections updated_at
create trigger update_exchange_selections_updated_at BEFORE
update on exchange_selections for EACH row
execute FUNCTION update_updated_at ();