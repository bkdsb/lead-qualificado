import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { fetchDatasetQuality } from '@/lib/meta/dataset-quality';

/**
 * GET /api/meta/dataset-quality — Fetch and store Dataset Quality metrics
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await fetchDatasetQuality();

  if (!result.success || !result.data) {
    return NextResponse.json({
      error: result.error || 'Failed to fetch dataset quality',
    }, { status: 500 });
  }

  // Store snapshot
  const admin = createAdminClient();
  const pixelId = process.env.META_PIXEL_ID || '';

  if (result.data.web) {
    for (const event of result.data.web) {
      await admin.from('dataset_quality_snapshots').insert({
        dataset_id: pixelId,
        event_name: event.event_name,
        composite_score: event.event_match_quality?.composite_score || null,
        match_key_coverage: event.event_match_quality?.match_key_feedback || null,
        event_coverage_pct: event.event_coverage?.percentage || null,
        data_freshness: event.data_freshness?.upload_frequency || null,
        acr_percentage: event.acr?.percentage || null,
        raw_response: event as unknown as Record<string, unknown>,
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: result.data,
  });
}
