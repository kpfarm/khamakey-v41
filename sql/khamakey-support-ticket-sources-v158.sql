-- KhamaKey v158 — permette ticket creati dagli editor clienti
-- v89 ha aperto le policy RLS per business_editor / moments_editor / account_area
-- ma il CHECK su source non era stato allargato → insert cliente sempre falliva.

alter table public.platform_support_tickets
  drop constraint if exists platform_support_tickets_source_check;

alter table public.platform_support_tickets
  add constraint platform_support_tickets_source_check
  check (source in (
    'admin',
    'email',
    'public_page',
    'whatsapp',
    'phone',
    'business_editor',
    'moments_editor',
    'account_area'
  ));
