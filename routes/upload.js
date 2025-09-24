const Router = require('koa-router');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('koa-jwt');
const sharp = require('sharp');

const router = new Router({
    prefix: '/api/upload'
});

// JWT中间件
const auth = jwt({ secret: process.env.JWT_SECRET });

// 确保uploads目录存在
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名：时间戳 + 随机数 + 原始扩展名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'logo-' + uniqueSuffix + ext);
    }
});

// 文件过滤器 - 只允许图片
const fileFilter = (req, file, cb) => {
    console.log('文件信息:', file);

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    // 如果有 mimetype，优先使用 mimetype 判断
    if (file.mimetype && allowedTypes.includes(file.mimetype)) {
        cb(null, true);
        return;
    }

    // 如果没有 mimetype 或 mimetype 不匹配，通过文件扩展名判断
    if (file.originalname) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
            return;
        }
    }

    // 都不匹配则拒绝
    cb(new Error(`不支持的文件类型。只允许上传图片文件 (JPEG, PNG, GIF, WebP)。文件信息: mimetype=${file.mimetype}, originalname=${file.originalname}`), false);
};

// 配置multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
        files: 1 // 只允许上传一个文件
    }
});

// 转换multer中间件为koa中间件
const koaMulter = (multerInstance) => {
    return async (ctx, next) => {
        return new Promise((resolve, reject) => {
            multerInstance(ctx.req, ctx.res, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        }).then(() => next());
    };
};

// 图片上传接口
router.post('/image', auth, koaMulter(upload.single('file')), async (ctx) => {
    try {
        if (!ctx.req.file) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '请选择要上传的图片文件'
            };
            return;
        }

        const file = ctx.req.file;
        const originalPath = file.path;
        const compressedFilename = `compressed-${file.filename}`;
        const compressedPath = path.join(uploadsDir, compressedFilename);

        // 使用sharp压缩图片
        const compressedInfo = await sharp(originalPath)
            .resize({
                width: 1200, // 最大宽度
                height: 1200, // 最大高度
                fit: 'inside', // 保持宽高比
                withoutEnlargement: true // 不放大小图片
            })
            .jpeg({
                quality: 80, // JPEG质量
                progressive: true
            })
            .png({
                quality: 80, // PNG质量
                compressionLevel: 8
            })
            .webp({
                quality: 80 // WebP质量
            })
            .toFile(compressedPath);

        // 删除原始文件
        if (fs.existsSync(originalPath)) {
            fs.unlinkSync(originalPath);
        }

        // 获取压缩后的文件信息
        const compressedStats = fs.statSync(compressedPath);
        const fileUrl = `http://localhost:5002/uploads/${compressedFilename}`;

        ctx.body = {
            success: true,
            message: '图片上传并压缩成功',
            data: {
                filename: compressedFilename,
                originalName: file.originalname,
                originalSize: file.size,
                compressedSize: compressedStats.size,
                compressionRatio: ((file.size - compressedStats.size) / file.size * 100).toFixed(2) + '%',
                url: fileUrl,
                fullUrl: `${process.env.HOST || 'http://localhost:5002'}${fileUrl}`,
                dimensions: {
                    width: compressedInfo.width,
                    height: compressedInfo.height
                }
            }
        };
    } catch (error) {
        // 如果压缩失败，删除已上传的文件
        if (ctx.req.file) {
            const originalPath = ctx.req.file.path;
            const compressedFilename = `compressed-${ctx.req.file.filename}`;
            const compressedPath = path.join(uploadsDir, compressedFilename);

            // 删除原始文件和压缩文件（如果存在）
            [originalPath, compressedPath].forEach(filePath => {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '图片上传或压缩失败',
            error: error.message
        };
    }
});

// 删除图片接口
// 删除图片接口 - 使用请求体传参
router.post('/delete', auth, async (ctx) => {
    try {
        const { url } = ctx.request.body; // 从请求体获取文件URL
        console.log(url);
        if (!url) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '缺少文件URL参数'
            };
            return;
        }

        // 从URL中提取文件名
        const filename = path.basename(url);
        const filePath = path.join(uploadsDir, filename);

        if (!fs.existsSync(filePath)) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '文件不存在'
            };
            return;
        }

        // 删除文件
        fs.unlinkSync(filePath);

        ctx.body = {
            success: true,
            message: '图片删除成功'
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '删除图片失败',
            error: error.message
        };
    }
});

module.exports = router;