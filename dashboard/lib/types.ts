export interface FeatureImportance {
  feature: string;
  importance_pct: number;
  label: string;
}

export interface ChangeClass {
  id: number;
  name: string;
  color: string;
  area_km2: number;
  pct: number;
}

export interface Period {
  start: string;
  end: string;
  label: string;
}

export interface Hotspot {
  name: string;
  lat: number;
  lng: number;
  severity: "low" | "medium" | "high";
  class_id?: number;
  hotspot_score?: number;
}

export interface ChangeStats {
  summary: {
    study_area_km2: number;
    changed_area_km2: number;
    changed_pct: number;
    persistent_change_km2: number;
    model_accuracy: number;
    kappa: number;
    oob_error: number;
  };
  classes: ChangeClass[];
  periods: {
    pre: Period;
    post_immediate: Period;
    post_persistence: Period;
  };
  hotspots: Hotspot[];
}

export interface DashboardConfig {
  brand?: string;
  title: string;
  subtitle: string;
  mapCenter: [number, number];
  mapZoom: number;
  dataSources: string[];
  mlModel: string;
  xaiMethod: string;
  eeAssets: Record<string, string>;
  dataSource?: "sample" | "real";
}

export interface LimeFeatureWeight {
  feature: string;
  label: string;
  weight?: number;
  importance?: number;
  importance_pct?: number;
}

export interface LimeLocalExplanation {
  id: string;
  class_id: number;
  class_name: string;
  lat: number;
  lng: number;
  predicted_class: number;
  features: LimeFeatureWeight[];
}

export interface LimeExplanations {
  method: string;
  sklearn_validation_accuracy: number;
  samples_explained: number;
  global: LimeFeatureWeight[];
  local: LimeLocalExplanation[];
}

export type TimePeriod = "pre" | "post_immediate" | "post_persistence";
