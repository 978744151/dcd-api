/**
 * 内容过滤工具
 * 用于检测和过滤不当内容，包括暴力、色情、政治敏感等词汇
 */

// 敏感词汇列表
const sensitiveWords = [
    // 暴力相关
    '杀死', '杀害', '谋杀', '暴力', '打死', '弄死', '干掉', '灭掉', '血腥', '残忍',
    '虐待', '折磨', '酷刑', '屠杀', '砍死', '刺死', '枪杀', '爆炸', '炸弹', '恐怖',
    '袭击', '攻击', '伤害', '毁灭', '破坏', '仇杀', '报复', '威胁', '恐吓',

    // 色情相关
    '色情', '淫秽', '黄色', '裸体', '性交', '做爱', '强奸', '猥亵', '卖淫',
    '嫖娼', '援交', '包养', '一夜情', '约炮', '开房',

    // 政治敏感
    '法轮功', '六四', '天安门', '达赖', '藏独', '台独', '疆独', '港独',
    '反政府', '颠覆', '民运', '异议', '维权', '抗议', '游行', '示威',

    // 赌博相关
    '赌博', '赌场', '博彩', '彩票', '老虎机', '百家乐', '21点', '德州扑克',
    '网络赌博', '地下赌场', '赌资', '赌债',

    // 毒品相关
    '毒品', '大麻', '海洛因', '冰毒', '摇头丸', '可卡因', '鸦片', '吸毒',
    '贩毒', '制毒', '毒贩', '毒瘾',

    // 诈骗相关
    '诈骗', '骗钱', '传销', '非法集资', '庞氏骗局', '网络诈骗', '电信诈骗',
    '刷单', '洗钱', '黑钱', '假币',

    // 其他不当内容
    '自杀', '跳楼', '割腕', '上吊', '服毒', '轻生', '寻死', '死去',
    '仇恨', '歧视', '种族主义', '纳粹', '希特勒', '反人类'
];

// 政治敏感词汇（更严格的过滤）
const politicalSensitiveWords = [
    '习近平', '李克强', '王岐山', '胡锦涛', '江泽民', '邓小平', '毛泽东',
    '中南海', '政治局', '人大', '政协', '国务院', '中宣部', '统战部',
    '共产党', '国民党', '民进党', '公民党', '民主党', '自由党',
    '革命', '起义', '造反', '推翻', '政变', '军事政变', '独裁', '专制',
    '民主化', '自由化', '政治改革', '体制改革', '一党专政'
];

/**
 * 检查文本是否包含敏感词汇
 * @param {string} text - 要检查的文本
 * @param {boolean} strictMode - 是否启用严格模式（包含政治敏感词）
 * @returns {object} - 检查结果
 */
function checkSensitiveContent(text, strictMode = true) {
    if (!text || typeof text !== 'string') {
        return {
            isValid: true,
            foundWords: [],
            message: ''
        };
    }

    const textLower = text.toLowerCase();
    const foundWords = [];

    // 检查基础敏感词
    for (const word of sensitiveWords) {
        if (textLower.includes(word.toLowerCase())) {
            foundWords.push(word);
        }
    }

    // 严格模式下检查政治敏感词
    if (strictMode) {
        for (const word of politicalSensitiveWords) {
            if (textLower.includes(word.toLowerCase())) {
                foundWords.push(word);
            }
        }
    }

    const isValid = foundWords.length === 0;

    return {
        isValid,
        foundWords,
        message: isValid ? '' : `内容包含不当词汇: ${foundWords.join(', ')}`
    };
}

/**
 * 过滤和替换敏感词汇
 * @param {string} text - 要过滤的文本
 * @param {string} replacement - 替换字符，默认为 '*'
 * @returns {string} - 过滤后的文本
 */
function filterSensitiveContent(text, replacement = '*') {
    if (!text || typeof text !== 'string') {
        return text;
    }

    let filteredText = text;

    // 替换基础敏感词
    for (const word of sensitiveWords) {
        const regex = new RegExp(word, 'gi');
        filteredText = filteredText.replace(regex, replacement.repeat(word.length));
    }

    // 替换政治敏感词
    for (const word of politicalSensitiveWords) {
        const regex = new RegExp(word, 'gi');
        filteredText = filteredText.replace(regex, replacement.repeat(word.length));
    }

    return filteredText;
}

/**
 * 验证内容是否符合社区规范
 * @param {string} content - 要验证的内容
 * @param {object} options - 验证选项
 * @returns {object} - 验证结果
 */
function validateContent(content, options = {}) {
    const {
        minLength = 1,
        maxLength = 10000,
        allowEmpty = false,
        strictMode = true
    } = options;

    // 检查内容是否为空
    if (!content || content.trim().length === 0) {
        if (allowEmpty) {
            return { isValid: true, message: '' };
        }
        return { isValid: false, message: '内容不能为空' };
    }

    // 检查内容长度
    if (content.length < minLength) {
        return { isValid: false, message: `内容长度不能少于${minLength}个字符` };
    }

    if (content.length > maxLength) {
        return { isValid: false, message: `内容长度不能超过${maxLength}个字符` };
    }

    // 检查敏感内容
    const sensitiveCheck = checkSensitiveContent(content, strictMode);
    if (!sensitiveCheck.isValid) {
        return {
            isValid: false,
            message: '内容包含不当词汇，请修改后重试',
            foundWords: sensitiveCheck.foundWords
        };
    }

    return { isValid: true, message: '内容验证通过' };
}

module.exports = {
    checkSensitiveContent,
    filterSensitiveContent,
    validateContent,
    sensitiveWords,
    politicalSensitiveWords
};