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
      coalesce(max(case when e.event_name = 'section_view' then e.event_value::integer end), 0) as furthest_section_order,
      (array_agg(e.event_label order by e.event_value desc, e.occurred_at desc) filter (where e.event_name = 'section_view'))[1] as furthest_section,
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
      coalesce(e.furthest_section_order, 0) as furthest_section_order,
      e.furthest_section,
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

revoke all on function public.analytics_visitor_journeys(timestamptz, timestamptz, text, text, text) from public, anon;
grant execute on function public.analytics_visitor_journeys(timestamptz, timestamptz, text, text, text) to authenticated;
