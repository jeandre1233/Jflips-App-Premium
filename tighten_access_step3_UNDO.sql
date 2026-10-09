-- Puts back the two policies that tighten_access_step3.sql drops.
-- Verified: re-creating them gives definitions identical to the originals.

create policy "class_types_coach_read" on class_types for select to public
  using (exists (select 1 from staff_profiles where staff_profiles.id = auth.uid() and staff_profiles.owner_id = class_types.user_id and staff_profiles.status = 'approved'));

create policy "tumbling_students_coach_update" on tumbling_students for update to public
  using (auth.uid() = user_id or exists (select 1 from staff_profiles where staff_profiles.id = auth.uid() and staff_profiles.owner_id = tumbling_students.user_id and staff_profiles.status = 'approved'))
  with check (auth.uid() = user_id or exists (select 1 from staff_profiles where staff_profiles.id = auth.uid() and staff_profiles.owner_id = tumbling_students.user_id and staff_profiles.status = 'approved'));
