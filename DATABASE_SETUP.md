# CKD Predictor - Database Setup Guide

## PostgreSQL Database Configuration

### Step 1: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** and select **"PostgreSQL"**
3. Configure the database:
   - **Name**: `ckd-db` (or your preferred name)
   - **Database**: `ckd_predictor`
   - **User**: `ckd_user`
   - **Region**: Choose the closest region to your users
   - **PostgreSQL Version**: 15 or higher

4. Click **"Create Database"**
5. Copy the **Internal Database URL** (this will be used in `render.yaml`)

### Step 2: Update render.yaml

The `render.yaml` file is already configured to:
- Create a PostgreSQL database automatically
- Connect the Node.js web service to the database
- Pass the `DATABASE_URL` environment variable to your application

### Step 3: Database Schema

The application automatically creates the required table on startup:

```sql
CREATE TABLE IF NOT EXISTS assessments (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  inputs JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

This table stores:
- **id**: Unique identifier for each assessment
- **user_id**: Identifier for the user who performed the assessment
- **inputs**: JSON data containing all input parameters from the form
- **result**: JSON data containing the prediction results and SHAP values
- **created_at**: Timestamp of when the assessment was performed

### Step 4: Verify Database Connection

After deployment on Render:

1. Go to your web service dashboard
2. Check the **Logs** tab for messages like:
   ```
   PostgreSQL table 'assessments' is ready.
   ```

3. To manually verify the connection:
   - Use Render's PostgreSQL connection string
   - Connect via a PostgreSQL client (pgAdmin, DBeaver, etc.)
   - Run: `SELECT * FROM assessments;`

### Step 5: Environment Variables

The following environment variables are automatically set by Render:

| Variable | Value | Source |
|----------|-------|--------|
| `DATABASE_URL` | PostgreSQL connection string | Render (from database service) |
| `NODE_ENV` | `production` | render.yaml |
| `PORT` | `3000` | Express server default |

### Step 6: Backup and Monitoring

Render provides:
- **Automatic daily backups** (7-day retention)
- **Metrics and monitoring** in the dashboard
- **Connection pooling** for optimal performance

To access backups:
1. Go to your PostgreSQL database in Render
2. Click **"Backups"** tab
3. Download or restore as needed

## Troubleshooting

### Connection Refused
- Ensure the database service is running
- Check that `DATABASE_URL` is correctly set in environment variables
- Verify the database name and user credentials

### Table Not Created
- Check the application logs for initialization errors
- Manually create the table using the SQL above
- Ensure the database user has CREATE TABLE permissions

### Slow Queries
- Add indexes to frequently queried columns:
  ```sql
  CREATE INDEX idx_user_id ON assessments(user_id);
  CREATE INDEX idx_created_at ON assessments(created_at);
  ```

## Local Development

For local development, set up a local PostgreSQL instance:

```bash
# Using Docker
docker run --name ckd-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ckd_predictor -p 5432:5432 -d postgres:15

# Set environment variable
export DATABASE_URL="postgres://postgres:password@localhost:5432/ckd_predictor"

# Run the application
npm run dev
```

## API Endpoints

### POST /api/predict
Accepts patient data and returns CKD prediction with SHAP values. Results are automatically saved to the database.

**Request:**
```json
{
  "inputs": { /* patient data */ },
  "userId": "patient123"
}
```

**Response:**
```json
{
  "diagnosis": "CKD Detected",
  "probability": 0.75,
  "shapValues": [ /* SHAP values */ ],
  "summary": "Based on clinical markers..."
}
```

### GET /api/stats
Returns statistics about all assessments in the database.

**Response:**
```json
{
  "totalAssessments": 42,
  "ckdDetected": 15,
  "healthy": 27,
  "recentAssessments": [ /* last 10 assessments */ ]
}
```

## Security Considerations

1. **SSL/TLS**: Render enforces SSL connections to PostgreSQL in production
2. **User Permissions**: The database user has limited permissions (only SELECT, INSERT, UPDATE, DELETE on the assessments table)
3. **Data Privacy**: All patient data is stored securely with encryption at rest
4. **Backups**: Regular automated backups ensure data recovery

## Performance Optimization

For production use with high traffic:

1. **Connection Pooling**: The application uses pg.Pool for connection management
2. **Query Optimization**: Consider adding indexes for frequently filtered columns
3. **Caching**: Implement Redis for caching frequently accessed statistics
4. **Database Replication**: Render offers read replicas for scaling read-heavy workloads

---

For more information, visit:
- [Render PostgreSQL Documentation](https://render.com/docs/databases)
- [Node.js pg Library](https://node-postgres.com/)
