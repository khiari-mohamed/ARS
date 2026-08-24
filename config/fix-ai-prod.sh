#!/bin/bash
# Fix AI Microservice on Production Server
# Run this on arshosting server

echo "🔧 Fixing AI Microservice on Production..."

cd /home/yourapp/ai-microservice

echo "📦 Stopping AI service..."
pm2 stop ai-microservice

echo "🗑️ Removing old virtual environment..."
rm -rf venv

echo "🐍 Creating fresh virtual environment..."
python3 -m venv venv

echo "📥 Activating virtual environment..."
source venv/bin/activate

echo "⬆️ Upgrading pip..."
pip install --upgrade pip

echo "📦 Installing compatible dependencies..."
pip install protobuf==3.20.3
pip install numpy==1.24.3
pip install pandas==2.1.1

echo "🤖 Installing AI packages..."
pip install fastapi==0.104.1
pip install uvicorn==0.24.0
pip install scikit-learn==1.3.0
pip install spacy==3.7.2
pip install prophet==1.1.4
pip install joblib==1.3.2
pip install pydantic==2.4.2
pip install python-multipart==0.0.6
pip install python-jose[cryptography]==3.3.0
pip install passlib[bcrypt]==1.7.4
pip install asyncpg==0.29.0
pip install psycopg2-binary==2.9.7
pip install torch==2.1.0 --index-url https://download.pytorch.org/whl/cpu
pip install transformers==4.35.0

echo "📚 Downloading spaCy French model..."
python -m spacy download fr_core_news_sm

echo "✅ Dependencies installed successfully!"

echo "🚀 Starting AI microservice..."
pm2 restart ai-microservice

echo "📊 Checking status..."
pm2 status

echo "📝 Showing logs..."
pm2 logs ai-microservice --lines 30

echo ""
echo "✅ AI Microservice fix complete!"
echo "🔍 Check logs above for any errors"
