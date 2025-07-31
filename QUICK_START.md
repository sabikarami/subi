# راهنمای سریع استقرار 🚀

## نصب سریع (5 دقیقه)

### 1. پیش‌نیازها
```bash
# نصب Node.js و npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# نصب Wrangler CLI
npm install -g wrangler
```

### 2. ورود به Cloudflare
```bash
wrangler auth login
```

### 3. استقرار خودکار
```bash
# اجرای اسکریپت استقرار خودکار
./deploy.sh
```

## استقرار دستی

### 1. ایجاد KV Namespace
```bash
# Production
wrangler kv:namespace create V2RAY_KV

# Preview
wrangler kv:namespace create V2RAY_KV --preview
```

### 2. بروزرسانی wrangler.toml
ID های دریافت شده را در فایل `wrangler.toml` جایگزین کنید:
```toml
[[kv_namespaces]]
binding = "V2RAY_KV"
id = "your-actual-kv-id"
preview_id = "your-actual-preview-id"
```

### 3. استقرار
```bash
wrangler deploy
```

## تست سیستم

1. به آدرس Worker بروید
2. یک ساب دامین V2Ray وارد کنید
3. روی "شروع تست" کلیک کنید
4. منتظر تکمیل تست بمانید
5. فایل TXT را دانلود کنید

## مشکلات رایج

### خطای KV Namespace
```bash
# بررسی KV namespaces موجود
wrangler kv:namespace list

# حذف namespace قدیمی (در صورت نیاز)
wrangler kv:namespace delete --namespace-id YOUR_ID
```

### خطای Authentication
```bash
# خروج و ورود مجدد
wrangler auth logout
wrangler auth login
```

### خطای Deploy
```bash
# بررسی وضعیت
wrangler whoami
wrangler validate

# مشاهده لاگ‌ها
wrangler tail
```

## دستورات مفید

```bash
# مشاهده لاگ‌های زنده
wrangler tail

# بررسی KV storage
wrangler kv:key list --binding V2RAY_KV

# تست محلی
wrangler dev

# بروزرسانی Worker
wrangler deploy

# حذف Worker
wrangler delete
```

## پشتیبانی

اگر مشکلی داشتید:
1. فایل `README.md` را مطالعه کنید
2. لاگ‌ها را با `wrangler tail` بررسی کنید
3. Issue جدید در GitHub ایجاد کنید

---
**موفق باشید! 🎉**