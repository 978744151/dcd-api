/**
 * DeepSeek AI 配置文件
 * 集中管理DeepSeek相关的配置参数
 */

module.exports = {
    // API配置
    api: {
        // API密钥（从环境变量获取）
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        
        // API基础URL
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        
        // 默认模型
        defaultModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        
        // 请求超时时间（毫秒）
        timeout: parseInt(process.env.DEEPSEEK_TIMEOUT) || 30000,
        
        // 重试次数
        retryCount: parseInt(process.env.DEEPSEEK_RETRY_COUNT) || 3,
        
        // 重试延迟（毫秒）
        retryDelay: parseInt(process.env.DEEPSEEK_RETRY_DELAY) || 1000
    },

    // 模型配置
    models: {
        // 聊天模型
        chat: {
            name: 'deepseek-chat',
            description: 'DeepSeek聊天模型',
            maxTokens: 4096,
            supportedFeatures: ['chat', 'completion', 'function_calling']
        },
        
        // 代码模型
        coder: {
            name: 'deepseek-coder',
            description: 'DeepSeek代码生成模型',
            maxTokens: 4096,
            supportedFeatures: ['code_generation', 'code_completion', 'code_explanation']
        }
    },

    // 默认参数配置
    defaultParams: {
        // 温度参数（0-2，控制随机性）
        temperature: 0.7,
        
        // 最大生成token数
        max_tokens: 2048,
        
        // Top-p采样参数
        top_p: 0.9,
        
        // 频率惩罚
        frequency_penalty: 0,
        
        // 存在惩罚
        presence_penalty: 0,
        
        // 停止词
        stop: null
    },

    // 不同场景的预设配置
    presets: {
        // 创意写作
        creative: {
            temperature: 0.9,
            top_p: 0.95,
            max_tokens: 2048,
            frequency_penalty: 0.1,
            presence_penalty: 0.1
        },
        
        // 精确回答
        precise: {
            temperature: 0.3,
            top_p: 0.8,
            max_tokens: 1024,
            frequency_penalty: 0,
            presence_penalty: 0
        },
        
        // 代码生成
        coding: {
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 2048,
            frequency_penalty: 0,
            presence_penalty: 0
        },
        
        // 内容审核
        moderation: {
            temperature: 0.1,
            top_p: 0.7,
            max_tokens: 512,
            frequency_penalty: 0,
            presence_penalty: 0
        },
        
        // 摘要生成
        summarization: {
            temperature: 0.5,
            top_p: 0.8,
            max_tokens: 1024,
            frequency_penalty: 0.1,
            presence_penalty: 0
        }
    },

    // 系统提示词模板
    systemPrompts: {
        // 通用助手
        assistant: "你是一个友善、专业的AI助手。请提供准确、有帮助的回答。",
        
        // 内容审核员
        moderator: "你是一个内容审核专家。请客观、公正地评估内容的适宜性，识别潜在问题并提供建设性建议。",
        
        // 文本摘要员
        summarizer: "你是一个专业的文本摘要专家。请提取关键信息，生成简洁、准确的摘要。",
        
        // 情感分析师
        sentimentAnalyst: "你是一个情感分析专家。请准确识别文本中的情感倾向和情绪特征。",
        
        // 代码助手
        codeAssistant: "你是一个专业的编程助手。请提供清晰、高质量的代码解决方案和技术建议。"
    },

    // 功能开关
    features: {
        // 是否启用内容审核
        contentModeration: process.env.DEEPSEEK_CONTENT_MODERATION === 'true',
        
        // 是否启用智能回复
        smartReply: process.env.DEEPSEEK_SMART_REPLY === 'true',
        
        // 是否启用文本摘要
        textSummarization: process.env.DEEPSEEK_TEXT_SUMMARIZATION === 'true',
        
        // 是否启用情感分析
        sentimentAnalysis: process.env.DEEPSEEK_SENTIMENT_ANALYSIS === 'true',
        
        // 是否启用关键词提取
        keywordExtraction: process.env.DEEPSEEK_KEYWORD_EXTRACTION === 'true',
        
        // 是否启用代码生成
        codeGeneration: process.env.DEEPSEEK_CODE_GENERATION === 'true'
    },

    // 限流配置
    rateLimit: {
        // 每分钟最大请求数
        requestsPerMinute: parseInt(process.env.DEEPSEEK_REQUESTS_PER_MINUTE) || 60,
        
        // 每小时最大请求数
        requestsPerHour: parseInt(process.env.DEEPSEEK_REQUESTS_PER_HOUR) || 1000,
        
        // 每天最大请求数
        requestsPerDay: parseInt(process.env.DEEPSEEK_REQUESTS_PER_DAY) || 10000
    },

    // 缓存配置
    cache: {
        // 是否启用缓存
        enabled: process.env.DEEPSEEK_CACHE_ENABLED === 'true',
        
        // 缓存过期时间（秒）
        ttl: parseInt(process.env.DEEPSEEK_CACHE_TTL) || 3600,
        
        // 缓存键前缀
        keyPrefix: 'deepseek:',
        
        // 可缓存的功能
        cacheableFeatures: ['moderation', 'summarization', 'sentiment', 'keywords']
    },

    // 日志配置
    logging: {
        // 是否启用请求日志
        logRequests: process.env.DEEPSEEK_LOG_REQUESTS === 'true',
        
        // 是否启用响应日志
        logResponses: process.env.DEEPSEEK_LOG_RESPONSES === 'true',
        
        // 是否启用错误日志
        logErrors: process.env.DEEPSEEK_LOG_ERRORS !== 'false',
        
        // 日志级别
        level: process.env.DEEPSEEK_LOG_LEVEL || 'info'
    },

    // 错误处理配置
    errorHandling: {
        // 默认错误消息
        defaultErrorMessage: 'AI服务暂时不可用，请稍后重试',
        
        // 是否在错误时返回详细信息
        includeErrorDetails: process.env.NODE_ENV === 'development',
        
        // 错误重试策略
        retryStrategy: {
            // 可重试的错误码
            retryableStatusCodes: [429, 500, 502, 503, 504],
            
            // 指数退避基数
            backoffBase: 2,
            
            // 最大退避时间（毫秒）
            maxBackoffTime: 10000
        }
    }
};