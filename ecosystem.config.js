module.exports = {
    apps: [{
        name: "dcd-api",
        script: "app.js",
        env_production: {
            NODE_ENV: "production",   // 生产环境
            MONGODB_URI: "http://8.155.53.210:3001"
        }
    }]
};