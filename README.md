# Chronic Kidney Disease (CKD) Predictor - Llama 2 Edition

This application uses a fine-tuned Llama 2 model to predict the risk of Chronic Kidney Disease based on clinical parameters.

## Setup Instructions

### 1. Environment Variables
Create a `.env` file in the root directory (or set these in your hosting provider like Render/Vercel):

```env
DATABASE_URL=your_postgresql_url
JWT_SECRET=your_random_secret_string
HUGGINGFACE_API_KEY=your_huggingface_token
```

### 2. Hugging Face Token
You can get your token from [Hugging Face Settings](https://huggingface.co/settings/tokens). Ensure it has `Read` access.

### 3. Deployment
This app is ready to be deployed to **Render**, **Railway**, or any Node.js hosting.
- **Build Command:** `npm run build`
- **Start Command:** `npm start`

## Technical Stack
- **Frontend:** React + Tailwind CSS + Framer Motion
- **Backend:** Node.js + Express
- **AI Model:** Llama 2 (Fine-tuned for CKD) via Hugging Face Inference API
- **Database:** PostgreSQL
