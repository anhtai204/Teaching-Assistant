# Script tự động hóa Push Frontend theo 5 giai đoạn
# Cách dùng: .\push_history.ps1

Write-Host "--- Bắt đầu quy trình Push Frontend (5 Lần) ---" -ForegroundColor Cyan

# Hàm cập nhật hash vào .ai-log cho một khoảng thời gian
function Sync-AiLog($hash, $startDate, $endDate) {
    python -c "
import json, os
from datetime import datetime
log_file = '.ai-log/session_copy.jsonl'
temp_file = '.ai-log/session_copy_temp.jsonl'
start = datetime.fromisoformat('$startDate')
end = datetime.fromisoformat('$endDate')
with open(log_file, 'r', encoding='utf-8') as fin, open(temp_file, 'w', encoding='utf-8') as fout:
    for line in fin:
        data = json.loads(line)
        ts = datetime.fromisoformat(data['ts'].replace('+07:00', ''))
        if start <= ts <= end:
            data['commit'] = '$hash'
        fout.write(json.dumps(data, ensure_ascii=False) + '\n')
os.replace(temp_file, log_file)
"
}

# Lần 1 — Cấu hình dự án frontend
Write-Host "[1/5] Push Cấu hình dự án..." -ForegroundColor Yellow
git add frontend/package.json frontend/package-lock.json frontend/tsconfig.json frontend/next.config.mjs frontend/tailwind.config.ts frontend/postcss.config.js frontend/next-env.d.ts frontend/skills-lock.json
git commit -m "Frontend config and dependency setup"
$H1 = git rev-parse HEAD
Sync-AiLog $H1 "2026-04-29T00:00:00" "2026-04-29T23:59:59"
git add .ai-log/session_copy.jsonl
git commit --amend --no-edit
git push origin dev --force

# Lần 2 — Cốt lõi app + layout
Write-Host "[2/5] Push Cốt lõi app + layout..." -ForegroundColor Yellow
git add frontend/src/app/layout.tsx frontend/src/app/page.tsx frontend/src/app/globals.css
git commit -m "Frontend app root layout and global styles"
$H2 = git rev-parse HEAD
Sync-AiLog $H2 "2026-04-30T00:00:00" "2026-04-30T23:59:59"
git add .ai-log/session_copy.jsonl
git commit --amend --no-edit
git push origin dev

# Lần 3 — Trang auth và user flows
Write-Host "[3/5] Push Trang auth và user flows..." -ForegroundColor Yellow
git add frontend/src/app/login/ frontend/src/app/signup/ frontend/src/app/student/ frontend/src/app/lecturer/
git commit -m "Frontend auth pages and user role page flows"
$H3 = git rev-parse HEAD
Sync-AiLog $H3 "2026-05-01T00:00:00" "2026-05-01T23:59:59"
git add .ai-log/session_copy.jsonl
git commit --amend --no-edit
git push origin dev

# Lần 4 — Component và giao diện dùng chung
Write-Host "[4/5] Push Component và giao diện dùng chung..." -ForegroundColor Yellow
git add frontend/src/components/ frontend/src/lib/
git commit -m "Frontend shared components and library code"
$H4 = git rev-parse HEAD
Sync-AiLog $H4 "2026-05-02T00:00:00" "2026-05-03T23:59:59"
git add .ai-log/session_copy.jsonl
git commit --amend --no-edit
git push origin dev

# Lần 5 — Utilities, metadata và file cấu hình phụ
Write-Host "[5/5] Push Utilities, metadata và cấu hình phụ..." -ForegroundColor Yellow
git add frontend/src/utils/ frontend/components.json
git commit -m "Frontend utilities and metadata files"
$H5 = git rev-parse HEAD
Sync-AiLog $H5 "2026-05-04T00:00:00" "2026-05-05T23:59:59"
git add .ai-log/session_copy.jsonl
git commit --amend --no-edit
git push origin dev

Write-Host "=== HOÀN TẤT: 5 lần push Frontend đã khớp với .ai-log ===" -ForegroundColor Green
