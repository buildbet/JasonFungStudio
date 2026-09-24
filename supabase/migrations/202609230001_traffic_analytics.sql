create extension if not exists pgcrypto;

create table if not exists public.analytics_sessions (
  session_id text primary key,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  pageviews integer not null default 0 check (pageviews >= 0),
  entry_page text,
  exit_page text,
  referrer_url text,
  referrer_host text,
  source text not null default 'direct',
  medium text not null default 'none',
  campaign text,
  content text,
  term text,
  device_type text,
  browser text,
  os text,
  language text,
  timezone text,
  country_code text,
  country text,
  region text,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_pageviews (
  pageview_id uuid primary key,
  session_id text not null references public.analytics_sessions(session_id) on delete cascade,
  viewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  page_path text not null,
  page_title text,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  active_seconds integer not null default 0 check (active_seconds >= 0),
  max_scroll smallint not null default 0 check (max_scroll between 0 and 100),
  viewport_width integer,
  viewport_height integer,
  screen_width integer,
  screen_height integer
);

create index if not exists analytics_sessions_started_at_idx on public.analytics_sessions (started_at desc);
create index if not exists analytics_sessions_source_idx on public.analytics_sessions (source);
create index if not exists analytics_sessions_device_idx on public.analytics_sessions (device_type);
create index if not exists analytics_sessions_country_idx on public.analytics_sessions (country_code);
create index if not exists analytics_pageviews_viewed_at_idx on public.analytics_pageviews (viewed_at desc);
create index if not exists analytics_pageviews_session_idx on public.analytics_pageviews (session_id);

alter table public.analytics_sessions enable row level security;
alter table public.analytics_pageviews enable row level security;

revoke all on table public.analytics_sessions, public.analytics_pageviews from anon, authenticated;
grant select, insert, update on table public.analytics_sessions, public.analytics_pageviews to service_role;

create or replace function public.is_analytics_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'jasonfungstudio@gmail.com';
$$;

revoke all on function public.is_analytics_admin() from public, anon;
grant execute on function public.is_analytics_admin() to authenticated;

drop policy if exists "Analytics admin can read sessions" on public.analytics_sessions;
create policy "Analytics admin can read sessions"
on public.analytics_sessions for select
to authenticated
using (public.is_analytics_admin());

drop policy if exists "Analytics admin can read pageviews" on public.analytics_pageviews;
create policy "Analytics admin can read pageviews"
on public.analytics_pageviews for select
to authenticated
using (public.is_analytics_admin());

create or replace function public.analytics_dashboard(
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
  if not public.is_analytics_admin() then
    raise exception 'Not authorized';
  end if;

  with filtered_sessions as (
    select *
    from public.analytics_sessions s
    where s.started_at >= p_from
      and s.started_at < p_to
      and (p_device is null or p_device = '' or s.device_type = p_device)
      and (p_source is null or p_source = '' or s.source = p_source)
      and (p_country is null or p_country = '' or s.country_code = p_country)
  ),
  filtered_pageviews as (
    select p.*
    from public.analytics_pageviews p
    join filtered_sessions s on s.session_id = p.session_id
  ),
  session_engagement as (
    select s.session_id, coalesce(sum(p.active_seconds), 0)::integer as active_seconds
    from filtered_sessions s
    left join filtered_pageviews p on p.session_id = s.session_id
    group by s.session_id
  ),
  metrics as (
    select
      count(*)::integer as sessions,
      coalesce(sum(s.pageviews), 0)::integer as pageviews,
      coalesce(round(avg(s.duration_seconds)), 0)::integer as avg_duration_seconds,
      coalesce(round(avg(e.active_seconds)), 0)::integer as avg_active_seconds,
      coalesce(round(100.0 * count(*) filter (where s.pageviews <= 1) / nullif(count(*), 0), 1), 0) as bounce_rate
    from filtered_sessions s
    join session_engagement e on e.session_id = s.session_id
  ),
  daily as (
    select date_trunc('day', started_at)::date as day, count(*)::integer as sessions, sum(pageviews)::integer as pageviews
    from filtered_sessions group by 1 order by 1
  ),
  sources as (
    select
      case
        when source = 'direct' then 'Direct'
        else initcap(source) || ' · ' || case medium
          when 'paid' then 'Paid'
          when 'organic' then 'Organic search'
          when 'social' then 'Social'
          when 'campaign' then 'Campaign'
          when 'referral' then 'Referral'
          else initcap(medium)
        end
      end as label,
      count(*)::integer as sessions
    from filtered_sessions
    group by source, medium
    order by sessions desc, label
    limit 16
  ),
  devices as (
    select coalesce(device_type, 'unknown') as label, count(*)::integer as sessions
    from filtered_sessions group by device_type order by sessions desc, label
  ),
  locations as (
    select
      coalesce(nullif(concat_ws(', ', nullif(city, ''), nullif(region, ''), nullif(country, '')), ''), 'Unknown') as label,
      country_code,
      count(*)::integer as sessions
    from filtered_sessions
    group by label, country_code order by sessions desc, label limit 20
  ),
  pages as (
    select page_path as label, count(*)::integer as pageviews,
      coalesce(round(avg(active_seconds)), 0)::integer as avg_active_seconds,
      coalesce(round(avg(max_scroll)), 0)::integer as avg_scroll
    from filtered_pageviews group by page_path order by pageviews desc, label limit 20
  ),
  filter_sessions as (
    select * from public.analytics_sessions where started_at >= p_from and started_at < p_to
  )
  select jsonb_build_object(
    'metrics', (select to_jsonb(m) from metrics m),
    'daily', coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from daily d), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(to_jsonb(s)) from sources s), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(to_jsonb(d)) from devices d), '[]'::jsonb),
    'locations', coalesce((select jsonb_agg(to_jsonb(l)) from locations l), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(to_jsonb(p)) from pages p), '[]'::jsonb),
    'filters', jsonb_build_object(
      'sources', coalesce((select jsonb_agg(source order by source) from (select distinct source from filter_sessions where source is not null) q), '[]'::jsonb),
      'devices', coalesce((select jsonb_agg(device_type order by device_type) from (select distinct device_type from filter_sessions where device_type is not null) q), '[]'::jsonb),
      'countries', coalesce((select jsonb_agg(jsonb_build_object('code', country_code, 'name', coalesce(country, country_code)) order by coalesce(country, country_code)) from (select distinct country_code, country from filter_sessions where country_code is not null) q), '[]'::jsonb)
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.analytics_dashboard(timestamptz, timestamptz, text, text, text) from public, anon;
grant execute on function public.analytics_dashboard(timestamptz, timestamptz, text, text, text) to authenticated;

comment on table public.analytics_sessions is 'Anonymous first-party website analytics sessions. Raw IP addresses and form data are never stored.';
comment on table public.analytics_pageviews is 'Anonymous page engagement metrics linked to analytics sessions.';
