# تستر کانفیگ V2Ray برای ایران 🇮🇷

یک Cloudflare Worker قدرتمند برای تست و فیلتر کردن کانفیگ‌های V2Ray بر اساس اتصال و سرعت در ایران.

## ✨ ویژگی‌ها

- 🔍 **تست خودکار کانفیگ‌ها**: تست اتصال و سرعت تمام کانفیگ‌های V2Ray
- 🏆 **انتخاب بهترین‌ها**: انتخاب 20 کانفیگ برتر بر اساس سرعت و کیفیت
- ⏰ **تست دوره‌ای**: تست خودکار هر 6 ساعت یک بار
- 📱 **رابط کاربری زیبا**: صفحه وب زیبا با پشتیبانی کامل از فارسی
- 📁 **فایل خروجی**: تولید فایل TXT با بهترین کانفیگ‌ها
- 🚀 **سرعت بالا**: استفاده از شبکه جهانی Cloudflare

## 🛠️ نصب و راه‌اندازی

### پیش‌نیازها

1. حساب کاربری [Cloudflare](https://cloudflare.com)
2. نصب [Node.js](https://nodejs.org) (نسخه 18 یا بالاتر)
3. نصب [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### مراحل نصب

#### 1. نصب Wrangler CLI

\`\`\`bash
npm install -g wrangler
\`\`\`

#### 2. ورود به حساب Cloudflare

\`\`\`bash
wrangler auth login
\`\`\`

#### 3. ایجاد KV Namespace

\`\`\`bash
# ایجاد KV namespace برای production
wrangler kv:namespace create V2RAY_KV

# ایجاد KV namespace برای preview
wrangler kv:namespace create V2RAY_KV --preview
\`\`\`

#### 4. به‌روزرسانی wrangler.toml

فایل \`wrangler.toml\` را باز کنید و ID های KV namespace را که در مرحله قبل دریافت کردید، جایگزین کنید:

\`\`\`toml
[[kv_namespaces]]
binding = "V2RAY_KV"
id = "your-actual-kv-namespace-id"
preview_id = "your-actual-preview-kv-namespace-id"
\`\`\`

#### 5. استقرار Worker

\`\`\`bash
# استقرار در محیط production
wrangler deploy

# یا استقرار در محیط staging
wrangler deploy --env staging
\`\`\`

## 🚀 استفاده

### 1. دسترسی به رابط کاربری

پس از استقرار، به آدرس Worker خود بروید:
\`https://v2ray-config-tester.your-subdomain.workers.dev\`

### 2. تست کانفیگ‌ها

1. آدرس ساب دامین V2Ray خود را در فیلد مربوطه وارد کنید
2. روی دکمه "شروع تست" کلیک کنید
3. منتظر تکمیل فرآیند تست بمانید
4. نتایج را مشاهده کنید و فایل TXT را دانلود کنید

### 3. تست خودکار

سیستم هر 6 ساعت یک بار به صورت خودکار آخرین ساب دامین وارد شده را تست می‌کند و نتایج را به‌روزرسانی می‌کند.

## 📁 ساختار پروژه

\`\`\`
v2ray-config-tester/
├── worker.js          # فایل اصلی Cloudflare Worker
├── index.html         # صفحه اصلی رابط کاربری
├── style.css          # فایل استایل CSS
├── script.js          # فایل JavaScript کلاینت
├── wrangler.toml      # فایل پیکربندی Wrangler
├── package.json       # فایل پیکربندی Node.js
└── README.md          # راهنمای پروژه
\`\`\`

## ⚙️ پیکربندی

### متغیرهای محیطی

در فایل \`wrangler.toml\` می‌توانید تنظیمات زیر را تغییر دهید:

- \`MAX_CONFIGS\`: حداکثر تعداد کانفیگ‌های خروجی (پیش‌فرض: 20)
- \`TEST_TIMEOUT\`: مهلت زمانی تست هر کانفیگ (پیش‌فرض: 10000ms)

### تنظیم دامنه سفارشی

برای استفاده از دامنه سفارشی، خطوط زیر را در \`wrangler.toml\` فعال کنید:

\`\`\`toml
routes = [
  { pattern = "v2ray-tester.yourdomain.com/*", zone_name = "yourdomain.com" }
]
\`\`\`

## 🔧 توسعه محلی

### اجرای محلی

\`\`\`bash
# نصب وابستگی‌ها
npm install

# اجرای در محیط توسعه
npm run dev
\`\`\`

### دستورات مفید

\`\`\`bash
# مشاهده لاگ‌های زنده
npm run tail

# مدیریت KV storage
npm run kv:list
npm run kv:get -- "key-name"
npm run kv:put -- "key-name" "value"
\`\`\`

## 📊 نحوه کارکرد

### 1. دریافت کانفیگ‌ها
- دریافت محتوای ساب دامین V2Ray
- تجزیه و تحلیل فرمت‌های مختلف (VMess, VLess, Trojan, Shadowsocks)
- استخراج اطلاعات سرور و پورت

### 2. تست اتصال
- تست اتصال به سرورهای مختلف از ایران
- بررسی دسترسی به سایت‌های مختلف
- محاسبه نرخ موفقیت اتصال

### 3. تست سرعت
- اندازه‌گیری سرعت دانلود
- محاسبه زمان پاسخ (ping)
- رتبه‌بندی بر اساس عملکرد

### 4. ذخیره نتایج
- ذخیره 20 کانفیگ برتر
- تولید فایل TXT قابل دانلود
- به‌روزرسانی خودکار هر 6 ساعت

## 🔒 امنیت

- تمام داده‌ها در KV storage امن Cloudflare ذخیره می‌شوند
- عدم ذخیره اطلاعات حساس کاربران
- استفاده از HTTPS برای تمام ارتباطات
- محدودیت نرخ درخواست برای جلوگیری از سوء استفاده

## 🐛 عیب‌یابی

### مشکلات رایج

1. **خطای KV Namespace**
   - مطمئن شوید ID های KV در \`wrangler.toml\` صحیح هستند
   - بررسی کنید که KV namespace ایجاد شده باشد

2. **خطای CORS**
   - بررسی کنید که هدرهای CORS در worker.js تنظیم شده باشند

3. **تست کانفیگ‌ها کار نمی‌کند**
   - بررسی فرمت ساب دامین V2Ray
   - مطمئن شوید که ساب دامین در دسترس است

### لاگ‌ها

برای مشاهده لاگ‌های زنده:

\`\`\`bash
wrangler tail
\`\`\`

## 🤝 مشارکت

1. Fork کردن پروژه
2. ایجاد branch جدید (\`git checkout -b feature/amazing-feature\`)
3. Commit تغییرات (\`git commit -m 'Add amazing feature'\`)
4. Push به branch (\`git push origin feature/amazing-feature\`)
5. ایجاد Pull Request

## 📝 مجوز

این پروژه تحت مجوز MIT منتشر شده است. فایل [LICENSE](LICENSE) را برای جزئیات بیشتر مطالعه کنید.

## 🙏 تشکر

- [Cloudflare Workers](https://workers.cloudflare.com/) برای پلتفرم قدرتمند
- جامعه V2Ray برای ابزارهای عالی
- کاربران ایرانی برای بازخورد و پیشنهادات

## 📞 پشتیبانی

اگر مشکلی داشتید یا سوالی دارید:

- [Issues](https://github.com/your-username/v2ray-config-tester/issues) در GitHub
- ایمیل: support@yourdomain.com
- تلگرام: @your_telegram

---

**ساخته شده با ❤️ برای کاربران ایرانی**