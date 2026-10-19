# Creator OS’u GitHub Pages ile yayımlama

GitHub’da **New repository** seçin ve depo adına `creator-os` yazın. Depoyu **Public** bırakın ve README eklemeyin.

Depo oluşturulduktan sonra bilgisayarınızdaki bu klasörde aşağıdaki komutlar çalıştırılır:

```powershell
git init
git add .
git commit -m "Publish Creator OS policy pages"
git branch -M main
git remote add origin https://github.com/GITHUB_KULLANICI_ADINIZ/creator-os.git
git push -u origin main
```

Sonra GitHub deposunda **Settings → Pages → Deploy from a branch → main / (root) → Save** seçin.

Yayın bağlantıları şunlar olur:

```
https://GITHUB_KULLANICI_ADINIZ.github.io/creator-os/terms
https://GITHUB_KULLANICI_ADINIZ.github.io/creator-os/privacy
```

Bu iki bağlantıyı TikTok Developer Portal’daki Terms of Service URL ve Privacy Policy URL alanlarına girin.
