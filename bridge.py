import sys
import json
import joblib
import pandas as pd
import numpy as np
import os

def predict():
    try:
        # Load the model package
        model_path = 'kidney_disease_model.pkl'
        if not os.path.exists(model_path):
            print(json.dumps({"error": f"Model file {model_path} not found"}))
            return

        package = joblib.load(model_path)
        model = package['model']
        preprocessor = package['preprocessor']
        feature_names = package['feature_names']

        # Read input from stdin
        input_data = sys.stdin.read()
        if not input_data:
            return
        
        data = json.loads(input_data)
        
        # Convert to DataFrame
        df = pd.DataFrame([data])
        
        # Ensure correct feature order
        df = df[feature_names]
        
        # Preprocess
        X_processed = preprocessor.transform(df)
        
        # Predict
        prediction = model.predict(X_processed)[0]
        probability = model.predict_proba(X_processed)[0]
        
        # Get probability for class 1 (CKD)
        prob_ckd = float(probability[1])
        
        diagnosis = "CKD Detected" if prediction == 1 else "Healthy"
        
        # Simple feature impact (since SHAP might be slow or not installed)
        # We can use feature importance from XGBoost as a fallback
        shap_values = []
        try:
            # Try to get feature importance
            importances = model.feature_importances_
            # Map back to original features (approximate since preprocessor changes them)
            # For simplicity, we'll just list the top features from the model info if available
            # or just return empty for now to avoid complexity
            pass
        except:
            pass

        # Construct result
        result = {
            "diagnosis": diagnosis,
            "probability": prob_ckd,
            "shapValues": [], # We can populate this if needed
            "summary": f"Based on the local XGBoost model, the patient is classified as {diagnosis} with a probability of {prob_ckd:.2%}."
        }
        
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    predict()
