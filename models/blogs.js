const mongoose = require("mongoose");
const User = require("./User.js");

const blogsSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
        required: [true, "请添加博客名称"],
    },

    summary: {
        type: String,
        required: [false, "请添加内容"],
    },
    content: {
        type: String,
        required: [false, "请添加博客内容"],
    },
    type: {
        type: String,
        enum: ['推荐', '最新', '关注'],
        default: '推荐',
        required: [true, "请添加博客类型"],
    },
    description: {
        type: String,
        required: [false, "请填写博客的描述"],
    },
    blogImage: {
        type: [{
            image: {
                type: String,
                required: true
            }
        }],
        required: [true, "请选择图片"],
        default: [],   // 默认为空数组
    },
    weeks: {
        type: String,
        required: [false, "请添加学习周期"],
    },
    tuition: {
        type: String,
        required: [false, "请添加博客费用"],
    },

    createdAt: {
        type: Date,
        default: Date.now,
        get: function (date) {
            if (!date) return '';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: false,
    },

});







// 配置virtual
blogsSchema.virtual("blogs", {
    ref: "blogs",
    localField: "_id",
    foreignField: "mscamp",
    justOne: false,
});

blogsSchema.set('toJSON',
    { virtuals: true, getters: true });
blogsSchema.set('toObject', { virtuals: true, getters: true });
// 添加删除所有博客的静态方法
// blogsSchema.statics.deleteAllBlogs = async function() {
//   try {
//     const result = await this.deleteMany({});
//     return result;
//   } catch (error) {
//     throw new Error('删除所有博客失败: ' + error.message);
//   }
// };
module.exports = mongoose.model("blogs", blogsSchema);
