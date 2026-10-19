import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const COURSE_TYPES: Record<string, string> = {
    general_safety: 'Segurança Geral',
    onboarding: 'Acolhimento em Obra',
    environment: 'Ambiente em Obra',
    emergency: 'Emergência e Evacuação',
    safety_plan: 'Plano de Segurança Específico',
    task_based: 'Formação por Função/Tarefa',
};

export async function POST(req: NextRequest) {
    try {
        const { prompt, type, language = 'pt', passingScore = 70 } = await req.json();

        if (!prompt || !type) {
            return NextResponse.json({ success: false, error: 'Missing prompt or type' }, { status: 400 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
        }

        const courseTypeLabel = COURSE_TYPES[type] || type;
        const langLabel = language === 'pt' ? 'Português' : 'English';

        const systemPrompt = `You are an expert safety training content creator for the Portuguese construction industry.
You create structured training courses in ${langLabel} following Portuguese and EU safety regulations (ACT, ANPC, ISO 45001, EN norms).
Always respond with valid JSON only — no markdown, no explanation outside the JSON.`;

        const userPrompt = `Create a complete training course for: "${prompt}"
Course type: ${courseTypeLabel}
Language: ${langLabel}

Return a JSON object with this exact structure:
{
  "title": "Course title",
  "description": "Brief description (2-3 sentences)",
  "estimatedDuration": 45,
  "slides": [
    {
      "id": "slide_1",
      "order": 1,
      "type": "cover",
      "title": "Course Title",
      "body": "Subtitle or intro text",
      "layout": "default"
    },
    {
      "id": "slide_2",
      "order": 2,
      "type": "content",
      "title": "Section Title",
      "body": "Main content in markdown. Use **bold**, bullet lists, etc.",
      "layout": "default"
    },
    {
      "id": "slide_q1",
      "order": 5,
      "type": "question",
      "title": "Check your knowledge",
      "body": "Question text here",
      "questionId": "q1",
      "layout": "default"
    },
    {
      "id": "slide_last",
      "order": 6,
      "type": "summary",
      "title": "Summary",
      "body": "Key takeaways",
      "layout": "default"
    }
  ],
  "questions": [
    {
      "id": "q1",
      "courseId": "PLACEHOLDER",
      "order": 1,
      "text": "Question text",
      "type": "multiple_choice",
      "options": [
        {"id": "q1_a", "text": "Option A", "isCorrect": false},
        {"id": "q1_b", "text": "Option B", "isCorrect": true},
        {"id": "q1_c", "text": "Option C", "isCorrect": false},
        {"id": "q1_d", "text": "Option D", "isCorrect": false}
      ],
      "explanation": "Why the correct answer is correct"
    }
  ]
}

Requirements:
- Create 6-10 slides: 1 cover, 3-6 content/list slides, 1-2 question slides, 1 summary
- Create exactly 5 questions (multiple_choice or true_false)
- Content must be accurate and comply with Portuguese/EU safety regulations
- For onboarding/emergency/environment types, include mandatory regulatory content
- Slides of type "list" should have an "items" array instead of "body"
- Use slide type "image" sparingly (only if truly needed), leave imageUrl as null`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-5-haiku-20241022',
                max_tokens: 8096,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('[AI Generate] Anthropic error:', err);
            return NextResponse.json({ success: false, error: 'AI generation failed', details: err }, { status: 500 });
        }

        const data = await response.json();
        const rawText = data.content?.[0]?.text || '';

        // Parse JSON from response
        let courseData: any;
        try {
            // Strip any potential markdown code fences
            const cleaned = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
            courseData = JSON.parse(cleaned);
        } catch (e) {
            console.error('[AI Generate] Failed to parse JSON:', rawText);
            return NextResponse.json({ success: false, error: 'Failed to parse AI response', raw: rawText }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: {
                ...courseData,
                type,
                language,
                passingScore,
                sourceType: 'ai_generated',
                status: 'draft',
            }
        });

    } catch (err: any) {
        console.error('[AI Generate] Unexpected error:', err);
        return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 });
    }
}
