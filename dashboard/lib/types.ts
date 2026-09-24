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
  pct_aoi?: number;
}

export interface FloodRiskArea {
  label: string;
  class_id: number;
  color: string;
  area_km2: number;
}

export interface ChartBarItem {
  label: string;
  km2: number;
  color?: string;
}

export interface DashboardCharts {
  transitions: ChartBarItem[];
  flood_risk_by_prior: ChartBarItem[];
  ml_comparison: ChartBarItem[];
}

export interface MlComparison {
  rule_based_km2: number;
  ml_km2: number;
  overlap_km2: number;
  agreement_pct: number;
}

export interface PixelInspection {
  lat: number;
  lng: number;
  mndwi_pre: number;
  mndwi_flood: number;
  ndwi_pre: number;
  ndwi_flood: number;
  lulc_pre: string;
  lulc_flood: string;
  permanent_water: boolean;
  valid_pixel: boolean;
  classification: string;
  classification_color: string;
  ml_class: string;
  rules: { ok: boolean; text: string; icon: string }[];
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
    ml_agreement_pct?: number;
  };
  kpi: TerraTraceKPI;
  transitions: LULCTransition[];
  flood_risk?: FloodRiskArea[];
  ml_comparison?: MlComparison;
  charts?: DashboardCharts;
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
  mapTileLayers?: Partial<Record<MapLayerId, string>>;
}

export type MapLayerId =
  | "base_pre"
  | "base_flood"
  | "mndwi_pre"
  | "mndwi_flood"
  | "delta_mndwi"
  | "ndwi_pre"
  | "ndwi_flood"
  | "delta_ndwi"
  | "binary_flood"
  | "lulc_pre"
  | "lulc_flood"
  | "lulc_change"
  | "transformation"
  | "flood_risk"
  | "flood_damage"
  | "bare_soil"
  | "ml_classification"
  | "ml_agreement"
  | "hotspots";

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
export type MapViewMode = "main" | "swipe";
