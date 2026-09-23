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

export interface TerraTraceKPI {
  newly_inundated_km2: number;
  total_lulc_change_km2: number;
  agriculture_to_water_km2: number;
  vegetation_to_water_km2: number;
  builtup_to_water_km2: number;
  study_area_km2: number;
  inundated_water_km2?: number;
  vegetation_loss_km2?: number;
  veg_to_bare_soil_km2?: number;
  agri_to_bare_soil_km2?: number;
}

export interface LULCTransition {
  pre: string;
  post: string;
  emoji: string;
  area_km2: number;
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
  kpi: TerraTraceKPI;
  transitions: LULCTransition[];
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
  eventDate?: string;
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

export type MapLayerGroup =
  | "base_pre"
  | "base_flood"
  | "flood_indices"
  | "binary_flood"
  | "lulc"
  | "transformation"
  | "hotspots";

export type TimePeriod = "pre" | "post_immediate" | "post_persistence";
