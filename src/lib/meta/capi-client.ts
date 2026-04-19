import { getServerEnv, getMetaApiBaseUrl } from '@/lib/config/env';
import type { MetaEventPayload, MetaEventResponse } from './types';

/**
 * Send events to Meta Conversions API.
 *
 * POST https://graph.facebook.com/{API_VERSION}/{PIXEL_ID}/events?access_token={TOKEN}
 */
export async function sendEventsToMeta(
  payload: MetaEventPayload
): Promise<{
  success: boolean;
  status: number;
  response: MetaEventResponse;
}> {
  const env = getServerEnv();
  const baseUrl = getMetaApiBaseUrl();
  const url = `${baseUrl}/${env.META_PIXEL_ID}/events`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        access_token: env.META_ACCESS_TOKEN,
      }),
    });

    const body = await res.json() as MetaEventResponse;

    return {
      success: res.ok && !body.error,
      status: res.status,
      response: body,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      status: 0,
      response: {
        error: {
          message: `Network error: ${message}`,
          type: 'NetworkError',
          code: 0,
        },
      },
    };
  }
}

/**
 * Verify the CAPI connection by checking if the pixel/dataset is accessible.
 * Makes a simple GET request to the pixel endpoint.
 */
export async function verifyCapiConnection(): Promise<{
  success: boolean;
  pixelId: string;
  error?: string;
}> {
  const env = getServerEnv();
  const baseUrl = getMetaApiBaseUrl();
  const url = `${baseUrl}/${env.META_PIXEL_ID}?fields=name,id&access_token=${env.META_ACCESS_TOKEN}`;

  try {
    const res = await fetch(url);
    const body = await res.json();

    if (body.error) {
      return {
        success: false,
        pixelId: env.META_PIXEL_ID,
        error: body.error.message,
      };
    }

    return {
      success: true,
      pixelId: body.id || env.META_PIXEL_ID,
    };
  } catch (error) {
    return {
      success: false,
      pixelId: env.META_PIXEL_ID,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}
