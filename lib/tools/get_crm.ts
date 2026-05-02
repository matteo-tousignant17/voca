import crmData from "@/data/crm_segments.json";

export type CRMSegment = {
  label: string;
  description: string;
  customers: number;
  avg_arr: number;
  total_arr: number;
  churn_rate_annual: number;
  expansion_potential: string;
  color: string;
};

export type CRMData = {
  company: string;
  total_customers: number;
  total_arr: number;
  segments: Record<string, CRMSegment>;
};

export function getCRMSegments(): CRMData {
  return crmData as CRMData;
}
