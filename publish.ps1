# 《节奏奶蛙》一键发布到 GitHub Pages
# 用法：在 h5game 目录下执行  powershell -ExecutionPolicy Bypass -File .\publish.ps1
# 首次推送会弹出浏览器登录 GitHub（Git Credential Manager）

$ErrorActionPreference = 'Stop'

$username = Read-Host '请输入你的 GitHub 用户名'
if (-not $username) { Write-Host '未输入用户名，已取消' -ForegroundColor Yellow; exit 1 }
$username = $username.Trim()
$repo = 'rhythm-frog'
$remoteUrl = "https://github.com/$username/$repo.git"

Write-Host "`n>> 使用远程仓库: $remoteUrl`n" -ForegroundColor Cyan

# 1. 修正提交身份（隐私邮箱）
git config user.name $username
git config user.email "$username@users.noreply.github.com"
git commit --amend --no-edit --reset-author | Out-Null

# 2. 关联远程（若已存在则更新）
if (git remote | Select-String -Quiet '^origin$') {
  git remote set-url origin $remoteUrl
} else {
  git remote add origin $remoteUrl
}

# 3. 推送（首次会弹浏览器授权）
git push -u origin main

Write-Host "`n================ 推送完成 ================" -ForegroundColor Green
Write-Host "接下来只需在 GitHub 网页上做 2 件事：" -ForegroundColor Yellow
Write-Host " 1. 打开 https://github.com/$username/$repo/actions 等首次构建变绿"
Write-Host " 2. 打开 Settings -> Pages -> Build and deployment -> Source 选 'GitHub Actions'"
Write-Host ""
Write-Host "之后你的游戏将发布在：" -ForegroundColor Cyan
Write-Host "   https://$username.github.io/$repo/"
Write-Host "===========================================" -ForegroundColor Green
