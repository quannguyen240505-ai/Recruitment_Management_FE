# SCRUM-138 — Recruiter Create Job FE (Angular 21)

## Cách dùng
1. Giải nén file ZIP vào gốc repository `Recruitment_Management_FE` (cùng nơi có `package.json`). **Chỉ ghi đè các file cùng đường dẫn, không xóa `src` đang có.**
2. Chạy `npm run build` và `npx ng test --watch=false`.
3. Mở Backend `dotnet run --project src/Recruitment.Api.csproj --launch-profile https` tại `https://localhost:7080`.
4. Mở FE `npm start` tại `http://localhost:4200/recruiter/jobs/create`.
5. Frontend chưa có Login thật trên `develop`, nên để thử nghiệm cần JWT của Recruiter ACTIVE đã liên kết Company. Dùng API Login qua Swagger, và chỉ trên môi trường local, DevTools -> Console -> `localStorage.setItem('access_token', 'TOKEN_THU_NGHIEM')`; reload trang. Không commit/token thật.
6. Dùng ID có sẵn từ SQL Server: `SELECT CategoryId, Name FROM dbo.Categories; SELECT SkillId, Name FROM dbo.Skills;`.
7. Form tạo thành công sẽ chuyển tới route `/jobs/:jobId`, dùng GET `api/Jobs/{jobId}` đã có.

## Hạn chế / việc cần tích hợp
- Sidebar và form theo Figma *Quốc / Recruiter / Job Create* (frame `30:410`). Mẫu Figma trang *Thiện* là Admin, không phải SCRUM-138.
- Chưa có API lấy Category/Skills từ Backend; hai trường hiện nhận **ID** trong môi trường thử nghiệm, chưa phải dropdown đẹp đúng production.
- Backend `POST /api/Jobs` luôn tạo status OPEN. Nút `Lưu nháp` chỉ lưu **localStorage**, không tạo Job/DRAFT trên SQL Server.
- `authGuard` hiện có chỉ kiểm tra token tồn tại; BE vẫn kiểm tra quyền Recruiter. Cần role guard thật khi Auth FE hoàn chỉnh.
- Nếu chạy Backend ở cổng khác, đổi `src/environments/environment.development.ts`.
- Không gửi JWT, connection strings, secrets lên GitHub.

## Kiểm tra thủ công
- Trống Title/Description/Requirements/Location/Experience/Category/Skill -> FE không gửi API.
- Lương âm hoặc Max < Min -> FE chặn.
- Deadline hôm nay (UTC) hoặc quá khứ -> FE chặn.
- Số lượng tuyển <1 -> FE chặn.
- Guest -> 401; Candidate -> 403; Recruiter sai Company -> 403.
- Recruiter ACTIVE, Category+Skills hợp lệ -> POST 201; điều hướng trang chi tiết.
- SQL Server kiểm tra `SELECT TOP 10 JobId, Title, Status, RecruiterId, CompanyId FROM dbo.Jobs ORDER BY CreatedAt DESC;`.

## Tạo PR
```powershell
git status
npm run build
npx ng test --watch=false
git add src/app src/environments/environment.development.ts
git commit -m "feat(SCRUM-138): recruiter create job form matching Figma"
git push -u origin feature/SCRUM-138-create-job
```
Mở PR vào nhánh `develop`; đính kèm ảnh FE và bằng chứng tạo được Job bằng Backend.
