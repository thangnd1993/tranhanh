export type ServiceStatus = 'ok' | 'unavailable';

export interface HealthResponse {
  service: string;
  status: ServiceStatus;
  timestamp: string;
}

export interface ReadinessResponse extends HealthResponse {
  checks: {
    database: ServiceStatus;
    redis: ServiceStatus;
  };
}
