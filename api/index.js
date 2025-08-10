require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json({ limit: '50mb' }));

app.post('/api/generate-story', async (req, res) => {
    try {
        const userInput = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

        const prompt = `
            あなたは、長年連れ添った愛車との別れを惜しむ人のための、感動的な物語を生成する作家です。
            以下のユーザー入力を元に、温かく、少しノスタルジックで、心に響く物語を作成してください。
            ですます調の、自然で美しい日本語で記述してください。
            HTMLの<p>タグで段落を分けて、全体で3つの段落にまとめてください。
            キーワードは<span class="highlight"></span>で囲んでください。

            # ユーザー入力:
            - 車種: ${userInput.carName}
            - ニックネーム: ${userInput.carNickname || '(設定なし)'}
            - 出会い、第一印象: ${userInput.firstMemory}
            - 一番の思い出のドライブ: ${userInput.memorableDrive}
            - よく聴いた曲: ${userInput.favoriteSong || '(設定なし)'}
            - 最後の言葉: ${userInput.finalWords}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const story = response.text();

        res.json({ story: story });

    } catch (error) {
        console.error("Error generating story:", error);
        res.status(500).json({ error: 'AIによる物語の生成に失敗しました。' });
    }
});

module.exports = app;