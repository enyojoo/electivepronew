-- Fix RLS policies for elective_exchange table
-- The original policy referenced non-existent elective_packs table

-- Update the student policy for elective_exchange to use group_id directly
DROP POLICY IF EXISTS "Students can view their group's exchange programs" ON elective_exchange;
CREATE POLICY "Students can view their group's exchange programs"
  ON elective_exchange FOR SELECT
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    group_id = public.get_student_group_id()
  );