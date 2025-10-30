/**
 * DeepSeek AI 集成工具
 * 用于与DeepSeek API进行交互，提供AI对话、文本生成等功能
 */

const axios = require('axios');

class DeepSeekHelper {
    constructor() {
        // DeepSeek API配置
        this.apiKey = process.env.DEEPSEEK_API_KEY || '';
        this.baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
        this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
        
        // 默认配置
        this.defaultConfig = {
            temperature: 0.7,
            max_tokens: 2048,
            top_p: 0.9,
            frequency_penalty: 0,
            presence_penalty: 0
        };

        // 初始化axios实例
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30秒超时
        });
    }

    /**
     * 验证API密钥是否配置
     */
    validateApiKey() {
        if (!this.apiKey) {
            throw new Error('DeepSeek API密钥未配置，请在环境变量中设置DEEPSEEK_API_KEY');
        }
    }

    /**
     * 发送聊天请求到DeepSeek
     * @param {Array} messages - 消息数组，格式：[{role: 'user', content: '消息内容'}]
     * @param {Object} options - 可选配置参数
     * @returns {Promise<Object>} API响应结果
     */
    async chat(messages, options = {}) {
        try {
            this.validateApiKey();

            const config = {
                ...this.defaultConfig,
                ...options
            };

            const requestData = {
                model: this.model,
                messages: messages,
                ...config
            };

            console.log('发送DeepSeek请求:', JSON.stringify(requestData, null, 2));

            const response = await this.client.post('/v1/chat/completions', requestData);
            
            console.log('DeepSeek响应:', response.data);
            
            return {
                success: true,
                data: response.data,
                message: response.data.choices[0]?.message?.content || '',
                usage: response.data.usage
            };

        } catch (error) {
            console.error('DeepSeek API请求失败:', error.response?.data || error.message);
            
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message,
                code: error.response?.status || 500
            };
        }
    }

    /**
     * 简单的文本生成
     * @param {string} prompt - 提示文本
     * @param {Object} options - 可选配置参数
     * @returns {Promise<string>} 生成的文本
     */
    async generateText(prompt, options = {}) {
        const messages = [
            {
                role: 'user',
                content: prompt
            }
        ];

        const result = await this.chat(messages, options);
        
        if (result.success) {
            return result.message;
        } else {
            throw new Error(`文本生成失败: ${result.error}`);
        }
    }

    /**
     * 内容审核和优化
     * @param {string} content - 需要审核的内容
     * @returns {Promise<Object>} 审核结果
     */
    async moderateContent(content) {
        const prompt = `请对以下内容进行审核，检查是否包含不当信息（如暴力、色情、政治敏感等），并提供优化建议：

内容：${content}

请以JSON格式返回结果：
{
  "isAppropriate": true/false,
  "issues": ["问题1", "问题2"],
  "suggestions": "优化建议",
  "score": 0-100
}`;

        try {
            const result = await this.generateText(prompt, { temperature: 0.3 });
            return JSON.parse(result);
        } catch (error) {
            console.error('内容审核失败:', error);
            return {
                isAppropriate: true,
                issues: [],
                suggestions: '审核服务暂时不可用',
                score: 50
            };
        }
    }

    /**
     * 智能回复生成
     * @param {string} userMessage - 用户消息
     * @param {string} context - 上下文信息
     * @returns {Promise<string>} 智能回复
     */
    async generateReply(userMessage, context = '') {
        const prompt = `作为一个友善、专业的AI助手，请根据以下信息生成合适的回复：

用户消息：${userMessage}
${context ? `上下文：${context}` : ''}

请生成一个简洁、有帮助的回复：`;

        return await this.generateText(prompt, { 
            temperature: 0.8,
            max_tokens: 500 
        });
    }

    /**
     * 文本摘要生成
     * @param {string} text - 需要摘要的文本
     * @param {number} maxLength - 摘要最大长度
     * @returns {Promise<string>} 文本摘要
     */
    async summarizeText(text, maxLength = 200) {
        const prompt = `请为以下文本生成一个简洁的摘要，长度不超过${maxLength}个字符：

${text}

摘要：`;

        return await this.generateText(prompt, { 
            temperature: 0.5,
            max_tokens: Math.ceil(maxLength * 1.5) 
        });
    }

    /**
     * 关键词提取
     * @param {string} text - 文本内容
     * @param {number} count - 提取关键词数量
     * @returns {Promise<Array>} 关键词数组
     */
    async extractKeywords(text, count = 5) {
        const prompt = `请从以下文本中提取${count}个最重要的关键词，以JSON数组格式返回：

${text}

关键词：`;

        try {
            const result = await this.generateText(prompt, { temperature: 0.3 });
            return JSON.parse(result);
        } catch (error) {
            console.error('关键词提取失败:', error);
            return [];
        }
    }

    /**
     * 情感分析
     * @param {string} text - 需要分析的文本
     * @returns {Promise<Object>} 情感分析结果
     */
    async analyzeSentiment(text) {
        const prompt = `请对以下文本进行情感分析，以JSON格式返回结果：

文本：${text}

返回格式：
{
  "sentiment": "positive/negative/neutral",
  "confidence": 0.0-1.0,
  "emotions": ["joy", "anger", "sadness", "fear", "surprise"],
  "summary": "分析总结"
}`;

        try {
            const result = await this.generateText(prompt, { temperature: 0.3 });
            return JSON.parse(result);
        } catch (error) {
            console.error('情感分析失败:', error);
            return {
                sentiment: 'neutral',
                confidence: 0.5,
                emotions: [],
                summary: '分析失败'
            };
        }
    }
}

// 创建单例实例
const deepseekHelper = new DeepSeekHelper();

module.exports = {
    DeepSeekHelper,
    deepseekHelper
};