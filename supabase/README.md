# Supabase database setup

Database migrations are intentionally not included in this scaffold commit because the uploaded ZIP's SQL has not yet been independently inspected or executed.

Before creating a Supabase project or using real records:
1. Review and add version-controlled SQL migrations.
2. Enable and test RLS for every sensitive table.
3. Test student-to-student and lecturer-assignment isolation.
4. Test session submission completeness, duplicate prevention, and audit behaviour.
5. Run migrations and database tests against a local PostgreSQL/Supabase environment.

Do not treat the archived ZIP or architecture notes as proof that the database layer is verified.
