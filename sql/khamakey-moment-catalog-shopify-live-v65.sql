-- KhamaKey v65 — bozza Shopify finché il prodotto non è completo e pubblicato
-- Aggiunge shopify_live: sync crea sempre il prodotto su Shopify, ma status=active solo se shopify_live=true + contenuti ok.

alter table platform_moment_catalog
  add column if not exists shopify_live boolean not null default false;

comment on column platform_moment_catalog.shopify_live is
  'Se true e contenuti completi (immagine + descrizione), sync Shopify imposta status active; altrimenti draft.';
