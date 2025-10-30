/**
 * DeepSeek AI 使用示例
 * 展示如何在项目中使用DeepSeek的各种功能
 */

const { deepseekHelper } = require('../utils/deepseekHelper');

// 示例1: 基础聊天对话
async function chatExample() {
    console.log('=== 聊天对话示例 ===');
    
    const messages = [
        {
            role: 'system',
            content: '你是一个友善的AI助手，请用中文回答问题。'
        },
        {
            role: 'user',
            content: '请介绍一下人工智能的发展历史。'
        }
    ];

    try {
        const result = await deepseekHelper.chat(messages, {
            temperature: 0.7,
            max_tokens: 1000
        });

        if (result.success) {
            console.log('AI回复:', result.message);
            console.log('使用情况:', result.usage);
        } else {
            console.error('聊天失败:', result.error);
        }
    } catch (error) {
        console.error('聊天异常:', error.message);
    }
}

// 示例2: 文本生成
async function generateTextExample() {
    console.log('\n=== 文本生成示例 ===');
    
    const prompt = '写一首关于春天的诗，要求押韵，表达对自然的热爱。';

    try {
        const result = await deepseekHelper.generateText(prompt, {
            temperature: 0.8,
            max_tokens: 500
        });

        console.log('生成的诗歌:', result);
    } catch (error) {
        console.error('文本生成失败:', error.message);
    }
}

// 示例3: 内容审核
async function contentModerationExample() {
    console.log('\n=== 内容审核示例 ===');
    
    const contents = [
        '这是一篇关于科技发展的正常文章。',
        '这里包含一些不当内容...',
        '欢迎大家来我们的商场购物，有很多优质品牌。'
    ];

    for (const content of contents) {
        try {
            const result = await deepseekHelper.moderateContent(content);
            console.log(`内容: "${content.substring(0, 20)}..."`);
            console.log('审核结果:', result);
            console.log('---');
        } catch (error) {
            console.error('内容审核失败:', error.message);
        }
    }
}

// 示例4: 智能回复
async function smartReplyExample() {
    console.log('\n=== 智能回复示例 ===');
    
    const userMessage = '我想了解一下你们商场的营业时间和地址。';
    const context = '这是一个购物中心的客服系统，用户正在咨询基本信息。';

    try {
        const reply = await deepseekHelper.generateReply(userMessage, context);
        console.log('用户消息:', userMessage);
        console.log('智能回复:', reply);
    } catch (error) {
        console.error('智能回复失败:', error.message);
    }
}

// 示例5: 文本摘要
async function summarizationExample() {
    console.log('\n=== 文本摘要示例 ===');
    
    const longText = `
    人工智能（Artificial Intelligence，简称AI）是计算机科学的一个分支，
    它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。
    该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。
    人工智能从诞生以来，理论和技术日益成熟，应用领域也不断扩大，
    可以设想，未来人工智能带来的科技产品，将会是人类智慧的"容器"。
    人工智能可以对人的意识、思维的信息过程的模拟。人工智能不是人的智能，
    但能像人那样思考、也可能超过人的智能。
    `;

    try {
        const summary = await deepseekHelper.summarizeText(longText, 100);
        console.log('原文长度:', longText.length);
        console.log('摘要:', summary);
    } catch (error) {
        console.error('文本摘要失败:', error.message);
    }
}

// 示例6: 关键词提取
async function keywordExtractionExample() {
    console.log('\n=== 关键词提取示例 ===');
    
    const text = '我们的购物中心拥有众多国际知名品牌，包括时尚服装、美食餐厅、娱乐设施等，为顾客提供一站式购物体验。';

    try {
        const keywords = await deepseekHelper.extractKeywords(text, 5);
        console.log('文本:', text);
        console.log('关键词:', keywords);
    } catch (error) {
        console.error('关键词提取失败:', error.message);
    }
}

// 示例7: 情感分析
async function sentimentAnalysisExample() {
    console.log('\n=== 情感分析示例 ===');
    
    const texts = [
        '这个商场真的很棒，购物体验非常好！',
        '服务态度很差，我很失望。',
        '商场环境还可以，品牌选择比较多。'
    ];

    for (const text of texts) {
        try {
            const sentiment = await deepseekHelper.analyzeSentiment(text);
            console.log(`文本: "${text}"`);
            console.log('情感分析:', sentiment);
            console.log('---');
        } catch (error) {
            console.error('情感分析失败:', error.message);
        }
    }
}

// 示例8: 在实际业务中的应用
async function businessApplicationExample() {
    console.log('\n=== 业务应用示例 ===');
    
    // 模拟用户反馈处理
    const userFeedback = '商场的停车位太少了，而且收费太贵，希望能改善一下。';
    
    try {
        // 1. 情感分析
        const sentiment = await deepseekHelper.analyzeSentiment(userFeedback);
        console.log('用户反馈:', userFeedback);
        console.log('情感分析:', sentiment);
        
        // 2. 关键词提取
        const keywords = await deepseekHelper.extractKeywords(userFeedback, 3);
        console.log('关键词:', keywords);
        
        // 3. 生成回复
        const context = '这是一个购物中心的客服系统，需要专业、友善地回应用户反馈。';
        const reply = await deepseekHelper.generateReply(userFeedback, context);
        console.log('自动回复:', reply);
        
    } catch (error) {
        console.error('业务应用示例失败:', error.message);
    }
}

// 运行所有示例
async function runAllExamples() {
    console.log('🤖 DeepSeek AI 功能演示开始...\n');
    
    try {
        await chatExample();
        await generateTextExample();
        await contentModerationExample();
        await smartReplyExample();
        await summarizationExample();
        await keywordExtractionExample();
        await sentimentAnalysisExample();
        await businessApplicationExample();
        
        console.log('\n✅ 所有示例运行完成！');
    } catch (error) {
        console.error('❌ 示例运行出错:', error.message);
    }
}

// 如果直接运行此文件，则执行所有示例
if (require.main === module) {
    // 检查环境变量
    if (!process.env.DEEPSEEK_API_KEY) {
        console.error('❌ 请先设置 DEEPSEEK_API_KEY 环境变量');
        console.log('💡 提示: 复制 .env.deepseek.example 为 .env 并填入您的API密钥');
        process.exit(1);
    }
    
    runAllExamples();
}

module.exports = {
    chatExample,
    generateTextExample,
    contentModerationExample,
    smartReplyExample,
    summarizationExample,
    keywordExtractionExample,
    sentimentAnalysisExample,
    businessApplicationExample,
    runAllExamples
};