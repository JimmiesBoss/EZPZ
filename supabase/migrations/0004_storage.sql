-- Storage for generated PDF reports (brief §5.3).
-- export-pdf uploads here (service role) and returns a short-lived signed URL,
-- so the bucket is private — no anon/authenticated access policy is needed;
-- signed URLs are generated server-side and grant temporary read access.

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;
