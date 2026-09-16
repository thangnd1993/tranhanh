import { Injectable } from '@angular/core';
import type { TrafficFineLookupRequest, TrafficFineLookupResponse } from '@tranhanh/shared';
import { isTrafficFineLookupResponse, TrafficFineApiError } from './traffic-fine-data';

@Injectable({ providedIn: 'root' })
export class TrafficFineApi {
  async lookup(input: TrafficFineLookupRequest, signal?: AbortSignal): Promise<TrafficFineLookupResponse> {
    let response: Response;
    try {
      response = await fetch('/api/v1/traffic-fines/lookup', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(input),
        credentials: 'omit',
        redirect: 'error',
        signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new TrafficFineApiError(503);
    }
    if (!response.ok) throw new TrafficFineApiError(response.status);
    const value: unknown = await response.json().catch(() => null);
    if (!isTrafficFineLookupResponse(value)) throw new TrafficFineApiError(502);
    return value;
  }
}
