# Google Cloud Platform Deployment Guide

This guide will help you deploy the Telegram Intel Monitor to Google Cloud Platform using Cloud Run.

## Prerequisites

1. Google Cloud account with billing enabled
2. `gcloud` CLI installed and configured
3. Docker installed locally (optional, for local testing)

## Step 1: Project Setup

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
export REGION="us-central1"

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com \
    translate.googleapis.com
```

## Step 2: Create Service Account

```bash
# Create service account for the application
gcloud iam service-accounts create telegram-monitor \
    --description="Service account for Telegram Intel Monitor" \
    --display-name="Telegram Monitor"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:telegram-monitor@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:telegram-monitor@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudtranslate.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:telegram-monitor@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:telegram-monitor@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/monitoring.metricWriter"
```

## Step 3: Create Secrets

Store sensitive configuration in Google Secret Manager:

```bash
# Telegram Bot Token
echo "your_telegram_bot_token" | gcloud secrets create telegram-bot-token --data-file=-

# Discord Webhook URL
echo "https://discord.com/api/webhooks/your_webhook_url" | gcloud secrets create discord-webhook-url --data-file=-

# OpenAI API Key (for AI features)
echo "your_openai_api_key" | gcloud secrets create openai-api-key --data-file=-

# Keywords (comma-separated)
echo "crypto,bitcoin,ethereum,alert,urgent,malware,phishing" | gcloud secrets create keywords --data-file=-

# Optional: Google Cloud credentials for translation (if using service account key)
gcloud secrets create google-credentials --data-file=path/to/your/credentials.json
```

## Step 4: Create Cloud Storage Buckets

```bash
# Create bucket for build logs
gsutil mb gs://$PROJECT_ID-cloudbuild-logs

# Create bucket for artifacts
gsutil mb gs://$PROJECT_ID-artifacts

# Set lifecycle policy for logs (optional - auto-delete after 30 days)
cat > lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://$PROJECT_ID-cloudbuild-logs
rm lifecycle.json
```

## Step 5: Deploy Using Cloud Build

### Option A: Deploy from Local Code

```bash
# Submit build from local directory
gcloud builds submit --config cloudbuild.yaml \
    --substitutions=_REGION=$REGION,_SERVICE_ACCOUNT=telegram-monitor@$PROJECT_ID.iam.gserviceaccount.com
```

### Option B: Deploy from GitHub Repository

```bash
# Connect your GitHub repository to Cloud Build
gcloud builds triggers create github \
    --repo-name=your-repo-name \
    --repo-owner=your-github-username \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml \
    --substitutions=_REGION=$REGION,_SERVICE_ACCOUNT=telegram-monitor@$PROJECT_ID.iam.gserviceaccount.com
```

## Step 6: Configure Environment Variables

Update the deployed service with additional environment variables:

```bash
gcloud run services update telegram-intel-monitor \
    --region=$REGION \
    --set-env-vars="
ENABLE_OCR=true,
ENABLE_DATABASE=true,
ENABLE_AI_ANALYSIS=true,
ENABLE_THREAT_ANALYSIS=true,
ENABLE_SENTIMENT_ANALYSIS=true,
ENABLE_TRANSLATION=true,
ENABLE_SERVER=true,
DB_TYPE=sqlite,
LOG_LEVEL=info,
RATE_LIMIT_WINDOW=60000,
MAX_ALERTS_PER_WINDOW=10
" \
    --set-secrets="
TELEGRAM_BOT_TOKEN=telegram-bot-token:latest,
DISCORD_WEBHOOK_URL=discord-webhook-url:latest,
OPENAI_API_KEY=openai-api-key:latest,
KEYWORDS=keywords:latest
"
```

## Step 7: Database Setup

### Option A: SQLite (Default - Simpler)
SQLite will work out of the box with the current configuration. Data is stored in the container filesystem.

### Option B: Cloud SQL PostgreSQL (Recommended for Production)

```bash
# Create Cloud SQL instance
gcloud sql instances create telegram-intel-db \
    --database-version=POSTGRES_13 \
    --tier=db-f1-micro \
    --region=$REGION

# Create database
gcloud sql databases create telegram_intel --instance=telegram-intel-db

# Create user
gcloud sql users create telegram_user \
    --instance=telegram-intel-db \
    --password=your_secure_password

# Get connection name
CONNECTION_NAME=$(gcloud sql instances describe telegram-intel-db --format="value(connectionName)")

# Update Cloud Run service to use Cloud SQL
gcloud run services update telegram-intel-monitor \
    --region=$REGION \
    --add-cloudsql-instances=$CONNECTION_NAME \
    --set-env-vars="
DB_TYPE=postgresql,
DB_HOST=/cloudsql/$CONNECTION_NAME,
DB_NAME=telegram_intel,
DB_USER=telegram_user,
DB_PASSWORD=your_secure_password
"
```

## Step 8: Monitoring and Logging

### Set up Log-based Metrics

```bash
# Create a log-based metric for alerts
gcloud logging metrics create telegram_alerts \
    --description="Count of Telegram alerts" \
    --log-filter='resource.type="cloud_run_revision" AND jsonPayload.type="alert"'
```

### Set up Alerting Policy

```bash
# Create notification channel (replace with your email)
gcloud alpha monitoring channels create \
    --display-name="Email Notifications" \
    --type=email \
    --channel-labels=email_address=your-email@example.com

# Get the channel ID
CHANNEL_ID=$(gcloud alpha monitoring channels list --filter="displayName:'Email Notifications'" --format="value(name)")

# Create alerting policy for high error rate
cat > alerting-policy.yaml << EOF
displayName: "High Error Rate - Telegram Bot"
conditions:
  - displayName: "Error rate too high"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND resource.labels.service_name="telegram-intel-monitor"'
      comparison: COMPARISON_GREATER_THAN
      thresholdValue: 5
      duration: 300s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_RATE
          crossSeriesReducer: REDUCE_SUM
notificationChannels:
  - $CHANNEL_ID
EOF

gcloud alpha monitoring policies create --policy-from-file=alerting-policy.yaml
```

## Step 9: Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
    --service=telegram-intel-monitor \
    --domain=your-domain.com \
    --region=$REGION
```

## Step 10: Health Checks and Verification

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe telegram-intel-monitor --region=$REGION --format="value(status.url)")

# Test health endpoint
curl $SERVICE_URL/health

# Test status endpoint
curl $SERVICE_URL/status

# View logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=telegram-intel-monitor" --limit=50 --format=json
```

## Useful Commands

### View Service Details
```bash
gcloud run services describe telegram-intel-monitor --region=$REGION
```

### Update Service
```bash
gcloud run services update telegram-intel-monitor \
    --region=$REGION \
    --memory=2Gi \
    --cpu=2 \
    --max-instances=5
```

### View Logs
```bash
gcloud logs tail "resource.type=cloud_run_revision AND resource.labels.service_name=telegram-intel-monitor"
```

### Scale Down to Zero (to save costs)
```bash
gcloud run services update telegram-intel-monitor \
    --region=$REGION \
    --min-instances=0
```

## Troubleshooting

### Common Issues

1. **Build Timeout**: Increase timeout in `cloudbuild.yaml`
2. **Memory Issues**: Increase memory allocation for Cloud Run service
3. **Secret Access**: Verify service account has `secretmanager.secretAccessor` role
4. **Database Connection**: Check Cloud SQL connection string and credentials

### Debug Commands

```bash
# Check build logs
gcloud builds list --limit=5

# Get build details
gcloud builds describe [BUILD_ID]

# Test container locally
docker run -p 3000:3000 gcr.io/$PROJECT_ID/telegram-intel-monitor:latest

# View service logs
gcloud run services logs read telegram-intel-monitor --region=$REGION
```

## Cost Optimization

1. **Use Cloud Run's pay-per-use pricing**
2. **Set min-instances=0 to scale to zero when idle**
3. **Use Cloud SQL's automatic storage increase sparingly**
4. **Set up budget alerts to monitor costs**
5. **Use preemptible instances for Cloud Build**

## Security Best Practices

1. **Use least-privilege IAM roles**
2. **Store all secrets in Secret Manager**
3. **Enable VPC connector for database access**
4. **Use HTTPS only (default for Cloud Run)**
5. **Regularly rotate API keys and tokens**
6. **Monitor access logs for unusual activity**

## Backup and Recovery

For SQLite (if using persistent disk):
```bash
# Backup data directory
gcloud compute disks snapshot [DISK_NAME] --zone=[ZONE]
```

For Cloud SQL:
```bash
# Create backup
gcloud sql backups create --instance=telegram-intel-db
```