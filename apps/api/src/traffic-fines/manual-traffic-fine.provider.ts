import { Injectable } from '@nestjs/common';
import type { TrafficFineProviderInfo } from '@tranhanh/shared';
import type { TrafficFineProvider, TrafficFineProviderResult } from './traffic-fine-provider.js';

export const CSGT_LOOKUP_URL = 'https://www.csgt.vn/tra-cuu-phuong-tien-vi-pham.html';
@Injectable()
export class ManualTrafficFineProvider implements TrafficFineProvider {
  describe(): TrafficFineProviderInfo {
    return {
      key: 'csgt-manual',
      name: 'Cục Cảnh sát giao thông — tra cứu vi phạm qua hình ảnh',
      official: true,
      url: CSGT_LOOKUP_URL,
      automation: 'MANUAL_ONLY',
      status: 'DISABLED',
      geographicCoverage:
        'Vietnam; effective coverage and publication delay are not guaranteed by a public API contract.',
      supportedVehicleTypes: ['CAR', 'MOTORCYCLE', 'ELECTRIC_BICYCLE'],
      requiresCaptcha: true,
      requiresAuthentication: false,
      freshness: 'The public page does not publish a machine-readable freshness guarantee.',
    };
  }
  async lookup(): Promise<TrafficFineProviderResult> {
    return {
      outcome: 'MANUAL_VERIFICATION_REQUIRED',
      records: [],
      retrievedAt: new Date().toISOString(),
      limitations: [
        { code: 'CAPTCHA_REQUIRED', message: 'The official lookup requires a user-entered security code.' },
        { code: 'MANUAL_LOOKUP_ONLY', message: 'Complete verification directly on the official CSGT page.' },
        { code: 'NO_PUBLIC_API', message: 'No documented official public automation API was verified.' },
        {
          code: 'COVERAGE_NOT_GUARANTEED',
          message: 'No matching record must not be interpreted as a nationwide guarantee of no violations.',
        },
        { code: 'FRESHNESS_NOT_PUBLISHED', message: 'The source does not publish a machine-readable update SLA.' },
      ],
    };
  }
}
