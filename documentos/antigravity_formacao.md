# ANTIGRAVITY — Módulo de Formação e Qualificações
### Especificação Técnica Completa | Next.js | Versão 1.0

---

## 1. Contexto da Aplicação

A Antigravity é uma aplicação Next.js de gestão de segurança em obra (construção civil / indústria). O módulo de Formação já tem uma janela/módulo previsto com alguns componentes criados. O objetivo é expandir esse módulo com as funcionalidades descritas neste documento, sem quebrar o que já existe.

| Parâmetro | Detalhe |
|---|---|
| Framework | Next.js (App Router ou Pages Router — respeitar o existente) |
| Módulo Formação | Já tem componentes criados — analisar e expandir |
| Modo Apresentação | Nova tab/janela do browser (`window.open` / `target="_blank"`), fullscreen, otimizado para projetor |
| Integração AI | Verificar se já existe na app. Se não, implementar via Anthropic Claude API |
| Idiomas mínimos | Português e Inglês |
| Formador | Técnico de segurança / manager — acede à app e apresenta em ecrã maior |

---

## 2. Funcionalidades a Desenvolver

### 2.1 Página Principal de Formação

Expandir a página existente com:

- Lista de cursos criados, com filtros por tipo, obra e estado
- Botão "Novo Curso" que abre o editor/notebook AI
- Biblioteca de templates — cursos base reutilizáveis entre obras
- Dashboard resumo: formações obrigatórias pendentes por obra, turmas agendadas, trabalhadores sem formação completa

---

### 2.2 Editor de Cursos via AI (Notebook)

Interface tipo notebook com dois modos:

**Modo AI:**
- Campo onde o técnico descreve o tema — ex: *"Formação de acolhimento para obra de construção civil em Lisboa"*
- A AI gera estrutura completa: introdução, capítulos, slides, perguntas de avaliação
- Para cursos genéricos de segurança, a AI usa web search em fontes credíveis (ACT, ANPC, OSHA, normas EN/ISO)
- Para cursos baseados em documentos internos (PSS, Plano de Emergência), o técnico faz upload do PDF/Word e a AI extrai e estrutura o conteúdo

**Modo Manual:**
- Editor rich text por slides/secções
- Possibilidade de adicionar imagens, tabelas, listas
- Reordenar secções drag & drop

**Tipos de curso suportados** (selector no início do editor):

| Tipo | Fonte de Conteúdo | Observação |
|---|---|---|
| Segurança Geral | Web (fontes credíveis) + AI | Genérico por tipo de trabalho |
| Plano de Segurança Específico | PSS criado na app ou upload PDF/Word | Ligado ao módulo de PSS |
| Acolhimento em Obra ★ | PSS da obra | **OBRIGATÓRIO** no início |
| Ambiente em Obra ★ | PSS + conteúdo interno + AI | **OBRIGATÓRIO** no início |
| Emergência e Evacuação ★ | Plano de Emergência da obra | **OBRIGATÓRIO** no início |
| Formação por Função/Tarefa | Conteúdo interno + AI | Consoante as tarefas |

> ★ = Obrigatória para todos os trabalhadores no início de cada obra

---

### 2.3 Modo Apresentação (Nova Tab)

Quando o técnico clica em **"Iniciar Apresentação"**, abre numa nova tab com:

- Layout fullscreen tipo slideshow (estilo PowerPoint/Reveal.js)
- Navegação por setas ou teclado
- Cada slide: título, conteúdo, imagens se existirem
- Slides de perguntas intercalados com resposta em tempo real
- Barra de progresso do curso
- Botão **"Concluir Formação"** no último slide — regista a sessão e despoleta o processo de assinatura
- Design limpo e legível a distância (fontes grandes, alto contraste)

---

### 2.4 Gestão de Turmas

- Criar turma: associar curso + obra + lista de trabalhadores (seleção da base existente)
- Definir: data, hora, local, formador responsável
- Estados: `Agendada` → `Em Curso` → `Concluída`
- Histórico de turmas por curso e por obra

---

### 2.5 Registo de Presenças e Assinatura Digital

- Lista de trabalhadores da turma com checkbox de presença
- Cada trabalhador presente assina digitalmente (canvas touch/mouse)
- Geração automática de PDF de folha de presenças com assinaturas
- Registo imediato na ficha do trabalhador no módulo existente:
  - Nome do curso, tipo de formação, data/hora, formador
  - Validade (configurável por tipo)
  - PDF assinado anexado

---

### 2.6 Auto-Formação (App Móvel — preparar API)

Preparar lógica e endpoints para a futura app móvel do trabalhador:

- Cursos marcados como **"Disponível para auto-formação"** são enviados para a app móvel
- Formato: array de slides + perguntas com respostas múltiplas
- Endpoint que recebe: `{ workerId, courseId, completedAt, score, passed }`
- Registo processado da mesma forma que formação presencial (entra na ficha do trabalhador)
- Pontuação mínima de aprovação configurável por curso

---

### 2.7 Regras de Obrigatoriedade

Ao associar um trabalhador a uma obra, verificar se tem as 3 formações obrigatórias:

- Acolhimento em Obra
- Ambiente em Obra
- Emergência e Evacuação

Se faltar alguma → alerta visível na ficha do trabalhador e no dashboard da obra. Formações por função/tarefa → configuráveis pelo técnico por obra.

---

### 2.8 Integrações Internas

- **Módulo de Trabalhadores** (existente) — leitura de lista + escrita de formações na ficha
- **Módulo de Obras** (existente) — associação de cursos e turmas a obras
- **Módulo de Planos de Segurança e Saúde** (a criar) — fonte de conteúdo para cursos específicos
- **Upload de documentos** — PDF/Word processado pela AI para extração de conteúdo

---

### 2.9 Verificação e Integração AI

Antes de implementar, **verificar na codebase existente** se já existe:
- Qualquer chamada a APIs de AI (OpenAI, Anthropic, etc.)
- Variáveis de ambiente relacionadas (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.)
- Serviços ou utils de AI já criados

Se não existir nenhuma integração, implementar via **Anthropic Claude API** com:
- Geração de conteúdo estruturado (JSON) para cursos
- Web search ativo para conteúdo de segurança genérico
- Processamento de documentos uploaded para extração de conteúdo

---

## 3. Prioridade de Implementação

| # | Funcionalidade | Dependências |
|---|---|---|
| 1 | Editor de cursos + geração AI | — |
| 2 | Modo apresentação (nova tab) | Editor de cursos |
| 3 | Gestão de turmas + assinatura digital | Editor de cursos |
| 4 | Integração na ficha do trabalhador | Gestão de turmas |
| 5 | Regras de obrigatoriedade + alertas | Ficha do trabalhador |
| 6 | Endpoints para auto-formação (app móvel) | Editor de cursos |

---

## 4. Schemas de Dados

### 4.1 Course

```typescript
interface Course {
  id: string
  title: string
  description: string
  type:
    | 'general_safety'        // Segurança geral
    | 'onboarding'            // Acolhimento em obra (obrigatório)
    | 'environment'           // Ambiente em obra (obrigatório)
    | 'emergency'             // Emergência e evacuação (obrigatório)
    | 'safety_plan'           // Plano de segurança específico
    | 'task_based'            // Por função/tarefa

  status: 'draft' | 'published' | 'archived'
  isTemplate: boolean         // true = curso base reutilizável
  isMandatory: boolean        // true = obrigatório para todos
  isSelfLearning: boolean     // true = disponível para app móvel

  language: 'pt' | 'en'
  estimatedDuration: number   // minutos

  sourceType:
    | 'ai_generated'          // Gerado pela AI com web search
    | 'document_upload'       // Baseado em PDF/Word carregado
    | 'safety_plan'           // Baseado num PSS da aplicação
    | 'manual'                // Criado manualmente

  sourceDocumentUrl?: string
  sourceSafetyPlanId?: string
  aiPromptUsed?: string

  slides: Slide[]
  passingScore: number        // 0-100
  questions: Question[]

  createdBy: string
  createdAt: Date
  updatedAt: Date
  version: number
  validityMonths?: number     // null = não expira
}
```

### 4.2 Slide

```typescript
interface Slide {
  id: string
  order: number
  type: 'cover' | 'content' | 'image' | 'video' | 'list' | 'question' | 'summary'
  title: string
  body?: string               // Rich text / markdown
  imageUrl?: string
  videoUrl?: string
  items?: string[]            // Para slides tipo 'list'
  questionId?: string         // Para slides tipo 'question'
  layout: 'default' | 'full_image' | 'two_column' | 'highlight'
  notes?: string              // Notas do formador (não visíveis no ecrã)
}
```

### 4.3 Question

```typescript
interface Question {
  id: string
  courseId: string
  order: number
  text: string
  type: 'multiple_choice' | 'true_false'
  options: {
    id: string
    text: string
    isCorrect: boolean
  }[]
  explanation?: string
}
```

### 4.4 TrainingSession

```typescript
interface TrainingSession {
  id: string
  courseId: string
  workId: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  scheduledDate: Date
  startedAt?: Date
  completedAt?: Date
  location: string
  trainerId: string
  enrolledWorkers: string[]
  attendees: Attendee[]
  presentationCompletedAt?: Date
  signedDocumentUrl?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}
```

### 4.5 Attendee

```typescript
interface Attendee {
  workerId: string
  present: boolean
  signedAt?: Date
  signatureImageBase64?: string
  signatureMethod: 'canvas' | 'pin' | 'absent'
  answers?: {
    questionId: string
    selectedOptionId: string
    isCorrect: boolean
  }[]
  score?: number
  passed?: boolean
}
```

### 4.6 WorkerTrainingRecord

```typescript
interface WorkerTrainingRecord {
  id: string
  workerId: string
  courseId: string
  sessionId?: string          // null se auto-formação
  trainingType: Course['type']
  courseTitle: string
  completedAt: Date
  validUntil?: Date
  isExpired: boolean          // computed
  score?: number
  passed: boolean
  trainerId?: string
  trainerName?: string
  signedDocumentUrl?: string
  source: 'presential' | 'self_learning'
  workId?: string
  createdAt: Date
}
```

### 4.7 SelfLearningSubmission (App Móvel)

```typescript
interface SelfLearningSubmission {
  workerId: string
  courseId: string
  deviceId: string
  startedAt: Date
  completedAt: Date
  answers: {
    questionId: string
    selectedOptionId: string
  }[]
  slidesViewed: {
    slideId: string
    viewedAt: Date
    timeSpentSeconds: number
  }[]
  score: number
  passed: boolean
}

interface SelfLearningResponse {
  success: boolean
  recordId: string
  certificateUrl?: string
  message: string
}
```

### 4.8 WorkerComplianceStatus

```typescript
interface WorkerComplianceStatus {
  workerId: string
  workId: string
  mandatoryTrainings: {
    type: 'onboarding' | 'environment' | 'emergency'
    label: string
    completed: boolean
    completedAt?: Date
    validUntil?: Date
    isExpired: boolean
    recordId?: string
  }[]
  taskBasedTrainings: {
    courseId: string
    title: string
    required: boolean
    completed: boolean
  }[]
  isCompliant: boolean
  blockedReason?: string
  lastCheckedAt: Date
}
```

### 4.9 Relações entre Entidades

```
Course
  └── Slide[]
  └── Question[]

TrainingSession
  ├── Course (1:1)
  ├── Work/Obra (1:1)
  └── Attendee[]
        └── Worker (1:1)

WorkerTrainingRecord
  ├── Worker (1:1)
  ├── Course (1:1)
  └── TrainingSession? (null se auto-formação)

WorkerComplianceStatus
  ├── Worker (1:1)
  ├── Work/Obra (1:1)
  └── WorkerTrainingRecord[] (referências)
```

---

## 5. API Routes (Next.js)

> **Base path:** `/api/training` | **Auth:** Bearer token em todos os endpoints
> **Erros:** `{ success: false, error: string, code: string }`
> **Sucesso:** `{ success: true, data: T }`

### 5.1 Cursos

```
GET    /api/training/courses
       Query: type?, status?, isTemplate?, isMandatory?, isSelfLearning?, workId?, page?, limit?

GET    /api/training/courses/:id
POST   /api/training/courses
PATCH  /api/training/courses/:id
DELETE /api/training/courses/:id
POST   /api/training/courses/:id/clone
POST   /api/training/courses/:id/publish

GET|POST|PATCH|DELETE  /api/training/courses/:id/slides(/:slideId)
PUT    /api/training/courses/:id/slides/reorder
       Body: { orderedIds: string[] }

GET|POST|PATCH|DELETE  /api/training/courses/:id/questions(/:questionId)
```

### 5.2 Geração AI

```
POST   /api/training/ai/generate
       Body: { prompt, type, language, workId?, useWebSearch?, passingScore? }
       Response: streaming SSE — draft de curso + sourcesUsed[]

POST   /api/training/ai/generate-from-document
       Body: FormData { file: PDF|Word, type, language, prompt? }

POST   /api/training/ai/generate-from-safety-plan
       Body: { safetyPlanId, type, language, prompt? }

POST   /api/training/ai/regenerate-slide
       Body: { courseId, slideId, instructions }

POST   /api/training/ai/generate-questions
       Body: { courseId, count? }   // default: 5
```

### 5.3 Turmas

```
GET    /api/training/sessions
       Query: workId?, courseId?, trainerId?, status?, dateFrom?, dateTo?, page?, limit?

GET    /api/training/sessions/:id
POST   /api/training/sessions
       Body: { courseId, workId, scheduledDate, location, trainerId, enrolledWorkers[] }
PATCH  /api/training/sessions/:id
POST   /api/training/sessions/:id/cancel       Body: { reason? }
POST   /api/training/sessions/:id/start
GET    /api/training/sessions/:id/presentation-url
       Response: { url: '/training/present/:id?token=xxx' }

POST   /api/training/sessions/:id/complete
       Body: { attendees: [{ workerId, present, signatureImageBase64?, answers? }] }
       Response: { session, records[], signedDocumentUrl }

GET    /api/training/sessions/:id/attendance-pdf
       Response: application/pdf
```

### 5.4 Modo Apresentação

```
GET    /api/training/present/:sessionId/validate
       Query: { token }
       Response: { session, course (com slides+perguntas), trainer }

POST   /api/training/present/:sessionId/progress
       Body: { currentSlideIndex, token }
```

### 5.5 Registos de Formação

```
GET    /api/training/records
       Query: workerId, courseType?, workId?, source?, expired?, page?, limit?

GET    /api/training/records/:id

POST   /api/training/records   // Registo manual (formação externa reconhecida)
       Body: { workerId, courseTitle, trainingType, completedAt,
               validUntil?, score?, passed, source, workId?, externalDocumentUrl? }

DELETE /api/training/records/:id    Body: { reason }
```

### 5.6 Auto-Formação — App Móvel

```
GET    /api/training/self-learning/courses
       Query: { workerId, workId?, language? }
       Response: { mandatory: Course[], available: Course[] }

GET    /api/training/self-learning/courses/:courseId
       Query: { workerId }

POST   /api/training/self-learning/submit
       Body: SelfLearningSubmission
       Response: SelfLearningResponse

GET    /api/training/self-learning/status/:courseId
       Query: { workerId }
       Response: { completed, record? }
```

### 5.7 Conformidade e Obrigatoriedade

```
GET    /api/training/compliance/:workerId
       Query: { workId }
       Response: { status: WorkerComplianceStatus }

GET    /api/training/compliance/work/:workId
       Response: { total, compliant, nonCompliant, workers: WorkerComplianceStatus[] }

GET    /api/training/compliance/expiring
       Query: { workId?, daysAhead? }   // default: 30 dias

GET    /api/training/compliance/missing
       Query: { workId }
       Response: { missing: [{ workerId, workerName, missingTypes[] }] }
```

### 5.8 Upload de Documentos

```
POST   /api/training/documents/upload
       Body: FormData { file }   // PDF ou Word, max 20MB
       Response: { documentId, documentUrl, extractedText, pageCount? }

GET    /api/training/documents
DELETE /api/training/documents/:id
```

### 5.9 Resumo Completo de Rotas

```
COURSES ──────────────────────────────────────────────────────────
  GET|POST              /api/training/courses
  GET|PATCH|DELETE      /api/training/courses/:id
  POST                  /api/training/courses/:id/clone
  POST                  /api/training/courses/:id/publish
  GET|POST|PATCH|DELETE /api/training/courses/:id/slides(/:slideId)
  PUT                   /api/training/courses/:id/slides/reorder
  GET|POST|PATCH|DELETE /api/training/courses/:id/questions(/:questionId)

AI ───────────────────────────────────────────────────────────────
  POST   /api/training/ai/generate
  POST   /api/training/ai/generate-from-document
  POST   /api/training/ai/generate-from-safety-plan
  POST   /api/training/ai/regenerate-slide
  POST   /api/training/ai/generate-questions

SESSIONS ─────────────────────────────────────────────────────────
  GET|POST         /api/training/sessions
  GET|PATCH        /api/training/sessions/:id
  POST             /api/training/sessions/:id/cancel
  POST             /api/training/sessions/:id/start
  GET              /api/training/sessions/:id/presentation-url
  POST             /api/training/sessions/:id/complete
  GET              /api/training/sessions/:id/attendance-pdf

PRESENTATION ─────────────────────────────────────────────────────
  GET    /api/training/present/:sessionId/validate
  POST   /api/training/present/:sessionId/progress

RECORDS ──────────────────────────────────────────────────────────
  GET|POST         /api/training/records
  GET|DELETE       /api/training/records/:id

SELF-LEARNING ────────────────────────────────────────────────────
  GET    /api/training/self-learning/courses
  GET    /api/training/self-learning/courses/:courseId
  POST   /api/training/self-learning/submit
  GET    /api/training/self-learning/status/:courseId

COMPLIANCE ───────────────────────────────────────────────────────
  GET    /api/training/compliance/:workerId
  GET    /api/training/compliance/work/:workId
  GET    /api/training/compliance/expiring
  GET    /api/training/compliance/missing

DOCUMENTS ────────────────────────────────────────────────────────
  POST   /api/training/documents/upload
  GET    /api/training/documents
  DELETE /api/training/documents/:id
```

---

*Antigravity — Módulo de Formação | Versão 1.0 | 2025*
