import fs from "fs/promises";
import path from "path";
import type {
  ChangeStats,
  DashboardConfig,
  FeatureImportance,
  LimeExplanations,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "public", "data");

async function loadJson<T>(filename: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, filename), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadDashboardData() {
  const [config, stats, featureImportance, lime] = await Promise.all([
    loadJson<DashboardConfig>("config.json"),
    loadJson<ChangeStats>("change_stats.json"),
    loadJson<FeatureImportance[]>("feature_importance.json"),
    loadJson<LimeExplanations>("lime_explanations.json"),
  ]);

  if (!config || !stats) {
    throw new Error("Missing config.json or change_stats.json in public/data/");
  }

  return {
    config,
    stats,
    featureImportance: featureImportance ?? [],
    lime,
  };
}
