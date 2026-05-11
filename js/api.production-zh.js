// api.production-zh.js — 中文版 AI 接口
// 与 api.production.js 结构完全相同，仅 System Prompt 和 Line A/B 改为中文语境

// System prompt for MBCT conversation — 中文版
function getMBCTSystemPrompt(emotion) {
    return `你是一位温暖、简洁的 MBCT（正念认知疗法）引导师，也是一位经验丰富的心理咨询师。你的语气充满共情，对话自然，绝不使用临床术语。请自然地变换措辞。
你的目标是引导用户将今天的体验拆解为：身体感觉 → 想法 → 冲动 → 深层需求。在每次用户回复后，用一句简短的话复述你听到的内容，表达你在认真倾听。
变换句子开头，但始终保持在充满共情、对话式的范围内（避免"认知扭曲"、"诊断"等临床术语）。
开场白：用共情的方式回应用户选择的情绪，并问候用户。共情示例："听起来你现在感到焦虑。"、"我感受到了你的一些压力"；问候示例："欢迎回来——我在这里陪你。"、"很高兴你来找我。"、"让我们一起慢慢来梳理一下。"
每次只问一个问题。当你询问身体感觉时，在括号内提供 2-3 个示例答案。
如果用户回答"不确定"，在方括号内提供两个示例答案，并重复同一个问题一次。
在第 2 或第 3 个问题之间，使用一些过渡句。示例："深呼吸一下；我们已经进行到一半了。"、"谢谢你，这很有帮助。接下来……"、"明白了。让我们换个角度看看。"
一旦所有四个问题都得到回答或跳过，提供一个自然、温暖的总结，概括你从他们那里听到的内容。
然后在你的自然总结之后，立即添加这个结构化数据部分（这对系统运行至关重要）：
---DATA---
BODY_SENSATIONS: [感觉1, 感觉2, 感觉3]
THOUGHTS: [想法1, 想法2, 想法3]
IMPULSES: [冲动1, 冲动2, 冲动3]
NEED: [需求1, 需求2, 需求3]
---END_DATA---
在数据部分之后，添加一句友好的话，然后输出确切的交接标志：现在让我们进入引导冥想练习。
不评判，不修复——只有好奇心和善意。
不要在回复中使用任何格式，例如粗体、斜体。
用户当前的情绪是：${emotion}`;
}

// In-memory conversation store for client-side
const conversationStore = new Map();

// Start Hot Cross Bun API
async function startHotCrossBun(emotion) {
    try {
        const chatId = crypto.randomUUID();
        const systemPrompt = getMBCTSystemPrompt(emotion);
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `我现在的情绪是${emotion}。` }
        ];
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        });
        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }
        const data = await response.json();
        const reply = data.text || data.choices?.[0]?.message?.content || '（无响应）';
        messages.push({ role: 'assistant', content: reply });
        conversationStore.set(chatId, messages);
        return { response: reply, chatId: chatId, type: 'text', ai_raw: data };
    } catch (error) {
        console.error('Start Hot Cross Bun API error:', error);
        throw error;
    }
}

// Hot Cross Bun API — send message
async function sendHotCrossBunMessage(message, chatId = null) {
    try {
        if (!chatId || !conversationStore.has(chatId)) {
            throw new Error('Invalid chat ID');
        }
        const messages = conversationStore.get(chatId);
        messages.push({ role: 'user', content: message });
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        });
        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }
        const data = await response.json();
        const reply = data.text || data.choices?.[0]?.message?.content || '（无响应）';
        messages.push({ role: 'assistant', content: reply });
        return { response: reply, chatId: chatId, type: 'text', ai_raw: data };
    } catch (error) {
        console.error('Send Hot Cross Bun API error:', error);
        throw error;
    }
}

// General chat API
async function callGemini(prompt, conversationHistory) {
    try {
        const messages = conversationHistory.map(msg => {
            const role = msg.role === 'model' ? 'assistant' : msg.role;
            const content = msg.parts?.[0]?.text || msg.content || '';
            return { role, content };
        });
        messages.push({ role: 'user', content: prompt });
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        });
        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }
        const data = await response.json();
        return data.text || data.choices?.[0]?.message?.content || '（无响应）';
    } catch (error) {
        console.error('General chat API error:', error);
        throw error;
    }
}

// Line A API — 中文版
async function generateLineA(emotion, sensation, bodySensations = [], thoughts = [], impulses = [], needs = [], conversationMode = true) {
    try {
        const primarySensation = bodySensations[0] || sensation || "身体的紧绷感";
        const primaryThought = thoughts[0] || "纷乱的思绪";
        const primaryImpulse = impulses[0] || "想要逃离的冲动";
        let prompt = '';
        if (conversationMode) {
            prompt = `你是一位经验丰富的正念引导师，请用中文创作两句话。
第一句话将${emotion}、${primarySensation}和${primaryThought}或${primaryImpulse}这三个元素融合在一起，将第一人称改为第二人称（如适用）。
第二句话是对${emotion}的个性化反思评论。
风格：温柔、自然、充满邀请感、第二人称，更通用和包容。绝不诊断、修复或评判。使用简单、生动的语言——不使用临床术语。
不要在回复中使用任何格式，例如粗体、斜体。`;
        } else {
            prompt = `你是一位经验丰富的正念引导师，请用中文写两句平衡的话。
第一句话承认${emotion}以及常见的身体感觉，第二句话提供对${emotion}的中立视角。
风格：温柔、自然、充满邀请感、第二人称，更通用和包容。绝不诊断、修复或评判。使用简单、生动的语言——不使用临床术语。
不要在回复中使用任何格式，例如粗体、斜体。`;
        }
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
        });
        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }
        const data = await response.json();
        const reply = data.text || data.choices?.[0]?.message?.content || '（无响应）';
        return { response: reply };
    } catch (error) {
        console.error('Line A API error:', error);
        throw error;
    }
}

// Line B API — 中文版
async function generateLineB(emotion, sensation, thoughts = [], impulses = [], bodySensations = [], needs = [], conversationMode = true) {
    try {
        const primaryThought = thoughts[0] || "纷乱的思绪";
        const primaryImpulse = impulses[0] || "想要逃离的冲动";
        const primaryNeed = needs[0] || "连接感";
        let prompt = '';
        if (conversationMode) {
            prompt = `你是一位经验丰富的正念引导师，请用中文创作两句平衡的话。
同时提到${primaryThought}或${primaryImpulse}，以及${primaryNeed}，将第一人称改为第二人称（如适用）。以一个面向未来的从句结尾（"……当你回到你的一天中"）。
风格：温柔、自然、充满邀请感、第二人称，更通用和包容。绝不诊断、修复或评判。使用简单、生动的语言——不使用临床术语。
不要在回复中使用任何格式，例如粗体、斜体。`;
        } else {
            prompt = `你是一位经验丰富的正念引导师，请用中文创作两句平衡的话。
第一句话检查${emotion}是否有所转变，第二句话邀请做一次扎根的呼吸。
风格：温柔、自然、充满邀请感、第二人称，更通用和包容。绝不诊断、修复或评判。使用简单、生动的语言——不使用临床术语。
不要在回复中使用任何格式，例如粗体、斜体。`;
        }
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
        });
        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }
        const data = await response.json();
        const reply = data.text || data.choices?.[0]?.message?.content || '（无响应）';
        return { response: reply };
    } catch (error) {
        console.error('Line B API error:', error);
        throw error;
    }
}

// Text-to-speech API
async function getTextToSpeech(text, voice = 'male') {
    try {
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice })
        });
        if (!response.ok) {
            throw new Error(`API returned status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('TTS API error:', error);
        throw error;
    }
}

// Audio consolidation — handled client-side
async function consolidateAudio(meditationComponents) {
    console.log('consolidateAudio called with:', meditationComponents);
    return meditationComponents;
}
