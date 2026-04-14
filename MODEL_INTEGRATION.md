# CKD Predictor - Model Integration Guide

## Overview

The CKD Predictor application uses a **Python bridge** (`bridge.py`) to interface between the Node.js/Express backend and the XGBoost machine learning model (`kidney_disease_model.pkl`).

## Architecture

```
Frontend (React/TypeScript)
    ↓
    API Call: POST /api/predict
    ↓
Backend (Express/Node.js)
    ↓
    Spawns Python Process
    ↓
Python Bridge (bridge.py)
    ↓
    Loads Model (kidney_disease_model.pkl)
    ↓
    Generates Prediction
    ↓
    Returns JSON Result
    ↓
Backend (Express/Node.js)
    ↓
    Saves to PostgreSQL
    ↓
    Returns Response to Frontend
```

## How It Works

### 1. Frontend Input Collection

The `MultiStepForm.tsx` component collects patient data in three steps:

**Step 1: Demographics & Vitals**
- Age, Blood Pressure

**Step 2: Laboratory Analysis**
- Specific Gravity, Albumin, Sugar, Blood Glucose, Blood Urea, Creatinine, Sodium, Potassium, Hemoglobin, PCV, WBC Count, RBC Count

**Step 3: Medical History**
- Red Blood Cells, Pus Cell, Pus Cell Clumps, Bacteria, Hypertension, Diabetes, CAD, Appetite, Pedal Edema, Anemia

### 2. API Request

When the user submits the form, the frontend sends:

```typescript
POST /api/predict
{
  "inputs": {
    "age": 45,
    "bp": 80,
    "sg": 1.02,
    // ... other fields
  },
  "userId": "patient123"
}
```

### 3. Backend Processing

The Express server (`server.ts`) receives the request and:

1. Spawns a Python subprocess running `bridge.py`
2. Passes the input data as JSON via stdin
3. Captures the output from Python
4. Parses the result
5. Saves to PostgreSQL
6. Returns the prediction to the frontend

### 4. Python Bridge Execution

The `bridge.py` script:

1. Reads JSON input from stdin
2. Loads the trained XGBoost model from `kidney_disease_model.pkl`
3. Converts input to a pandas DataFrame
4. Makes a prediction using the model
5. Generates SHAP values (feature importance)
6. Returns a JSON response with:
   - **diagnosis**: "CKD Detected" or "Healthy"
   - **probability**: Confidence score (0-1)
   - **shapValues**: Array of feature importance values
   - **summary**: Human-readable interpretation

### 5. Database Storage

The prediction result is stored in PostgreSQL:

```sql
INSERT INTO assessments (user_id, inputs, result)
VALUES (
  'patient123',
  '{"age": 45, "bp": 80, ...}',
  '{"diagnosis": "Healthy", "probability": 0.25, ...}'
);
```

### 6. Frontend Display

The `PredictionDashboard.tsx` component displays:
- Risk gauge showing probability
- Diagnosis result (CKD Detected / Healthy)
- SHAP values chart showing feature importance
- Clinical interpretation

## Customizing the Model

### Option 1: Replace the Model File

If you have a different trained model:

1. Ensure it's in the same format (sklearn Pipeline or XGBoost model saved with joblib)
2. Replace `kidney_disease_model.pkl` with your model
3. Update `bridge.py` if your model has different feature names or output format

### Option 2: Modify the Bridge Script

If your model requires special preprocessing:

```python
# In bridge.py, modify the predict() function:

# Example: Custom feature scaling
from sklearn.preprocessing import StandardScaler

def predict():
    input_data = json.load(sys.stdin)
    model = joblib.load('kidney_disease_model.pkl')
    
    # Custom preprocessing
    df = pd.DataFrame([input_data])
    scaler = StandardScaler()
    df_scaled = scaler.fit_transform(df)
    
    # Make prediction
    prob = model.predict_proba(df_scaled)[0][1]
    # ... rest of the code
```

### Option 3: Use a Different ML Framework

If you want to use TensorFlow, PyTorch, or another framework:

1. Update `requirements.txt` with the new dependencies
2. Modify `bridge.py` to load and use the new model format
3. Ensure the output format matches the expected JSON structure

Example for TensorFlow:

```python
import tensorflow as tf

def predict():
    input_data = json.load(sys.stdin)
    model = tf.keras.models.load_model('kidney_disease_model.h5')
    
    df = pd.DataFrame([input_data])
    prediction = model.predict(df)
    
    prob = float(prediction[0][0])
    # ... rest of the code
```

## Model Input Features

The model expects the following 24 features:

| Feature | Type | Range | Description |
|---------|------|-------|-------------|
| age | numeric | 0-100 | Age in years |
| bp | numeric | 0-200 | Blood pressure (mm/Hg) |
| sg | numeric | 1.0-1.03 | Specific gravity |
| al | numeric | 0-5 | Albumin level |
| su | numeric | 0-5 | Sugar level |
| bgr | numeric | 0-500 | Blood glucose random |
| bu | numeric | 0-200 | Blood urea |
| sc | numeric | 0-10 | Serum creatinine |
| sod | numeric | 100-150 | Sodium |
| pot | numeric | 2-10 | Potassium |
| hemo | numeric | 5-20 | Hemoglobin |
| pcv | numeric | 10-60 | Packed cell volume |
| wc | numeric | 2000-15000 | White blood cell count |
| rc | numeric | 2-8 | Red blood cell count |
| rbc | categorical | normal/abnormal | Red blood cell status |
| pc | categorical | normal/abnormal | Pus cell status |
| pcc | categorical | present/notpresent | Pus cell clumps |
| ba | categorical | present/notpresent | Bacteria |
| htn | categorical | yes/no | Hypertension |
| dm | categorical | yes/no | Diabetes mellitus |
| cad | categorical | yes/no | Coronary artery disease |
| appet | categorical | good/poor | Appetite |
| pe | categorical | yes/no | Pedal edema |
| ane | categorical | yes/no | Anemia |

## Model Output Format

The model returns a JSON object with:

```json
{
  "diagnosis": "CKD Detected",
  "probability": 0.85,
  "shapValues": [
    {
      "feature": "sc",
      "value": 0.15,
      "impact": "positive"
    },
    {
      "feature": "hemo",
      "value": 0.12,
      "impact": "negative"
    }
  ],
  "summary": "Based on clinical markers, the model indicates CKD status with 85% probability."
}
```

## Performance Considerations

### Model Loading
- The model is loaded fresh for each prediction (for thread safety)
- For high-traffic applications, consider caching the model in memory:

```python
import joblib

# Global model cache
_model = None

def get_model():
    global _model
    if _model is None:
        _model = joblib.load('kidney_disease_model.pkl')
    return _model
```

### Prediction Time
- Typical prediction time: 50-200ms
- For batch predictions, modify the bridge to accept multiple inputs

### Scalability
- Each prediction spawns a new Python process
- For high concurrency, consider using a dedicated ML service (FastAPI, Flask)
- Or use a model serving platform (TensorFlow Serving, BentoML)

## Troubleshooting

### Model Loading Error
```
Error: Can't get attribute 'AdvancedPreprocessor'
```
**Solution**: The model uses a custom class. The `bridge.py` includes a mock implementation. If this fails, ensure the custom class is defined in `bridge.py`.

### Prediction Returns Error
```
Error: Prediction failed
```
**Solution**: Check the Python stderr logs in the Express server logs for details.

### Slow Predictions
**Solution**: 
- Profile the model using `python -m cProfile bridge.py`
- Consider using a GPU-accelerated version of XGBoost
- Implement caching for frequently seen inputs

### Memory Issues
**Solution**:
- Monitor memory usage with `top` or `ps`
- For large models, consider using a model serving platform
- Implement garbage collection in `bridge.py`

## Testing the Model Locally

```bash
# Test the bridge script
echo '{"age": 45, "bp": 80, "sg": 1.02, ...}' | python3 bridge.py

# Expected output
{"diagnosis": "Healthy", "probability": 0.25, ...}
```

## Production Deployment

When deploying to Render:

1. Ensure `kidney_disease_model.pkl` is included in the repository
2. Verify `requirements.txt` includes all Python dependencies
3. Check that `render.yaml` specifies the build command: `npm install && pip install -r requirements.txt && npm run build`
4. Monitor the logs for model loading errors during startup
5. Test the `/api/predict` endpoint after deployment

## Advanced: Using a Separate ML Service

For production applications with high traffic, consider separating the ML model into a dedicated service:

### Option 1: FastAPI Service

Create a separate FastAPI service on Render:

```python
# ml_service.py
from fastapi import FastAPI
import joblib

app = FastAPI()
model = joblib.load('kidney_disease_model.pkl')

@app.post("/predict")
async def predict(data: dict):
    # ... prediction logic
    return result
```

Then update `server.ts` to call this service instead of spawning Python:

```typescript
const mlServiceUrl = process.env.ML_SERVICE_URL;
const result = await fetch(`${mlServiceUrl}/predict`, {
  method: 'POST',
  body: JSON.stringify(inputs)
});
```

### Option 2: AWS SageMaker or Similar

Deploy the model to a managed ML service and call it via API.

---

For more information:
- [Scikit-learn Model Persistence](https://scikit-learn.org/stable/modules/model_persistence.html)
- [XGBoost Python API](https://xgboost.readthedocs.io/en/latest/python/index.html)
- [Node.js Child Process](https://nodejs.org/api/child_process.html)
