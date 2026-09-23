#!/usr/bin/env python3
"""
Run LIME XAI on GEE-exported training/validation samples.

Input:  data/raw/01_dashboard_validation_samples*.csv
        data/raw/02_dashboard_training_samples*.csv

Output: dashboard/public/data/lime_explanations.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from lime.lime_tabular import LimeTabularExplainer
from sklearn.ensemble import RandomForestClassifier

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "dashboard" / "public" / "data"
LABELS = json.loads((Path(__file__).parent / "feature_labels.json").read_text())

CLASS_NAMES = {
    0: "No Change",
    1: "Newly Inundated",
    2: "Vegetation Loss",
    3: "Built-up Alteration",
}

META_COLS = {
    "class",
    "classification",
    "predicted_class",
    "system:index",
    "random",
    ".geo",
    "longitude",
    "latitude",
}


def find_file(prefix: str) -> Path:
    if not RAW.exists():
        sys.exit(f"Missing {RAW}. Download GEE CSV exports first.")
    matches = sorted(RAW.glob(f"*{prefix}*"))
    if not matches:
        sys.exit(f"No file matching '{prefix}' in {RAW}")
    return matches[0]


def load_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.columns = [c.strip() for c in df.columns]
    return df


def feature_columns(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if c not in META_COLS and not c.startswith("Unnamed")]


def prepare_xy(df: pd.DataFrame, features: list[str]):
    x = df[features].apply(pd.to_numeric, errors="coerce").fillna(0.0)
    y = pd.to_numeric(df["class"], errors="coerce").astype(int)
    return x, y


def extract_feature_name(lime_key: str, features: list[str]) -> str:
    for feat in sorted(features, key=len, reverse=True):
        if feat in lime_key:
            return feat
    return lime_key


def main():
    train_path = find_file("02_dashboard_training_samples")
    val_path = find_file("01_dashboard_validation_samples")

    train_df = load_csv(train_path)
    val_df = load_csv(val_path)

    features = feature_columns(train_df)
    if not features:
        sys.exit("No feature columns found in training CSV.")

    x_train, y_train = prepare_xy(train_df, features)
    x_val, y_val = prepare_xy(val_df, features)

    clf = RandomForestClassifier(
        n_estimators=300,
        max_features=4,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(x_train, y_train)

    val_acc = float(clf.score(x_val, y_val))
    print(f"Validation accuracy (sklearn RF): {val_acc:.3f}")

    explainer = LimeTabularExplainer(
        x_train.values,
        feature_names=features,
        class_names=[CLASS_NAMES[i] for i in sorted(CLASS_NAMES)],
        mode="classification",
        discretize_continuous=True,
        random_state=42,
    )

    # Explain up to 3 samples per change class (skip class 0 for clarity)
    local_explanations = []
    global_weights: dict[str, list[float]] = {f: [] for f in features}

    for class_id in sorted(CLASS_NAMES):
        if class_id == 0:
            continue
        idxs = np.where(y_val.values == class_id)[0][:3]
        for idx in idxs:
            exp = explainer.explain_instance(
                x_val.iloc[idx].values,
                clf.predict_proba,
                num_features=min(10, len(features)),
                top_labels=1,
            )
            label = exp.top_labels[0]
            raw_weights = exp.as_list(label=label)
            parsed: dict[str, float] = {}
            for feat_key, weight in raw_weights:
                feat = extract_feature_name(feat_key, features)
                parsed[feat] = parsed.get(feat, 0.0) + float(weight)
                global_weights[feat].append(abs(float(weight)))

            row = val_df.iloc[idx]
            local_explanations.append(
                {
                    "id": f"sample_{class_id}_{idx}",
                    "class_id": int(class_id),
                    "class_name": CLASS_NAMES[class_id],
                    "lat": float(row.get("latitude", 0)),
                    "lng": float(row.get("longitude", 0)),
                    "predicted_class": int(clf.predict(x_val.iloc[[idx]])[0]),
                    "features": [
                        {
                            "feature": k,
                            "label": LABELS.get(k, k),
                            "weight": round(v, 4),
                        }
                        for k, v in sorted(parsed.items(), key=lambda x: abs(x[1]), reverse=True)
                    ],
                }
            )

    global_importance = []
    for feat in features:
        vals = global_weights.get(feat, [])
        mean_abs = float(np.mean(vals)) if vals else 0.0
        global_importance.append(
            {
                "feature": feat,
                "label": LABELS.get(feat, feat),
                "importance": round(mean_abs, 4),
            }
        )

    total = sum(g["importance"] for g in global_importance) or 1.0
    for g in global_importance:
        g["importance_pct"] = round((g["importance"] / total) * 100, 1)

    global_importance.sort(key=lambda x: x["importance_pct"], reverse=True)

    output = {
        "method": "LIME TabularExplainer on Random Forest",
        "sklearn_validation_accuracy": round(val_acc, 3),
        "samples_explained": len(local_explanations),
        "global": global_importance,
        "local": local_explanations,
    }

    OUT.mkdir(parents=True, exist_ok=True)
    out_path = OUT / "lime_explanations.json"
    out_path.write_text(json.dumps(output, indent=2))
    print(f"✓ {out_path}")
    print(f"  Global features: {len(global_importance)}")
    print(f"  Local samples:   {len(local_explanations)}")
    print("\nRestart dashboard: cd dashboard && npm run dev")


if __name__ == "__main__":
    main()
