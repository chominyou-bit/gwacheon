import Anthropic from '@anthropic-ai/sdk';
import { AnalyzeResult } from '@/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeHomeworkImage(
  base64Image: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
): Promise<AnalyzeResult> {
  const today = new Date().toISOString().split('T')[0];

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `이 이미지는 학생의 숙제 사진입니다. 오늘 날짜는 ${today}입니다.

다음 정보를 추출하여 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

{
  "subject": "과목명 (예: 수학, 영어, 국어, 과학 등)",
  "due_date": "마감일 (YYYY-MM-DD 형식, 이미지에서 찾을 수 없으면 오늘로부터 3일 후)",
  "description": "숙제 내용 요약 (한국어, 2-3문장)"
}

이미지에서 정보를 찾을 수 없는 경우 적절한 기본값을 사용하세요.`,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Claude API가 텍스트를 반환하지 않았습니다.');
  }

  // JSON 파싱 — 코드블록 감싸진 경우도 처리
  const jsonText = content.text.replace(/```json\n?|\n?```/g, '').trim();
  const result = JSON.parse(jsonText) as AnalyzeResult;

  return result;
}
