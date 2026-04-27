#  Content Broadcasting System

A backend API for broadcasting educational content from teachers to students, with principal-controlled approval workflow, subject-based scheduling, and a public live-content endpoint.


##  Tech Stack

| Layer        | Technology                          |
|-------------|-------------------------------------|
| Runtime     | Node.js (v18+)                      |
| Framework   | Express.js                          |
| Database    | PostgreSQL                          |
| Auth        | JWT (jsonwebtoken) + bcryptjs       |
| File Upload | Cloudinary                          |
| Validation  | Zod Validation                      |
| Rate Limit  | redis ZINDEX + TTL (window)         |
| API Docs    | Swagger UI (swagger-jsdoc)          |



##  Setup & Installation

### Prerequisites
- Node.js v18+

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd content-broadcasting-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env
```

Edit `.env`:
```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=content_broadcasting
DB_USER=postgres
DB_PASSWORD=yourpassword

JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=24h

MAX_FILE_SIZE_MB=10
CLOUDINARY_CLOUD_NAME=cloudinary_name
CLOUDINARY_API_KEY=cloudinary api
CLOUDINARY_API_SECRET=secretapikey
CLOUDINARY_UPLOAD_FOLDER=content_broadcast
REDIS_URL=localhost redis url
REDIS_CACHE_TTL_SECONDS=60
```

### 4. Create the database
```bash
psql -U postgres -c "CREATE DATABASE content_broadcasting;"
```

### 5. Run migrations
```bash
npm run migrate
```

### 7. Start the server
```bash
# Development (with auto-reload)
npm run dev


Server runs at: `http://localhost:3000`  
Swagger docs: `http://localhost:3000/api-docs`
```

# Production
```bash
npm start


Swagger docs: `https://content-broadcast.onrender.com/api-docs/`
```
---

##  API Reference

### Base URL: `https://content-broadcast.onrender.com/`

---

###  Auth

#### `POST /auth/register`
Register a new user.

**Body:**
```json
{
  "name": "Teacher One",
  "email": "teacher1@school.com",
  "password": "password123",
  "role": "teacher"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "...", "email": "...", "role": "teacher" },
    "token": "eyJ..."
  }
}
```

---

#### `POST /auth/login`
Login and receive JWT.

**Body:**
```json
{
  "email": "teacher1@school.com",
  "password": "password123"
}
```

---

#### `GET /auth/me`
Get current authenticated user. Requires `Authorization: Bearer <token>`.

---

###  Content (Teacher)

#### `POST /content/upload`
Upload content for a subject. Requires teacher role.

**Content-Type:** `multipart/form-data`

>  Content without `start_time` and `end_time` will never be shown on the live endpoint.

---

#### `GET /content/my`
Get teacher's own uploaded content.

**Query params:** `status`, `subject`, `limit`, `offset`

---

### Approval (Principal)

#### `GET /content/all`
List all content. Requires principal role.

**Query params:** `status`, `subject`, `teacher_id`, `limit`, `offset`

---

#### `PATCH /content/:id/approve`
Approve pending content.

---

#### `PATCH /content/:id/reject`
Reject pending content with a reason.

**Body:**
```json
{
  "reason": "Content does not meet curriculum standards."
}
```

---

###  Public Broadcasting

#### `GET /content/live/:teacherId`
Returns the currently broadcasting content for a teacher. **No auth required.**

**Query params:** `subject` (optional filter)

**Examples:**
```
GET /content/live/teacher-uuid-1
GET /content/live/teacher-uuid-2?subject=maths
```

**Response (content active):**
```json
{
  "success": true,
  "message": "Content fetched successfully.",
  "data": {
    "content": {
      "id": "...",
      "title": "Chapter 3 Worksheet",
      "subject": "maths",
      "file_url": "/uploads/1714000000-abc.png",
      "start_time": "2026-04-25T08:00:00Z",
      "end_time": "2026-04-25T17:00:00Z",
      "rotation_duration": 5
    }
  }
}
```

**Response (no content):**
```json
{
  "success": true,
  "data": null,
  "message": "No content available"
}
```

---

###  Utilities

#### `GET /content/teachers`
List all registered teachers (authenticated).

#### `GET /health`
Health check endpoint (no auth).

---

##  Scheduling / Rotation Logic

The system determines the **currently active content item** in a fully stateless, deterministic way — no cron jobs, no state persistence.

### How It Works

1. Fetch all **approved** content for the teacher where `NOW() BETWEEN start_time AND end_time`
2. Group by **subject** (each subject has its own independent rotation)
3. Retrieve the **rotation order** from `content_schedule`
4. Compute current position in the cycle:
   ```
   totalCycleDuration = sum of all items' rotation_duration
   currentMinutes     = floor(Date.now() / 1000 / 60)
   positionInCycle    = currentMinutes % totalCycleDuration
   ```
5. Walk the ordered list, accumulating durations; the item whose accumulated total first exceeds `positionInCycle` is **active**

### Example
| Content | Duration | Accumulated |
|---------|----------|-------------|
| A       | 5 min    | 5           |
| B       | 3 min    | 8           |
| C       | 7 min    | 15          |

`totalCycleDuration = 15`. At minute 1000: `1000 % 15 = 10` → C is active.

At minute 1007: `1007 % 15 = 2` → A is active (cycle restarted).

---

## Security

- All private routes protected by JWT
- RBAC enforced at middleware level (principal/teacher separation)
- bcrypt password hashing (12 salt rounds)
- File type validation by MIME type AND extension
- File size capped at 10MB
- Rate limiting on public endpoint (60 req/min) and auth routes (20 req/15min)
- No sensitive data (password_hash, uploaded_by) exposed on public endpoints

---

##  Edge Cases Handled

| Case                                    | Response                      |
|-----------------------------------------|-------------------------------|
| No approved content for teacher         | `"No content available"`      |
| Approved content outside time window    | `"No content available"`      |
| Content approved but no schedule set    | Fallback to creation order    |
| Invalid/non-existent teacher ID         | `"No content available"`      |
| Invalid subject query                   | `"No content available"`      |
| Wrong file type uploaded                | `400` validation error        |
| File too large                          | `400` size limit error        |
| Approval of non-pending content         | `400` with explanation        |
| Rejection without reason                | `400` validation error        |

---

##  Bonus Features Implemented

- [x] Rate limiting on public API and auth endpoints
- [x] Caching aside of public live content. (MISS/HIT) 
- [x] Swagger UI API documentation at `/api-docs`
- [x] Pagination on content listing endpoints
- [x] Subject and status filtering
- [x] Teacher filtering (principal view)



##  Database Schema

```sql
users (id, name, email, password_hash, role, created_at)

content (id, title, description, subject, file_url, file_type, file_size,
         uploaded_by, status, rejection_reason, approved_by, approved_at,
         start_time, end_time, rotation_duration, created_at)

content_slots (id, teacher_id, subject, created_at)
  UNIQUE(teacher_id, subject)

content_schedule (id, content_id, slot_id, rotation_order, duration, created_at)
  UNIQUE(slot_id, rotation_order)
```

---

##  Assumptions & Notes

- `start_time` and `end_time` are **required** for content to appear on the live endpoint. Content without these fields is treated as "not scheduled" and will never be shown.
- Subjects are stored and compared **case-insensitively** (lowercased internally).
- The rotation algorithm is **stateless** — computed per request using wall-clock time.
- `rotation_order` in `content_schedule` is auto-assigned (max + 1) if not explicitly given.
- Multiple subjects per teacher each have their own **independent rotation cycle**.
- File storage is local (`src/uploads/`). For production, replace with S3.
- The public endpoint strips internal fields (`uploaded_by`, `approved_by`, `rejection_reason`) from responses.

---

