import { Counter, collectDefaultMetrics, Histogram, register } from 'prom-client';

let defaultsStarted = false;

// Shoppingo's pattern: a one-time boot of the default Node process
// metrics, then a single registry exposed at /api/metrics. The
// `prefix` keeps the metric names short and unambiguous when the
// Prometheus job scrapes multiple services.
export const startDefaultMetrics = () => {
    if (defaultsStarted) return;
    collectDefaultMetrics({ register, prefix: 'jewellery_api_' });
    defaultsStarted = true;
};

export const httpRequestsTotal = new Counter({
    name: 'jewellery_api_http_requests_total',
    help: 'Total HTTP requests handled by the jewellery catalogue API',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
    name: 'jewellery_api_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
});

export const etsySyncsTotal = new Counter({
    name: 'jewellery_api_etsy_syncs_total',
    help: 'Etsy order syncs grouped by outcome',
    labelNames: ['outcome'] as const, // ok | failed
    registers: [register],
});

export const etsySalesImportedTotal = new Counter({
    name: 'jewellery_api_etsy_sales_imported_total',
    help: 'Etsy sales imported during a successful order sync',
    registers: [register],
});

export const aiCallsTotal = new Counter({
    name: 'jewellery_api_ai_calls_total',
    help: 'AI feature calls grouped by feature name',
    labelNames: ['feature'] as const,
    registers: [register],
});

export const imageUploadsTotal = new Counter({
    name: 'jewellery_api_image_uploads_total',
    help: 'Image uploads accepted by the API',
    labelNames: ['outcome'] as const, // ok | failed
    registers: [register],
});

export const metricsRegister = register;
