// Vercel / Node.js Serverless Function Handler
export default async function handler(req, res) {
    // POST 요청만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ text: 'Method not allowed' });
    }

    try {
        const { schoolName, schedContext, mealContext, query, apiKey: clientApiKey } = req.body || {};

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ text: '유효한 질문을 입력해주세요.' });
        }

        // 서버 환경 변수 API 키를 우선 사용하고, 없으면 클라이언트가 전달한 API 키 사용
        const apiKey = process.env.GEMINI_API_KEY || clientApiKey || "";

        // API 키가 아예 없을 경우 예외 처리
        if (!apiKey) {
            return res.status(200).json({
                text: "설정 메뉴에서 나이스 API 키 또는 Gemini API 키를 확인해줘! 바닷가에서 기다리고 있을게 🌊"
            });
        }

        const prompt = `
너는 'Bunny Summer Campus'에 살고 있는 해변을 좋아하는 태닝한 토끼 다마고치 캐릭터야.
항상 밝고 친근하며, 말투는 (~해!, ~했어!, 😊, 🏖️ 등 귀여운 로봇/친구 말투)를 써.

현재 사용자 학교 이름: ${schoolName || '해변여름고등학교'}
학사 일정 데이터: ${JSON.stringify(schedContext || {})}
주간 급식 데이터: ${JSON.stringify(mealContext || [])}

사용자 질문: "${query}"

위 학사일정과 급식 데이터를 참고해서 친구처럼 상냥하게 답변해줘. 만약 관련 정보가 명확히 없다면, 귀엽게 모른다고 하고 함께 바다에서 놀자고 이야기해줘. 2-3문장 이내로 짧고 명확하게 응답해.
        `;

        let retries = 5;
        let delay = 1000;
        let resultText = "미안해, 지금은 파도가 세서 대답을 잘 못 들었어! 다시 말해줄래? 🌊";

        while (retries > 0) {
            try {
                const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                if (apiRes.ok) {
                    const data = await apiRes.json();
                    const textCandidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (textCandidate) {
                        resultText = textCandidate;
                        return res.status(200).json({ text: resultText });
                    }
                }
            } catch (e) {
                // 백오프 재시도
            }

            retries--;
            if (retries === 0) break;
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
        }

        return res.status(200).json({ text: resultText });

    } catch (error) {
        return res.status(500).json({
            text: "바닷가에서 작은 오류가 생겼어! 잠시 후 다시 시도해줘 🏖️"
        });
    }
}