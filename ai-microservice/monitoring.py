import logging
import time
from functools import wraps
from typing import Callable
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlAlchemyIntegration
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response
from fastapi.responses import PlainTextResponse

# Initialize Sentry
sentry_sdk.init(
    dsn="your-sentry-dsn-here",  # Replace with actual Sentry DSN
    integrations=[
        FastApiIntegration(auto_enabling_integrations=False),
        SqlAlchemyIntegration(),
    ],
    traces_sample_rate=0.1,
    environment="production"
)

# Prometheus metrics
REQUEST_COUNT = Counter(
    'http_requests_total', 
    'Total HTTP requests', 
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds', 
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

ML_PREDICTIONS = Counter(
    'ml_predictions_total',
    'Total ML predictions made',
    ['endpoint', 'model_type']
)

ML_ERRORS = Counter(
    'ml_errors_total',
    'Total ML prediction errors',
    ['endpoint', 'error_type']
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

def log_endpoint_call(endpoint_name: str):
    """Decorator to log endpoint calls"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                logger.info(f"Starting {endpoint_name} endpoint call")
                result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
                duration = time.time() - start_time
                logger.info(f"Completed {endpoint_name} in {duration:.2f}s")
                ML_PREDICTIONS.labels(endpoint=endpoint_name, model_type="sklearn").inc()
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.error(f"Error in {endpoint_name} after {duration:.2f}s: {str(e)}")
                ML_ERRORS.labels(endpoint=endpoint_name, error_type=type(e).__name__).inc()
                sentry_sdk.capture_exception(e)
                raise
        return wrapper
    return decorator

async def metrics_middleware(request: Request, call_next):
    """Middleware to collect metrics"""
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status_code=response.status_code
    ).inc()
    
    REQUEST_DURATION.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)
    
    return response

def get_metrics():
    """Get Prometheus metrics"""
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)

import asyncio