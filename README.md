# Creator OS — TikTok bağlantısı

## Çalıştırma

Node.js 18 veya daha yenisini kurun. PowerShell'de bu klasörde aşağıdaki komutları çalıştırın:

```powershell
$env:CREATOR_OS_MASTER_KEY = 'buraya-uzun-ve-rastgele-bir-parola-yazin'
node server.js
```

Ardından `http://localhost:3455` adresini açın. `file:///.../index.html` adresinden açılan sürüm sadece demo görünümüdür; API anahtarı ve OAuth bağlantısı için yerel sunucu gerekir.

## TikTok Developers ayarı

1. `developers.tiktok.com` üzerinde uygulama oluşturun.
2. **Login Kit** ve **Content Posting API** ürünlerini ekleyin.
3. Şu redirect URI'yi Login Kit ayarlarına ekleyin: `http://localhost:3455/oauth/callback`
4. İlk sürüm için gerekli erişimleri isteyin: `user.info.basic` ve `video.publish`. Analitik ekranı eklendiğinde `user.info.stats` ve `video.list` erişimleri ayrı bir incelemeyle eklenebilir.
5. Creator OS içindeki **TikTok'u bağla** düğmesinden Client Key ve Client Secret bilgilerini girin, sonra hesabı yetkilendirin. Aynı pencerede OpenAI API anahtarını girerek “Yeni içerik fikri” düğmesinin gerçek ajan üretimini etkinleştirebilirsiniz.

Uygulama, gizli anahtarları ve OAuth tokenlarını yalnızca yerel sunucuda AES-256-GCM ile şifreli tutar. `CREATOR_OS_MASTER_KEY` değeri değiştirilirse önceki kayıtlar okunamaz. Bu anahtarı kaynak koduna yazmayın veya paylaşmayın.

TikTok, test/denetimden geçmemiş Direct Post istemcilerinin gönderilerini özel görünürlükle kısıtlar. Herkese açık otomatik paylaşım için TikTok uygulama denetimi gerekir.
