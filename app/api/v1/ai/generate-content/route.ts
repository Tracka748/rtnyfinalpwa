import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 503 }
    );
  }

  try {
    const { eventName, venue, category, date, vibe, expectedAttendance } = await request.json();

    if (!eventName || !venue) {
      return NextResponse.json(
        { error: 'eventName and venue are required' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert event marketer for RTNY (RocTicketNY), a Rochester, NY event platform.
Generate compelling event content optimized for ticket sales.
Always use Rochester-specific context and local appeal.
Be creative, professional, and exciting.`,
        },
        {
          role: 'user',
          content: `Create a complete event package for:

Event Name: ${eventName}
Venue: ${venue}
Category: ${category || 'nightlife'}
Date: ${date || 'TBD'}
Vibe: ${vibe || 'exciting and engaging'}
Expected Attendance: ${expectedAttendance || '100-200'}

Generate:
1. Three catchy title variations (keep under 60 characters each)
2. A compelling 150-word description that sells tickets
3. Five highlight bullet points with emojis
4. Optimal ticket pricing with 3 tiers:
   - Early Bird (20% discount off general)
   - General Admission (base price)
   - VIP (premium experience, 3x general)
5. Three suggested add-ons promoters can sell
6. Social media copy for Instagram (engaging, under 150 chars)
7. Email subject line (compelling, under 50 chars)

Return as JSON with this exact structure:
{
  "titles": ["option1", "option2", "option3"],
  "description": "...",
  "highlights": ["emoji point 1", "emoji point 2", "emoji point 3", "emoji point 4", "emoji point 5"],
  "pricing": {
    "early_bird": 15,
    "general": 25,
    "vip": 75
  },
  "addons": [
    {"name": "...", "description": "...", "price": 20}
  ],
  "marketing": {
    "instagram": "...",
    "email_subject": "..."
  }
}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const content = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json({
      success: true,
      data: content,
      usage: {
        tokens: completion.usage?.total_tokens,
        cost: ((completion.usage?.total_tokens || 0) / 1000) * 0.01,
      },
    });
  } catch (error) {
    console.error('AI content generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
