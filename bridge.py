import sys
import json
import os

# Define the classes so joblib can unpickle them
class AdvancedPreprocessor:
    def __init__(self):
        pass

class DataCleaner:
    def __init__(self):
        pass

# Set up logging to stderr so it shows in Render logs
def log(msg):
    print(f"DEBUG: {msg}", file=sys.stderr)

def predict():
    log("Starting bridge.py")
    try:
        # Check dependencies
        log("Checking dependencies...")
        import joblib
        import pandas as pd
        import numpy as np
        import xgboost
        log("Dependencies loaded successfully")

        # Load the model package
        model_path = 'kidney_disease_model.pkl'
        if not os.path.exists(model_path):
            log(f"Model file not found: {model_path}")
            print(json.dumps({"error": f"Model file '{model_path}' not found. Please upload it."}))
            return

        log("Loading model...")
        package = joblib.load(model_path)
        model = package['model']
        preprocessor = package['preprocessor']
        feature_names = package['feature_names']
        log("Model loaded successfully")

        # Read input from stdin
        log("Reading input data...")
        input_data = sys.stdin.read()
        if not input_data:
            log("No input data received")
            return
        
        data = json.loads(input_data)
        log(f"Received data: {data}")
        
        # Convert to DataFrame
        df = pd.DataFrame([data])
        
        # Ensure correct feature order
        df = df[feature_names]
        
        # Preprocess
        log("Preprocessing data...")
        X_processed = preprocessor.transform(df)
        
        # Predict
        log("Running prediction...")
        prediction = model.predict(X_processed)[0]
        probability = model.predict_proba(X_processed)[0]
        
        # Get probability for class 1 (CKD)
        prob_ckd = float(probability[1])
        
        diagnosis = "CKD Detected" if prediction == 1 else "Healthy"
        log(f"Prediction result: {diagnosis} ({prob_ckd})")
        
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
