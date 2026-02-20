# Health Compass Backend (Hybrid Node + Express + Supabase + OpenAI)

Production-ready TypeScript backend for Health Compass using:
- **Node.js runtime + Express REST API** (`/api/*`)
- **Supabase PostgreSQL + Storage** (`medical-reports` bucket)
- **OpenAI official SDK** for AI endpoints
- **Modular architecture** ready for future ML microservice integration

## Folder Structure

```txt
backend/
  src/
    config/        # env, supabase, openai clients
    controllers/   # request orchestration
    middleware/    # auth, role checks, validation, error handling
    models/        # shared domain types
    routes/        # /api route declarations
    services/      # business logic + integrations
    types/         # express request augmentation
    utils/         # reusable helpers
    app.ts
    server.ts
  sql/
    supabase_schema.sql
```

## Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env
   ```
3. Fill required variables:
   - `PORT`
   - `FRONTEND_ORIGIN`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
4. Apply schema in Supabase SQL Editor:
   - Run `backend/sql/supabase_schema.sql`.

## Run

- Dev mode: `npm run dev`
- Build: `npm run build`
- Start prod build: `npm run start`

## API Endpoints

All endpoints are under `/api` and return:

```json
{ "success": true, "data": {}, "error": null }
```

Authentication is currently placeholder via headers:
- `x-user-id: <uuid>`
- `x-user-role: doctor|patient`

Endpoints:
- `POST /api/patients`
- `GET /api/patients/:id`
- `POST /api/patient-records`
- `POST /api/reports/upload` (multipart form-data: `file`, `patientId`, optional `extractedText`)
- `POST /api/ai/chat`
- `POST /api/ai/medication-suggestions`
- `POST /api/ai/validate-document`
- `POST /api/ocr/extract`
- `POST /api/ml/analyze`

## RBAC Rules

- Doctors can create/view only patients linked to their `doctor_id`.
- Patients can only access their own patient profile.
- Doctors only create records/reports for their own patients.

## Deployment

### Render / Railway
1. Create a new web service from `/backend`.
2. Build command: `npm install && npm run build`
3. Start command: `npm run start`
4. Add all env vars from `.env.example`.

### AWS (ECS/Fargate or EC2)
1. Build backend artifact (`npm run build`).
2. Run `node dist/server.js` behind ALB/Nginx.
3. Configure env vars in Secrets Manager / Parameter Store.
4. Restrict inbound traffic, enable HTTPS, and wire CORS origin.

## ML Integration Strategy

`src/services/mlService.ts` is isolated so future integration can be:
- internal adapter to in-process model runtime, or
- external HTTP/gRPC ML microservice.

No route/controller refactor required when replacing placeholder logic.
