import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const RTNYStyles: Record<string, { name: string; category: string[]; prompt: string }> = {
  urbanNeon: {
    name: 'Urban Neon',
    category: ['nightlife', 'club'],
    prompt: `Dark urban nightlife scene with neon accents.
Colors: Mint green (#59FFA0) and blue (#007BFF) neon lights.
Mood: Modern, energetic, sophisticated.
Background: Deep black (#121113) with strategic neon glow.
Composition: TOP 30% clear dark space, BOTTOM 20% clear dark space.
NO TEXT, NO LETTERS, NO NUMBERS anywhere.`,
  },
  luxuryGold: {
    name: 'Luxury Gold',
    category: ['vip-event', 'gala'],
    prompt: `Upscale elegant atmosphere with gold and champagne tones.
Colors: Gold accents, deep blacks, mint green highlights.
Mood: Sophisticated, premium, VIP.
Elements: Soft bokeh lights, elegant ambiance.
Composition: TOP 30% clear, BOTTOM 20% clear for text.
NO TEXT in image.`,
  },
  rooftopSunset: {
    name: 'Rooftop Sunset',
    category: ['rooftop', 'outdoor'],
    prompt: `Sunset rooftop atmosphere with warm orange and pink tones.
Colors: Sunset gradient, mint green accents, deep shadows.
Mood: Romantic, upscale, Instagram-worthy.
Elements: City skyline silhouette, golden hour lighting.
Composition: Clear space top and bottom for text overlay.
NO TEXT, NO WORDS in image.`,
  },
  darkTrap: {
    name: 'Dark Trap',
    category: ['hip-hop', 'trap'],
    prompt: `Dark moody trap music aesthetic.
Colors: Deep blacks, purple haze, mint green accents.
Mood: Intense, edgy, underground.
Elements: Smoke effects, dramatic lighting, minimal detail.
Composition: Dark spaces for text overlay.
NO TEXT anywhere.`,
  },
  afrobeatTropical: {
    name: 'Afrobeat Tropical',
    category: ['afrobeat', 'caribbean'],
    prompt: `Vibrant tropical afrobeat party atmosphere.
Colors: Warm oranges, turquoise, mint green, gold.
Mood: Energetic, colorful, celebratory.
Elements: Abstract tropical patterns, warm lighting.
Composition: Space for text top and bottom.
NO TEXT in image.`,
  },
  sportsPremium: {
    name: 'Sports Premium',
    category: ['sports', 'athletics'],
    prompt: `Stadium atmosphere with team spirit energy.
Colors: Team-neutral with mint green and blue accents.
Mood: Exciting, high-energy, community.
Elements: Stadium lights, abstract crowd energy, no faces.
Composition: Clear areas for event info.
NO TEXT, NO NUMBERS.`,
  },
  theaterElegant: {
    name: 'Theater Elegant',
    category: ['theater', 'arts', 'performance'],
    prompt: `Sophisticated theater and arts atmosphere.
Colors: Deep burgundy, gold accents, mint green highlights.
Mood: Cultural, refined, artistic.
Elements: Stage lighting, elegant drapes, artistic ambiance.
Composition: Professional layout with text space.
NO TEXT in image.`,
  },
  familyFun: {
    name: 'Family Fun',
    category: ['family', 'community'],
    prompt: `Bright, welcoming family-friendly atmosphere.
Colors: Soft pastels with mint green and blue accents.
Mood: Joyful, safe, inclusive.
Elements: Soft lighting, playful without being childish.
Composition: Clean layout for family event details.
NO TEXT anywhere.`,
  },
};

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 503 }
    );
  }

  try {
    const { style, customization } = await request.json();

    const styleKey = style || 'urbanNeon';
    const styleTemplate = RTNYStyles[styleKey];

    if (!styleTemplate) {
      return NextResponse.json(
        { error: 'Invalid style selected' },
        { status: 400 }
      );
    }

    let safePrompt = styleTemplate.prompt;

    safePrompt += `

CRITICAL SAFETY REQUIREMENTS:
- NO TEXT anywhere in the image
- NO LETTERS, NO NUMBERS, NO WORDS
- Leave TOP 30% and BOTTOM 20% as clear dark space for text overlay
- Professional event background only
- RTNY brand colors: mint green #59FFA0, blue #007BFF, black #121113
- Photorealistic or stylized atmospheric art, NOT a poster or flyer`;

    if (customization) {
      const sanitized = customization
        .replace(/text|letter|number|date|name|title|word/gi, '')
        .trim();
      if (sanitized) {
        safePrompt += `\nAdditional element: ${sanitized}`;
      }
    }

    const image = await openai.images.generate({
      model: 'dall-e-3',
      prompt: safePrompt,
      size: '1024x1792',
      quality: 'hd',
      n: 1,
    });

    const imageUrl = image.data?.[0]?.url;

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
        style: styleTemplate.name,
        styleKey,
      },
    });
  } catch (error) {
    console.error('Background generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate background' },
      { status: 500 }
    );
  }
}
