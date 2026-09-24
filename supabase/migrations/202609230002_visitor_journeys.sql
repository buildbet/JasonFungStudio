create table if not exists public.analytics_visitors (
  visitor_id uuid primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  visits integer not null default 1 check (visits >= 1),
  first_source text,
  first_medium text,
  first_campaign text,
  latest_source text,
  latest_medium text,
  latest_campaign text,
  device_type text,
  browser text,
  os text,
  country_code text,
  country text,
  region text,
  city text
);

alter table public.analytics_sessions add column if not exists visitor_id uuid;
create index if not exists analytics_sessions_visitor_idx on public.analytics_sessions (visitor_id, started_at desc);

create table if not exists public.analytics_events (
  event_id uuid primary key,
  visitor_id uuid not null,
  session_id text not null,
  pageview_id uuid,
  event_name text not null,
  event_label text,
  event_value numeric,
  event_metadata jsonb not null default '{}'::jsonb,
  page_path text not null,
  occurred_at timestamptz not null default now()
);

create index if not exists analytics_events_visitor_idx on public.analytics_events (visitor_id, occurred_at desc);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id, occurred_at);
create index if not exists analytics_events_name_idx on public.analytics_events (event_name, occurred_at desc);

alter table public.analytics_visitors enable row level security;
alter table public.analytics_events enable row level security;

revoke all on table public.analytics_visitors, public.analytics_events from anon, authenticated;
grant select, insert, update on table public.analytics_visitors, public.analytics_events to service_role;

drop policy if exists "Analytics admin can read visitors" on public.analytics_visitors;
create policy "Analytics admin can read visitors"
on public.analytics_visitors for select to authenticated
using (public.is_analytics_admin());

drop policy if exists "Analytics admin can read events" on public.analytics_events;
create policy "Analytics admin can read events"
on public.analytics_events for select to authenticated
using (public.is_analytics_admin());

create or replace function public.analytics_visitor_journeys(
  p_from timestamptz,
  p_to timestamptz,
  p_device text default null,
  p_source text default null,
  p_country text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_analytics_admin() then raise exception 'Not authorized'; end if;

  with matching_sessions as (
    select * from public.analytics_sessions s
    where s.visitor_id is not null
      and s.started_at >= p_from and s.started_at < p_to
      and (p_device is null or p_device = '' or s.device_type = p_device)
      and (p_source is null or p_source = '' or s.source = p_source)
      and (p_country is null or p_country = '' or s.country_code = p_country)
  ),
  session_rollup as (
    select
      visitor_id,
      min(started_at) as first_visit,
      max(last_seen_at) as last_visit,
      count(*)::integer as visits,
      coalesce(sum(duration_seconds), 0)::integer as total_seconds,
      coalesce(sum(pageviews), 0)::integer as pageviews,
      (array_agg(source order by started_at asc))[1] as first_source,
      (array_agg(medium order by started_at asc))[1] as first_medium,
      (array_agg(source order by started_at desc))[1] as latest_source,
      (array_agg(medium order by started_at desc))[1] as latest_medium,
      (array_agg(device_type order by started_at desc))[1] as device_type
    from matching_sessions group by visitor_id
  ),
  event_rollup as (
    select
      e.visitor_id,
      coalesce(max(case when e.event_name in ('video_progress', 'video_watch', 'video_complete') then (e.event_metadata->>'progress')::integer end), 0) as video_progress,
      coalesce(max(case when e.event_name in ('video_watch', 'video_complete') then (e.event_metadata->>'watch_seconds')::integer end), 0) as video_watch_seconds,
      bool_or(e.event_name = 'confirmation_view') as converted,
      (array_agg(e.event_name order by e.occurred_at desc))[1] as last_action
    from public.analytics_events e
    join (select distinct visitor_id from matching_sessions) s on s.visitor_id = e.visitor_id
    where e.occurred_at >= p_from and e.occurred_at < p_to
    group by e.visitor_id
  ),
  rows as (
    select
      r.*,
      coalesce(v.city, v.region, v.country, v.country_code, 'Unknown') as location,
      coalesce(e.video_progress, 0) as video_progress,
      coalesce(e.video_watch_seconds, 0) as video_watch_seconds,
      coalesce(e.converted, false) as converted,
      coalesce(e.last_action, 'page_view') as last_action
    from session_rollup r
    left join event_rollup e on e.visitor_id = r.visitor_id
    left join public.analytics_visitors v on v.visitor_id = r.visitor_id
    order by r.last_visit desc
    limit 200
  )
  select coalesce(jsonb_agg(to_jsonb(rows)), '[]'::jsonb) into result from rows;
  return result;
end;
$$;

create or replace function public.analytics_visitor_timeline(p_visitor uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_analytics_admin() then raise exception 'Not authorized'; end if;

  select jsonb_build_object(
    'visitor', (select to_jsonb(v) from public.analytics_visitors v where v.visitor_id = p_visitor),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object(
      'session_id', s.session_id,
      'started_at', s.started_at,
      'last_seen_at', s.last_seen_at,
      'source', s.source,
      'medium', s.medium,
      'campaign', s.campaign,
      'duration_seconds', s.duration_seconds,
      'pageviews', s.pageviews,
      'entry_page', s.entry_page,
      'exit_page', s.exit_page
    ) order by s.started_at desc) from public.analytics_sessions s where s.visitor_id = p_visitor), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object(
      'event_name', e.event_name,
      'event_label', e.event_label,
      'event_value', e.event_value,
      'event_metadata', e.event_metadata,
      'page_path', e.page_path,
      'occurred_at', e.occurred_at
    ) order by e.occurred_at desc) from public.analytics_events e where e.visitor_id = p_visitor), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.analytics_visitor_journeys(timestamptz, timestamptz, text, text, text) from public, anon;
grant execute on function public.analytics_visitor_journeys(timestamptz, timestamptz, text, text, text) to authenticated;
revoke all on function public.analytics_visitor_timeline(uuid) from public, anon;
grant execute on function public.analytics_visitor_timeline(uuid) to authenticated;

comment on table public.analytics_visitors is 'Persistent anonymous first-party visitor IDs. No fingerprinting or form contents.';
comment on table public.analytics_events is 'Sanitized funnel and video events for anonymous visitor journey reporting.';
