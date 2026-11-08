import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CreateJobRequest, JobService, JobType } from '../../../core/services/job';

@Component({
  selector: 'app-create-job',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-job.html',
  styleUrl: './create-job.css'
})
export class CreateJob {
  private readonly fb = inject(FormBuilder);
  private readonly jobs = inject(JobService);
  private readonly router = inject(Router);
  private readonly draftKey = 'scrum138_create_job_draft';

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly infoMessage = signal('');
  readonly hasDraft = signal(false);

  readonly jobTypes: { value: JobType; label: string }[] = [
    { value: 'FULL_TIME', label: 'Toàn thời gian' },
    { value: 'PART_TIME', label: 'Bán thời gian' },
    { value: 'INTERNSHIP', label: 'Thực tập' },
    { value: 'CONTRACT', label: 'Hợp đồng' },
    { value: 'FREELANCE', label: 'Freelance' }
  ];

  // Backend so sánh Deadline.Date với DateTime.UtcNow.Date.
  readonly minDeadline = this.utcDateAfter(1);

  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required]),
    categoryId: this.fb.nonNullable.control('', [Validators.required]),
    jobType: this.fb.nonNullable.control<JobType | ''>('', [Validators.required]),
    location: this.fb.nonNullable.control('', [Validators.required]),
    experience: this.fb.nonNullable.control('', [Validators.required]),
    numberOfPositions: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
    salaryMin: this.fb.control<number | null>(null, [Validators.min(0)]),
    salaryMax: this.fb.control<number | null>(null, [Validators.min(0)]),
    deadline: this.fb.nonNullable.control('', [Validators.required]),
    skillIdsText: this.fb.nonNullable.control('', [Validators.required]),
    description: this.fb.nonNullable.control('', [Validators.required]),
    requirements: this.fb.nonNullable.control('', [Validators.required])
  });

  constructor() {
    try { this.hasDraft.set(!!localStorage.getItem(this.draftKey)); }
    catch { this.hasDraft.set(false); }
  }

  private utcDateAfter(days: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  invalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.dirty || control.touched);
  }

  saveDraft(): void {
    this.errorMessage.set('');
    this.infoMessage.set('');
    try {
      localStorage.setItem(this.draftKey, JSON.stringify(this.form.getRawValue()));
      this.hasDraft.set(true);
      this.infoMessage.set('Đã lưu nháp trên trình duyệt này (chưa gửi lên hệ thống).');
    } catch {
      this.errorMessage.set('Không thể lưu nháp trên trình duyệt này.');
    }
  }

  restoreDraft(): void {
    this.errorMessage.set('');
    this.infoMessage.set('');
    try {
      const raw = localStorage.getItem(this.draftKey);
      if (!raw) { this.hasDraft.set(false); return; }
      this.form.patchValue(JSON.parse(raw));
      this.infoMessage.set('Đã khôi phục nội dung nháp.');
    } catch {
      this.errorMessage.set('Dữ liệu nháp không hợp lệ hoặc không thể đọc.');
    }
  }

  submit(): void {
    if (this.loading()) return;
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.errorMessage.set('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }

    const v = this.form.getRawValue();
    const requiredStrings = [v.title, v.categoryId, v.location, v.experience, v.description, v.requirements];
    if (requiredStrings.some(value => !value.trim())) {
      this.errorMessage.set('Các trường bắt buộc không được chỉ chứa khoảng trắng.');
      return;
    }

    if (!v.jobType || !this.jobTypes.some(x => x.value === v.jobType)) {
      this.errorMessage.set('Hình thức làm việc không hợp lệ.');
      return;
    }

    if (v.deadline < this.minDeadline) {
      this.errorMessage.set('Hạn nộp hồ sơ phải sau ngày hiện tại (theo UTC).');
      return;
    }

    if (v.salaryMin !== null && v.salaryMax !== null && v.salaryMax < v.salaryMin) {
      this.errorMessage.set('Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu.');
      return;
    }

    const skillIds = [...new Set(v.skillIdsText.split(',').map(x => x.trim()).filter(Boolean))];
    if (!skillIds.length) {
      this.errorMessage.set('Phải chọn ít nhất một kỹ năng hợp lệ.');
      return;
    }

    const body: CreateJobRequest = {
      title: v.title.trim(),
      description: v.description.trim(),
      requirements: v.requirements.trim(),
      location: v.location.trim(),
      jobType: v.jobType,
      experience: v.experience.trim(),
      numberOfPositions: v.numberOfPositions,
      salaryMin: v.salaryMin,
      salaryMax: v.salaryMax,
      deadline: `${v.deadline}T00:00:00Z`,
      categoryId: v.categoryId.trim(),
      skillIds
    };

    this.loading.set(true);
    this.jobs.createJob(body)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: result => {
          try { localStorage.removeItem(this.draftKey); } catch { /* optional draft cleanup */ }
          this.hasDraft.set(false);
          void this.router.navigate(['/jobs', result.jobId]);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 400) {
            const detail = err.error?.detail;
            this.errorMessage.set(typeof detail === 'string' && detail ? detail : 'Dữ liệu tạo Job không hợp lệ.');
          } else if (err.status === 401) {
            this.errorMessage.set('Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.');
          } else if (err.status === 403) {
            this.errorMessage.set('Tài khoản không có quyền tạo Job hoặc chưa liên kết công ty hợp lệ.');
          } else {
            this.errorMessage.set('Không gửi được yêu cầu. Kiểm tra Backend, CORS và kết nối mạng.');
          }
        }
      });
  }
}
