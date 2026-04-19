import { getServerEnv, getMetaApiBaseUrl } from '@/lib/config/env';
import type { DatasetQualityResponse } from './types';

/**
 * Fetch Dataset Quality metrics from Meta's Dataset Quality API.
 *
 * GET https://graph.facebook.com/{API_VERSION}/dataset_quality
 *   ?dataset_id={PIXEL_ID}
 *   &access_token={TOKEN}
 *   &fields=web{event_match_quality{composite_score,match_key_feedback{identifier,coverage}},event_name,event_coverage{percentage},data_freshness{upload_frequency},acr{percentage}}
 */
export async function fetchDatasetQuality(): Promise<{
  success: boolean;
  data: DatasetQualityResponse | null;
  error?: string;
}> {
  const env = getServerEnv();
  const baseUrl = getMetaApiBaseUrl();

  const fields = [
    'web{',
    'event_match_quality{composite_score,match_key_feedback{identifier,coverage,potential_aly_acr_increase{percentage,description}},diagnostics},',
    'event_name,',
    'event_coverage{percentage,goal_percentage,description},',
    'data_freshness{upload_frequency,description},',
    'acr{percentage,description}',
    '}',
  ].join('');

  const params = new URLSearchParams({
    dataset_id: env.META_PIXEL_ID,
    access_token: env.META_ACCESS_TOKEN,
    fields,
  });

  const url = `${baseUrl}/dataset_quality?${params.toString()}`;

  try {
    const res = await fetch(url);
    const body = await res.json();

    if (body.error) {
      return {
        success: false,
        data: null,
        error: body.error.message,
      };
    }

    return {
      success: true,
      data: body as DatasetQualityResponse,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch dataset quality',
    };
  }
}
