-- KhamaKey v60 — allinea event_type alle nuove categorie Moments (fix salvataggio template)

alter table public.moment_events
  drop constraint if exists moment_events_event_type_check;

alter table public.moment_events
  add constraint moment_events_event_type_check
  check (event_type in (
    'free','love','mom','dad','child','kids','memory','photo','pet',
    'communion','baptism','friendship','family','valentine','christmas','birthday',
    'wedding','party','travel','memorial','portfolio',
    'corporate','ceremony','private_party','other'
  ));
