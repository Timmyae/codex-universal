FROM node:20-alpine

# Set working directory / تعيين دليل العمل
WORKDIR /app

# Copy package files / نسخ ملفات الحزمة
COPY package*.json ./

# Install dependencies / تثبيت التبعيات
RUN npm install --production

# Copy application files / نسخ ملفات التطبيق
COPY . .

# Create non-root user / إنشاء مستخدم غير جذر
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership / تغيير الملكية
RUN chown -R nodejs:nodejs /app

# Switch to non-root user / التبديل إلى مستخدم غير جذر
USER nodejs

# Expose port / كشف المنفذ
EXPOSE 3000

# Health check / فحص الصحة
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server / بدء الخادم
CMD ["node", "server/app.js"]
