/**
 * DeepSeek AI 路由
 * 提供AI相关功能的API端点
 */

const Router = require('koa-router');
const router = new Router({ prefix: '/api/deepseek' });
const { deepseekHelper } = require('../utils/deepseekHelper');
const deepseekConfig = require('../config/deepseek');

// 中间件：验证API密钥
const validateApiKey = async (ctx, next) => {
    try {
        deepseekHelper.validateApiKey();
        await next();
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: error.message
        };
        return;
    }
};

// 中间件：请求日志
const logRequest = async (ctx, next) => {
    if (deepseekConfig.logging.logRequests) {
        console.log(`[DeepSeek] ${ctx.method} ${ctx.path}`, {
            body: ctx.request.body,
            query: ctx.query,
            timestamp: new Date().toISOString()
        });
    }
    await next();
};

// 应用中间件
router.use(logRequest);

/**
 * POST /chat
 * 聊天对话接口
 */
router.post('/chat', validateApiKey, async (ctx) => {
    try {
        const { messages, options = {} } = ctx.request.body;

        if (!messages || !Array.isArray(messages)) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '消息格式错误，需要提供messages数组'
            };
            return;
        }

        // 合并配置
        const config = {
            ...deepseekConfig.defaultParams,
            ...options
        };

        const result = await deepseekHelper.chat(messages, config);

        ctx.body = result;

    } catch (error) {
        console.error('聊天接口错误:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: deepseekConfig.errorHandling.defaultErrorMessage,
            error: deepseekConfig.errorHandling.includeErrorDetails ? error.message : undefined
        };
    }
});

/**
 * POST /generate
 * 文本生成接口
 */
router.post('/generate', validateApiKey, async (ctx) => {
    try {
        const { prompt, preset = 'default', options = {} } = ctx.request.body;

        if (!prompt) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '请提供prompt参数'
            };
            return;
        }

        // 获取预设配置
        const presetConfig = deepseekConfig.presets[preset] || {};
        const config = {
            ...deepseekConfig.defaultParams,
            ...presetConfig,
            ...options
        };

        const result = await deepseekHelper.generateText(prompt, config);

        ctx.body = {
            success: true,
            data: result,
            usage: config
        };

    } catch (error) {
        console.error('文本生成错误:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: error.message
        };
    }
});

/**
 * POST /moderate
 * 内容审核接口
 */
router.post('/moderate', validateApiKey, async (ctx) => {
    try {
        const { content } = ctx.request.body;

        if (!content) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '请提供content参数'
            };
            return;
        }

        if (!deepseekConfig.features.contentModeration) {
            ctx.status = 403;
            ctx.body = {
                success: false,
                message: '内容审核功能未启用'
            };
            return;
        }

        const result = await deepseekHelper.moderateContent(content);

        ctx.body = {
            success: true,
            data: result
        };

    } catch (error) {
        console.error('内容审核错误:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: error.message
        };
    }
});

/**
 * POST /reply
 * 智能回复接口
 */
router.post('/reply', validateApiKey, async (ctx) => {
    try {
        const { message, context = '' } = ctx.request.body;

        if (!message) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '请提供message参数'
            };
            return;
        }

        if (!deepseekConfig.features.smartReply) {
            ctx.status = 403;
            ctx.body = {
                success: false,
                message: '智能回复功能未启用'
            };
            return;
        }

        const result = await deepseekHelper.generateReply(message, context);

        ctx.body = {
            success: true,
            data: result
        };

    } catch (error) {
        console.error('智能回复错误:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: error.message
        };
    }
});

/**
 * POST /summarize
 * 文本摘要接口
 */
router.post('/summarize', validateApiKey, async (ctx) => {
    try {
        const { text, maxLength = 200 } = ctx.request.body;

        if (!text) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '请提供text参数'
            };
            return;
        }

        if (!deepseekConfig.features.textSummarization) {
            ctx.status = 403;
            ctx.body = {
                success: false,
                message: '文本摘要功能未启用'
            };
            return;
        }

        const result = await deepseekHelper.summarizeText(text, maxLength);

        ctx.body = {
            success: true,
            data: result
        };

    } catch (error) {
        console.error('文本摘要错误:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: error.message
        };
    }
});

/**
 * POST /keywords
 * 关键词提取接口
 */
router.post('/keywords', validateApiKey, async (ctx) => {
    try {
        const { text, count = 5 } = ctx.request.body;

        if (!text) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '请提供text参数'
            };
            return;
        }

        if (!deepseekConfig.features.keywordExtraction) {
            ctx.status = 403;
            ctx.body = {
                success: false,
                message: '关键词提取功能未启用'
            };
            return;
        }

        const result = await deepseekHelper.extractKeywords(text, count);

        ctx.body = {
            success: true,
            data: result
        };

    } catch (error) {
        console.error('关键词提取错误:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: error.message
        };
    }
});

/**
 * POST /sentiment
 * 情感分析接口
 */
router.post('/sentiment', validateApiKey, async (ctx) => {
    try {
        const { text } = ctx.request.body;

        if (!text) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '请提供text参数'
            };
            return;
        }

        if (!deepseekConfig.features.sentimentAnalysis) {
            ctx.status = 403;
            ctx.body = {
                success: false,
                message: '情感分析功能未启用'
            };
            return;
        }

        const result = await deepseekHelper.analyzeSentiment(text);

        ctx.body = {
            success: true,
            data: result
        };

    } catch (error) {
        console.error('情感分析错误:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: error.message
        };
    }
});

/**
 * GET /config
 * 获取配置信息（不包含敏感信息）
 */
router.get('/config', (ctx) => {
    const safeConfig = {
        models: deepseekConfig.models,
        presets: Object.keys(deepseekConfig.presets),
        features: deepseekConfig.features,
        rateLimit: deepseekConfig.rateLimit
    };

    ctx.body = {
        success: true,
        data: safeConfig
    };
});

/**
 * GET /health
 * 健康检查接口
 */
router.get('/health', async (ctx) => {
    try {
        // 简单的健康检查
        const testMessage = [
            {
                role: 'user',
                content: 'Hello'
            }
        ];

        const result = await deepseekHelper.chat(testMessage, {
            max_tokens: 10,
            temperature: 0.1
        });

        ctx.body = {
            success: true,
            status: result.success ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            apiKeyConfigured: !!deepseekHelper.apiKey
        };

    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
            apiKeyConfigured: !!deepseekHelper.apiKey
        };
    }
});

module.exports = router;