-- KhamaKey v171 — Moments: video singolo fino a 50 MB (resta 1 clip sul Free)
-- Alza solo max_video_mb; video_clips Free resta 1.

update public.platform_plans
set
  limits = jsonb_set(coalesce(limits, '{}'::jsonb), '{max_video_mb}', '50'::jsonb, true),
  updated_at = now()
where plan_key in ('moments_free', 'moments_plus', 'moments_pro')
  or coalesce(limits->>'product', '') = 'moments';

create or replace function app_private.default_moments_plan_limits()
returns jsonb
language sql
immutable
as $$
  select '{
    "product":"moments",
    "storage_mb":250,
    "gallery_images":24,
    "video_clips":1,
    "music_audio":1,
    "letter_images":2,
    "letter_videos":1,
    "letter_audio":1,
    "letter_pdfs":1,
    "journey_steps":24,
    "max_image_mb":8,
    "max_video_mb":50,
    "max_audio_mb":12,
    "max_pdf_mb":15
  }'::jsonb
$$;

revoke all on function app_private.default_moments_plan_limits() from public;
