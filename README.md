# MetricMind AI

> **An Analytics Dashboard That Explains Itself.**

MetricMind AI is a university internship capstone project designed to bridge the gap between raw CSV files and actionable business intelligence. By automating data validation, cleaning, statistical processing, and plain-English context narrative generation, it enables non-technical business managers to immediately understand what their numbers actually mean.

---

## Key Features

*   **Secure Authentication:** User signup, login, and secure sessions via Supabase Auth.
*   **Intelligent CSV Parser:** Client-side validations combined with robust backend parsing using PapaParse to handle missing columns, corrupted headers, and invalid numbers.
*   **Database Isolation (Row-Level Security):** Complete tenant isolation ensuring users never access or modify another user's datasets or logs.
*   **Auto-Generated Charts:** Dynamic visualizations including trend lines, bar comparisons, pie share distributions, and area charts rendered via Recharts.
*   **Gemini-Powered Business Insights:** Safe statistics extraction sent to Google's Gemini API to compile business explanations, recommendations, and warnings.
*   **Historical Dashboard Log:** History panels tracking all previous uploads and calculations.
*   **Platform Utilization Logs:** Personal audit statistics detailing aggregate row entries, generation counts, and file parameters.

---

## Tech Stack

*   **Frontend:** Next.js 15 (App Router), TypeScript, TailwindCSS, shadcn/ui, Recharts
*   **Backend:** Next.js Serverless API Routes
*   **Database:** Supabase PostgreSQL
*   **Authentication:** Supabase Auth JWT Verification
*   **Storage:** Supabase Storage Bucket File Management
*   **AI Engine:** Google Gemini API (`gemini-2.5-flash`)
*   **CSV Parsing Library:** PapaParse

---

## Architecture Overview

```
                        ┌───────────────────────────────┐
                        │      Next.js Frontend UI      │
                        └──────────────┬────────────────┘
                                       │
                      POST /api/datasets/upload (CSV)
                                       │
                                       ▼
                        ┌───────────────────────────────┐
                        │    CSV Parser & Clean Engine  │
                        └──────────────┬────────────────┘
                                       │
                       Calculate Summary Stats & Save Rows
                                       │
                                       ▼
    ┌──────────────────────┐  Write  ┌───────────────────────────────┐
    │   Supabase Storage   │◄────────┤    Supabase PostgreSQL Db     │
    └──────────────────────┘         └──────────────┬────────────────┘
                                                    │
                                           Fetch Summary Stats
                                                    │
                                                    ▼
    ┌──────────────────────┐   Prompt  ┌───────────────────────────────┐
    │  Google Gemini API   │◄──────────┤   Next.js API Insights Route  │
    └──────────────────────┘           └───────────────────────────────┘
```

---

## Folder Structure

```
├── app/                      # Next.js App Router folders
│   ├── api/                  # API endpoints (Upload, Insights, etc.)
│   ├── dashboard/            # Core dashboard layout and index page
│   ├── datasets/             # Dataset detail dashboards and insights
│   ├── login/                # Session creation page
│   └── signup/               # Account registration page
├── components/               # React components
│   ├── ui/                   # Reusable UI items (Buttons, Dialogs)
│   └── charts/               # Recharts wrapping charts
├── lib/                      # Database clients & Core engines
│   ├── supabase.ts           # Supabase connection initializer
│   ├── gemini.ts             # Google Gemini SDK caller
│   └── cleanEngine.ts        # PapaParse cleaning algorithms
├── hooks/                    # Custom hooks (e.g. useAuth)
├── types/                    # TypeScript interfaces
├── utils/                    # Common helper utilities
└── public/                   # Static media assets
```

---

## Installation

### Prerequisites
*   Node.js (v18.0.0 or higher)
*   npm or yarn package manager
*   A Supabase project (Free tier works perfectly)
*   A Google Gemini API key (Obtainable via Google AI Studio)

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/metricmind-ai.git
cd metricmind-ai
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Create a file named `.env.local` in the root folder of the project and paste the following configuration:

```env
# Next.js Public Supabase Config
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-Only Supabase Service Key (for bypass RLS triggers only if required)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini API Key
GEMINI_API_KEY=AIzaSyA...
```

---

## Database Setup

Run the following SQL commands inside the **Supabase SQL Editor** to establish all schemas, constraints, indexes, and Row Level Security (RLS) policies.

```sql
-- 1. Create Profile Table
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Setup Profile Sync Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'MetricMind User')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create Datasets Table
CREATE TABLE public.datasets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    row_count INTEGER NOT NULL,
    column_count INTEGER NOT NULL,
    headers TEXT[] NOT NULL,
    summary_statistics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Create Dataset Rows Table
CREATE TABLE public.dataset_rows (
    id BIGSERIAL PRIMARY KEY,
    dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE NOT NULL,
    row_index INTEGER NOT NULL,
    row_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Create Generated Insights Table
CREATE TABLE public.generated_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    insights_content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Create Analytics Table
CREATE TABLE public.analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Add Optimization Indexes
CREATE INDEX idx_datasets_user ON public.datasets(user_id);
CREATE INDEX idx_dataset_rows_dataset ON public.dataset_rows(dataset_id);
CREATE INDEX idx_insights_dataset ON public.generated_insights(dataset_id);
CREATE INDEX idx_insights_user ON public.generated_insights(user_id);
CREATE INDEX idx_analytics_user ON public.analytics(user_id);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- 9. Add RLS Security Policies
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can edit their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Select datasets" ON public.datasets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert datasets" ON public.datasets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete datasets" ON public.datasets FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Select rows" ON public.dataset_rows FOR SELECT USING (EXISTS (SELECT 1 FROM public.datasets WHERE public.datasets.id = public.dataset_rows.dataset_id AND public.datasets.user_id = auth.uid()));
CREATE POLICY "Insert rows" ON public.dataset_rows FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.datasets WHERE public.datasets.id = public.dataset_rows.dataset_id AND public.datasets.user_id = auth.uid()));
CREATE POLICY "Select insights" ON public.generated_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert insights" ON public.generated_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Select analytics" ON public.analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert analytics" ON public.analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## Running Locally

To initiate the local development node server, execute:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

To build the project for production, run:
```bash
npm run build
npm run start
```

---

## Core Workflows

### 1. CSV Upload & Cleaning
1.  **Frontend drag-and-drop:** A custom `<FileUpload />` component receives `.csv` datasets under 10MB.
2.  **API Parsing Stream:** Files are piped into the `/api/datasets/upload` route, running `PapaParse` dynamically.
3.  **Data Cleaning Engine:** 
    *   Header strings are stripped of characters and symbols.
    *   Row counts and key columns are scanned.
    *   Mismatched row cells are padded; dates are forced into ISO formats.
4.  **Database Storage:** A record is committed to `datasets` containing a computed `summary_statistics` JSON object. Raw row items map to `dataset_rows`.

### 2. Secure AI Workflow (Google Gemini)
*   **The Problem:** Sending full tables containing thousands of lines exceeds token limits and risks user privacy.
*   **The Safe Solution:**
    1.  The UI requests analysis: `POST /api/datasets/[id]/insights`.
    2.  The API route fetches only the pre-computed `summary_statistics` JSON from the database.
    3.  A structural text prompt is formulated, packing values (e.g. Total Revenue: $142,000, Top Category: Electronics).
    4.  The prompt directs Gemini to return JSON outputs containing structural paragraphs: business observations, alerts, and recommendations.
    5.  Results are cached in the database table `generated_insights`.

### 3. Automatic Chart Mapping
*   **Data Type Analyzer:** Columns are examined for numerical vs. categorical keys.
*   **Recharts Render:**
    *   If sequential dates are found, a **Line Chart** and **Area Chart** visualize value growth.
    *   If categorical groupings dominate, a **Bar Chart** compares sizes.
    *   If category dimensions are fewer than 6, a **Pie Chart** displays volume breakdown.

---

## Screenshots Placeholders

Place screenshot mocks inside `/public/assets/screenshots/` and update matching links below:

*   **Dashboard View:** `![Dashboard Screen](/public/assets/screenshots/dashboard.png)`
*   **Data Analysis Charts:** `![Interactive Analytics Charts](/public/assets/screenshots/charts.png)`
*   **AI Written Insights Panel:** `![Conversational AI Insights Screen](/public/assets/screenshots/insights.png)`

---

## Deployment to Vercel

MetricMind AI is optimized for seamless hosting on Vercel:

1.  Push your code to GitHub.
2.  Import the repository inside the Vercel Dashboard.
3.  Ensure default build commands remain (`next build`).
4.  Populate Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`) within Vercel's project settings panel.
5.  Click **Deploy**.

---

## Future Improvements

*   **PDF Report Generation:** Click to compile all charts and AI observations into a PDF file.
*   **Google Sheets / Excel integration:** Direct connections pulling live spreadsheets.
*   **Natural Language Chat:** Ask follow-up questions to your dataset directly using an AI chat interface.

---

## Contributing

1.  Fork the Project.
2.  Create your Feature Branch (`git checkout -b feature/NewFeature`).
3.  Commit your modifications (`git commit -m 'Introduce NewFeature'`).
4.  Push changes (`git push origin feature/NewFeature`).
5.  Open a Pull Request.

---

## License

Distributed under the MIT License. See `LICENSE` for details.
