export type PlanLimitType = 'photos_per_event' | 'shares_per_event';

export interface PlanLimitDetails {
  type: PlanLimitType;
  planCode: string;
  limit: number | null;
  current: number;
  requested: number;
  eventId: string;
}

export class PlanLimitError extends Error {
  details: PlanLimitDetails;

  constructor(message: string, details: PlanLimitDetails) {
    super(message);
    this.name = 'PlanLimitError';
    this.details = details;
  }
}
