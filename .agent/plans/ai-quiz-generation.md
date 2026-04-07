---
artifact_type: implementation_plan
summary: |
  AI-powered quiz generation feature from PDF/Word documents using Google Gemini Pro API.
  Implements separate microservice architecture with GridFS storage, Redis caching, and
  full-stack integration including NestJS proxy and Next.js frontend.
created: 2026-02-03T11:02:14+07:00
status: in_progress
---

# AI Quiz Generation - Implementation Plan

## 📋 Overview

**Feature:** Auto-generate multiple-choice quizzes from PDF/Word files using Google Gemini Pro API.

**Architecture:** Microservice pattern (quiz_service) + NestJS proxy + Next.js frontend

**Key Decisions:**
- **Storage:** GridFS (MongoDB) for file persistence
- **Caching:** Redis with SHA256 hash keys
- **AI:** Google Gemini Pro (Free tier: 60 req/min)
- **Service:** Flask microservice (Port 9001)
- **Quiz Format:** Multiple choice (A, B, C, D)
- **User Control:** 10/15/20 questions, difficulty levels

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Next.js)                      │
│  Routes: /quizzes, /quizzes/create, /quizzes/:id/take       │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              NestJS Actions (Port 8000)                      │
│  Module: quizzes (Proxy + Business Logic)                   │
│  - File upload (Multer)                                      │
│  - GridFS operations                                         │
│  - Quiz CRUD                                                 │
└──────────┬─────────────────────────┬────────────────────────┘
           │                         │
           │ HTTP                    │ MongoDB
           ▼                         ▼
┌──────────────────────┐   ┌────────────────────┐
│  Quiz Service        │   │  MongoDB + GridFS  │
│  (Flask - Port 9001) │   │  Collections:      │
│  - PDF/Word parsing  │   │  - quizzes         │
│  - Gemini API        │   │  - quiz_attempts   │
│  - Response parsing  │   │  - fs.files (GridFS)│
└──────────┬───────────┘   └────────────────────┘
           │
           │ Cache hit check
           ▼
┌──────────────────────┐
│  Redis (Port 6379)   │
│  Keys: quiz:{hash}   │
│  TTL: 30 days        │
└──────────────────────┘
```

---

## 📦 Phase Breakdown

### Phase 1: Quiz Service Foundation (Backend Microservice)
**Duration:** 2 days  
**Priority:** P0 (Blocking)

#### Task 1.1: Project Setup
**File:** `quiz_service/`

- [ ] Create directory structure:
  ```
  quiz_service/
  ├── app/
  │   ├── __init__.py
  │   ├── config.py          # Environment config
  │   ├── gemini_client.py   # Gemini API wrapper
  │   ├── file_parser.py     # PDF/Word extraction
  │   ├── quiz_generator.py  # Main logic
  │   ├── cache_manager.py   # Redis operations
  │   └── routes.py          # Flask endpoints
  ├── tests/
  │   ├── test_parser.py
  │   └── test_generator.py
  ├── requirements.txt
  ├── .env.example
  ├── Dockerfile
  └── README.md
  ```

**Dependencies (requirements.txt):**
```txt
flask==3.0.0
flask-cors==4.0.0
google-generativeai==0.3.2
pymupdf==1.23.8              # Better PDF parsing than PyPDF2
python-docx==1.1.0
redis==5.0.1
python-dotenv==1.0.0
gunicorn==21.2.0
```

**Verification:**
```bash
cd quiz_service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -c "import fitz; import docx; import google.generativeai as genai; print('OK')"
```

---

#### Task 1.2: File Parser Implementation
**File:** `quiz_service/app/file_parser.py`

**Requirements:**
- Extract text from PDF (PyMuPDF)
- Extract text from Word (python-docx)
- Validate file format and size
- Handle errors gracefully

**Edge Cases:**
- Encrypted/password-protected PDFs → Fail with clear error
- Scanned PDFs (images) → Fail with suggestion to use text-based PDFs
- Corrupted files → Fail with "Invalid file format"
- Size > 50MB → Fail with "File too large (max 50MB)"
- Empty documents → Fail with "No text content found"

**Implementation:**
```python
class FileParser:
    SUPPORTED_FORMATS = ['.pdf', '.docx']
    MAX_SIZE_BYTES = 50 * 1024 * 1024  # 50MB
    
    def parse(self, file_path: str) -> dict:
        """
        Returns:
        {
            'text': str,
            'page_count': int,
            'word_count': int,
            'error': str | None
        }
        """
    
    def _parse_pdf(self, file_path: str) -> str
    def _parse_docx(self, file_path: str) -> str
    def _validate_file(self, file_path: str) -> bool
```

**Verification:**
- Test with valid PDF/Word
- Test with encrypted PDF → Should fail gracefully
- Test with image-only PDF → Should fail with clear message

---

#### Task 1.3: Gemini API Integration
**File:** `quiz_service/app/gemini_client.py`

**Prompt Engineering Strategy:**

```python
PROMPT_TEMPLATE = """
You are an expert educational quiz generator. Based on the following content, generate {count} multiple-choice questions.

**Requirements:**
- Difficulty: {difficulty}
- Each question must have exactly 4 options (A, B, C, D)
- Only ONE correct answer per question
- Include brief explanation for the correct answer
- Questions should cover main concepts from the text

**Content:**
{text}

**Output Format (STRICT JSON):**
{{
  "questions": [
    {{
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,  // Index: 0=A, 1=B, 2=C, 3=D
      "explanation": "Why this answer is correct"
    }}
  ]
}}

Generate {count} questions following this exact JSON format.
"""
```

**Implementation:**
```python
class GeminiClient:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
    
    def generate_quiz(self, text: str, count: int, difficulty: str) -> dict:
        """
        Args:
            text: Extracted text from document
            count: Number of questions (10, 15, 20)
            difficulty: 'easy', 'medium', 'hard'
        
        Returns:
            {
                'questions': [...],
                'error': str | None
            }
        """
        # Chunk text if > 30K tokens
        # Call Gemini API
        # Parse JSON response
        # Validate structure
```

**Error Handling:**
- Rate limit exceeded → Return cached error, suggest retry
- Invalid API key → Fail with clear message
- Response not JSON → Log + return parsing error
- Malformed questions → Filter out + regenerate if needed

**Verification:**
```python
# Test with sample text
client = GeminiClient(api_key="test_key")
result = client.generate_quiz("Python is a programming language...", 5, "easy")
assert len(result['questions']) == 5
assert all(len(q['options']) == 4 for q in result['questions'])
```

---

#### Task 1.4: Redis Caching Layer
**File:** `quiz_service/app/cache_manager.py`

**Caching Strategy:**
- **Key:** `quiz:{sha256_hash}:{count}:{difficulty}`
- **Value:** JSON quiz data
- **TTL:** 30 days (2,592,000 seconds)

**Why SHA256:**
- Same file → Same hash → Instant response
- Different files → Different hash → New generation
- Collision probability: negligible for practical use

**Implementation:**
```python
import hashlib
import redis

class CacheManager:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url)
        self.TTL = 30 * 24 * 60 * 60  # 30 days
    
    def get_file_hash(self, file_content: bytes) -> str:
        return hashlib.sha256(file_content).hexdigest()
    
    def get_cached_quiz(self, file_hash: str, count: int, difficulty: str) -> dict | None:
        key = f"quiz:{file_hash}:{count}:{difficulty}"
        cached = self.redis.get(key)
        return json.loads(cached) if cached else None
    
    def cache_quiz(self, file_hash: str, count: int, difficulty: str, quiz_data: dict):
        key = f"quiz:{file_hash}:{count}:{difficulty}"
        self.redis.setex(key, self.TTL, json.dumps(quiz_data))
```

**Verification:**
- Test cache hit/miss
- Test TTL expiration
- Test different parameters (same file, different count) → Different cache keys

---

#### Task 1.5: Flask API Routes
**File:** `quiz_service/app/routes.py`

**Endpoints:**

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| POST | `/generate` | Generate quiz from file | multipart/form-data | JSON quiz |
| GET | `/health` | Health check | - | `{"status": "ok"}` |

**POST /generate Request:**
```javascript
FormData {
  file: File (PDF/Word)
  count: "10" | "15" | "20"
  difficulty: "easy" | "medium" | "hard"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "file_hash": "abc123...",
    "cached": false,
    "questions": [
      {
        "question": "What is Python?",
        "options": ["A language", "A snake", "A tool", "A framework"],
        "correct_answer": 0,
        "explanation": "Python is a programming language"
      }
    ],
    "metadata": {
      "count": 10,
      "difficulty": "easy",
      "generated_at": "2026-02-03T11:15:00Z"
    }
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds 50MB limit",
    "details": "Your file is 62MB. Please upload a smaller file."
  }
}
```

**Error Codes:**
- `FILE_TOO_LARGE` - File > 50MB
- `INVALID_FORMAT` - Not PDF/Word
- `NO_TEXT_FOUND` - Empty or scanned document
- `ENCRYPTED_FILE` - Password-protected
- `API_RATE_LIMIT` - Gemini rate limit exceeded
- `GENERATION_FAILED` - Gemini API error

**Implementation:**
```python
@app.route('/generate', methods=['POST'])
def generate_quiz():
    # 1. Validate request
    # 2. Save file temporarily
    # 3. Parse file
    # 4. Check cache
    # 5. Generate quiz (if cache miss)
    # 6. Return response
    # 7. Cleanup temp file
```

**Verification:**
```bash
curl -X POST http://localhost:9001/generate \
  -F "file=@sample.pdf" \
  -F "count=10" \
  -F "difficulty=medium"
```

---

### Phase 2: NestJS Integration (Proxy Layer)
**Duration:** 1 day  
**Priority:** P0 (Blocking)

#### Task 2.1: Quizzes Module Setup
**Location:** `actions/src/quizzes/`

**Files to create:**
```
actions/src/quizzes/
├── quizzes.module.ts
├── quizzes.controller.ts
├── quizzes.service.ts
├── dto/
│   ├── create-quiz.dto.ts
│   └── take-quiz.dto.ts
└── schemas/
    ├── quiz.schema.ts
    └── quiz-attempt.schema.ts
```

**MongoDB Schemas:**

**1. Quiz Schema:**
```typescript
// quiz.schema.ts
@Schema({ timestamps: true })
export class Quiz {
  @Prop({ required: true, ref: 'User' })
  userId: string;

  @Prop({ required: true })
  subject: string;  // Môn học

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  fileHash: string;  // SHA256 for deduplication

  @Prop({ required: true })
  gridfsFileId: string;  // Reference to GridFS

  @Prop({ required: true, type: [QuestionSchema] })
  questions: Question[];

  @Prop({ required: true, enum: ['easy', 'medium', 'hard'] })
  difficulty: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

const QuestionSchema = new Schema({
  question: String,
  options: [String],
  correctAnswer: Number,  // 0-3
  explanation: String
});
```

**2. Quiz Attempt Schema:**
```typescript
// quiz-attempt.schema.ts
@Schema({ timestamps: true })
export class QuizAttempt {
  @Prop({ required: true, ref: 'Quiz' })
  quizId: string;

  @Prop({ required: true, ref: 'User' })
  userId: string;

  @Prop({ required: true, type: [Number] })
  answers: number[];  // User's answers (indices)

  @Prop({ required: true })
  score: number;  // Percentage (0-100)

  @Prop({ required: true })
  correctCount: number;

  @Prop({ required: true })
  totalCount: number;

  @Prop()
  completedAt: Date;
}
```

**Verification:**
```bash
cd actions
npm install @nestjs/mongoose mongoose
# Update app.module.ts to import QuizzesModule
```

---

#### Task 2.2: GridFS Integration
**File:** `actions/src/quizzes/quizzes.service.ts`

**Implementation:**
```typescript
import { GridFSBucket } from 'mongodb';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class QuizzesService {
  private gridFSBucket: GridFSBucket;

  constructor(
    @InjectConnection() private connection: Connection,
  ) {
    this.gridFSBucket = new GridFSBucket(this.connection.db, {
      bucketName: 'quizFiles'
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const uploadStream = this.gridFSBucket.openUploadStream(file.originalname);
    uploadStream.end(file.buffer);
    return new Promise((resolve, reject) => {
      uploadStream.on('finish', () => resolve(uploadStream.id.toString()));
      uploadStream.on('error', reject);
    });
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const downloadStream = this.gridFSBucket.openDownloadStream(new ObjectId(fileId));
    const chunks = [];
    for await (const chunk of downloadStream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}
```

**Verification:**
- Upload test file → Check GridFS in MongoDB Compass
- Download file → Verify integrity (compare hashes)

---

#### Task 2.3: Quiz Generation Proxy
**File:** `actions/src/quizzes/quizzes.service.ts`

**Implementation:**
```typescript
async generateQuiz(
  userId: string,
  file: Express.Multer.File,
  subject: string,
  count: number,
  difficulty: string
): Promise<Quiz> {
  // 1. Upload file to GridFS
  const gridfsFileId = await this.uploadFile(file);

  // 2. Call quiz_service
  const formData = new FormData();
  formData.append('file', new Blob([file.buffer]), file.originalname);
  formData.append('count', count.toString());
  formData.append('difficulty', difficulty);

  const response = await fetch('http://localhost:9001/generate', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();

  if (!result.success) {
    throw new BadRequestException(result.error.message);
  }

  // 3. Save quiz to MongoDB
  const quiz = await this.quizModel.create({
    userId,
    subject,
    fileName: file.originalname,
    fileHash: result.data.file_hash,
    gridfsFileId,
    questions: result.data.questions,
    difficulty
  });

  return quiz;
}
```

**Endpoints:**
```typescript
// quizzes.controller.ts
@Post('generate')
@UseInterceptors(FileInterceptor('file'))
async generate(
  @UploadedFile() file: Express.Multer.File,
  @Body() dto: CreateQuizDto,
  @Request() req
) {
  return this.quizzesService.generateQuiz(
    req.user.id,
    file,
    dto.subject,
    dto.count,
    dto.difficulty
  );
}

@Get('my-quizzes')
async getMyQuizzes(@Request() req) {
  return this.quizzesService.findByUserId(req.user.id);
}

@Get(':id')
async getQuiz(@Param('id') id: string) {
  return this.quizzesService.findOne(id);
}

@Post(':id/submit')
async submitQuiz(
  @Param('id') quizId: string,
  @Body() dto: TakeQuizDto,
  @Request() req
) {
  return this.quizzesService.submitQuiz(req.user.id, quizId, dto.answers);
}
```

**Verification:**
```bash
# Test generate endpoint
curl -X POST http://localhost:8000/api/quizzes/generate \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "subject=Mathematics" \
  -F "count=10" \
  -F "difficulty=medium"
```

---

### Phase 3: Frontend UI (Next.js)
**Duration:** 1.5 days  
**Priority:** P1 (High)

#### Task 3.1: Route Structure
**Files to create:**
```
client/app/quizzes/
├── page.tsx                    # Quiz list page
├── create/
│   └── page.tsx                # Upload & generate
├── [id]/
│   ├── page.tsx                # Quiz details
│   └── take/
│       └── page.tsx            # Take quiz
└── [id]/results/[attemptId]/
    └── page.tsx                # View results
```

**UI/UX Requirements (Premium Design):**
- Glassmorphism cards
- Smooth animations
- Responsive (mobile-first)
- Loading states with skeleton UI
- Error states with retry buttons
- Dark mode support

---

#### Task 3.2: Quiz List Page
**File:** `client/app/quizzes/page.tsx`

**Features:**
- Display all user's quizzes
- Filter by subject
- Search by filename
- Stats: total quizzes, average score
- "Generate New Quiz" CTA button

**Design:**
- Grid layout (3 columns desktop, 1 mobile)
- Card per quiz with:
  - Subject badge
  - Filename
  - Question count
  - Difficulty chip
  - Best score (if attempted)
  - "Take Quiz" / "Retake" button

---

#### Task 3.3: Quiz Creation Page
**File:** `client/app/quizzes/create/page.tsx`

**Features:**
- File upload (drag & drop + file picker)
- Subject input
- Question count selector (10/15/20)
- Difficulty selector (Easy/Medium/Hard)
- Generate button
- Progress indicator during generation
- Error handling with retry

**User Flow:**
1. User drops/selects file
2. Enters subject
3. Selects count & difficulty
4. Clicks "Generate Quiz"
5. Loading state (~10-30s)
6. On success → Redirect to quiz page
7. On error → Show error + retry button

**Implementation:**
```typescript
'use client';

export default function CreateQuizPage() {
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('');
  const [count, setCount] = useState<10 | 15 | 20>(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    formData.append('count', count.toString());
    formData.append('difficulty', difficulty);

    const response = await fetch('/api/quizzes/generate', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      setError(error.message);
      return;
    }

    const quiz = await response.json();
    router.push(`/quizzes/${quiz.id}`);
  };

  return (
    // UI implementation
  );
}
```

---

#### Task 3.4: Quiz Taking Page
**File:** `client/app/quizzes/[id]/take/page.tsx`

**Features:**
- Question navigation (numbered buttons)
- Current question display
- 4 option buttons (A, B, C, D)
- Progress bar
- Timer (optional)
- "Previous" / "Next" buttons
- "Submit Quiz" button (after answering all)
- Confirmation modal before submit

**State Management:**
```typescript
const [currentIndex, setCurrentIndex] = useState(0);
const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));

const handleSelectOption = (optionIndex: number) => {
  const newAnswers = [...answers];
  newAnswers[currentIndex] = optionIndex;
  setAnswers(newAnswers);
};

const handleSubmit = async () => {
  const response = await fetch(`/api/quizzes/${quizId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers })
  });
  const attempt = await response.json();
  router.push(`/quizzes/${quizId}/results/${attempt.id}`);
};
```

---

#### Task 3.5: Results Page
**File:** `client/app/quizzes/[id]/results/[attemptId]/page.tsx`

**Features:**
- Score display (large, animated)
- Percentage gauge
- Correct/Total count
- Question-by-question breakdown:
  - Question text
  - User's answer (highlighted green if correct, red if wrong)
  - Correct answer (if user was wrong)
  - Explanation
- "Retake Quiz" button
- "Back to Quizzes" button

**Design:**
- Hero score section (top)
- Scrollable question list (below)
- Color coding:
  - Green: Correct
  - Red: Wrong
  - Gray: Not answered

---

### Phase 4: Testing & Polish
**Duration:** 0.5 days  
**Priority:** P2 (Medium)

#### Task 4.1: Integration Testing
- [ ] Test with various PDF files (text, mixed, large)
- [ ] Test with Word documents (.docx)
- [ ] Test error cases (encrypted, corrupted, too large)
- [ ] Test cache hit/miss scenarios
- [ ] Test concurrent requests

#### Task 4.2: Performance Optimization
- [ ] Lazy load quiz questions (paginate if > 20)
- [ ] Optimize GridFS reads (stream instead of buffer)
- [ ] Add request timeout (30s) for Gemini API
- [ ] Monitor Redis memory usage

#### Task 4.3: Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Setup instructions (README)
- [ ] Environment variables guide
- [ ] Troubleshooting guide

---

## 🔧 Environment Variables

**quiz_service/.env:**
```env
FLASK_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
REDIS_URL=redis://localhost:6379/0
MAX_FILE_SIZE_MB=50
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

**actions/.env (additions):**
```env
QUIZ_SERVICE_URL=http://localhost:9001
```

**client/.env.local (additions):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📊 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Quiz generation time | < 15s | Monitor avg response time |
| Cache hit rate | > 70% | Redis stats |
| Gemini API cost | < $5/month | Track API calls |
| Error rate | < 5% | Log failed generations |
| User satisfaction | > 90% quiz quality | User feedback |

---

## 🚀 Deployment Checklist

- [ ] Add `quiz_service` to docker-compose.yml
- [ ] Setup Redis container
- [ ] Configure Gemini API key (secrets)
- [ ] Test GridFS in production MongoDB
- [ ] Configure CORS properly
- [ ] Add rate limiting (nginx)
- [ ] Setup monitoring (Sentry)
- [ ] Create backup strategy for GridFS

---

## 🔮 Future Enhancements (Phase 2)

1. **Competitive Testing:** Quiz battles between study buddies
2. **Leaderboards:** Top scores per subject
3. **Quiz Sharing:** Share quiz links with others
4. **Analytics:** Track weak topics based on wrong answers
5. **OCR Support:** Tesseract for scanned PDFs
6. **Question Bank:** Save/reuse individual questions
7. **Export:** Download quiz as PDF/Word
8. **Multilingual:** Detect document language, generate in same language

---

## 📝 Notes

- **Redis is optional for MVP:** Start without Redis, add later for optimization
- **Gemini alternatives:** Can swap to OpenAI GPT-4 if Gemini quality insufficient
- **GridFS alternatives:** Can migrate to S3/Cloudinary later if needed
- **Security:** Add file virus scanning before processing (ClamAV)
