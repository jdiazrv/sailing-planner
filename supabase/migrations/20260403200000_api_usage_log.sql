-- Table to track external API usage (Google Maps, Places, etc.)
-- Used to monitor approach to free-tier limits without relying on external dashboards.

CREATE TABLE public.api_usage_log (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  event_date  date    NOT NULL DEFAULT CURRENT_DATE,
  service     text    NOT NULL, -- 'google_maps' | 'google_places' | 'google_custom_search'
  sku         text    NOT NULL, -- 'dynamic_maps' | 'autocomplete_session' | 'place_details_essentials'
  event_count integer NOT NULL DEFAULT 1,
  created_at  timestamptz DEFAULT NOW(),
  CONSTRAINT api_usage_log_event_service_sku_key UNIQUE (event_date, service, sku)
);

CREATE INDEX api_usage_log_service_date_idx ON public.api_usage_log (service, event_date);
CREATE INDEX api_usage_log_date_idx         ON public.api_usage_log (event_date DESC);

-- Only superusers may read or write usage logs
ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superuser can manage api_usage_log"
  ON public.api_usage_log
  FOR ALL
  USING (current_user_is_superuser())
  WITH CHECK (current_user_is_superuser());

-- Aggregated daily upsert helper called from the app to avoid
-- inserting one row per event; instead increments an existing row.
CREATE OR REPLACE FUNCTION public.record_api_usage(
  p_service text,
  p_sku     text,
  p_count   integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.api_usage_log (event_date, service, sku, event_count)
  VALUES (CURRENT_DATE, p_service, p_sku, p_count)
  ON CONFLICT (event_date, service, sku)
  DO UPDATE
     SET event_count = public.api_usage_log.event_count + EXCLUDED.event_count;
END;
$$;

COMMENT ON TABLE  public.api_usage_log               IS 'Daily aggregated counts of external API calls for cost monitoring.';
COMMENT ON COLUMN public.api_usage_log.service       IS 'Top-level service name: google_maps, google_places, google_custom_search.';
COMMENT ON COLUMN public.api_usage_log.sku           IS 'Google billing SKU: dynamic_maps, autocomplete_session, place_details_essentials.';
COMMENT ON COLUMN public.api_usage_log.event_count   IS 'Cumulative events on this date for this service+sku combination.';
