import crmData from "@/data/crm_segments.json";

export type CRMIndustryShare = {
  industry: string;
  pct: number;
};

export type CRMAtRiskAccount = {
  name: string;
  arr: number;
  risk_reason: string;
};

export type CRMSegment = {
  label: string;
  description: string;
  customers: number;
  avg_arr: number;
  total_arr: number;
  churn_rate_annual: number;
  expansion_potential: string;
  color: string;
  nps_current?: number;
  nps_trend_6mo?: number;
  recent_churned_arr_90d?: number;
  industry_breakdown?: CRMIndustryShare[];
  top_at_risk_accounts?: CRMAtRiskAccount[];
};

export type CRMData = {
  company: string;
  total_customers: number;
  total_arr: number;
  as_of?: string;
  segments: Record<string, CRMSegment>;
};

export function getCRMSegments(): CRMData {
  return crmData as CRMData;
}
