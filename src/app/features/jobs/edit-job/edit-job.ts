import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  JobService,
  JobType,
  RecruiterJobEditDetail,
  UpdateJobRequest
} from '../../../core/services/job';

@Component({
  selector: 'app-edit-job',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edit-job.html',
  styleUrls: ['../create-job/create-job.css', './edit-job.css']
})
export class EditJob {
  private readonly fb = inject(FormBuilder);
  private readonly jobs = inject(JobService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly jobId = this.route.snapshot.paramMap.get('jobId') ?? '';
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly errorMessage = signal('');
  readonly job = signal<RecruiterJobEditDetail | null>(null);
  readonly minDeadline = this.utcDateAfter(1);
  readonly canEdit = computed(() => {
    const data = this.job();
    return !!data && data.status !== 'CLOSED' &&
      data.deadline.slice(0, 10) >= this.minDeadline;
  });

  readonly jobTypes: { value: JobType; label: string }[] = [
    { value: 'FULL_TIME', label: 'Toàn thời gian' },
    { value: 'PART_TIME', label: 'Bán thời gian' },
    { value: 'INTERNSHIP', label: 'Thực tập' },
    { value: 'CONTRACT', label: 'Hợp đồng' },
    { value: 'FREELANCE', label: 'Freelance' }
  ];

  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', Validators.required),
    categoryId: this.fb.nonNullable.control('', Validators.required),
    jobType: this.fb.nonNullable.control<JobType | ''>('', Validators.required),
    location: this.fb.nonNullable.control('', Validators.required),
    experience: this.fb.nonNullable.control('', Validators.required),
    numberOfPositions: this.fb.nonNullable.control(1, [
      Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)
    ]),
    salaryMin: this.fb.control<number | null>(null, Validators.min(0)),
    salaryMax: this.fb.control<number | null>(null, Validators.min(0)),
    deadline: this.fb.nonNullable.control('', Validators.required),
    skillIdsText: this.fb.nonNullable.control('', Validators.required),
    description: this.fb.nonNullable.control('', Validators.required),
    requirements: this.fb.nonNullable.control('', Validators.required)
  });

  constructor() {
    this.load();
  }

  private utcDateAfter(days: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  invalid(field: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.controls[field];
    return ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  load(): void {
    this.loadError.set('');
    this.errorMessage.set('');
    this.job.set(null);
    if (!this.jobId) {
      this.loadError.set('Thiếu mã tin tuyển dụng.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.jobs.getRecruiterJobDetail(this.jobId)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: data => {
          if (!data.categoryId || !Array.isArray(data.skills)) {
            this.loadError.set('Backend chưa trả đủ CategoryId hoặc Skills để chỉnh sửa.');
            return;
          }
          this.job.set(data);
          const jobType = this.jobTypes.some(t => t.value === data.jobType)
            ? (data.jobType as JobType) : '';
          this.form.patchValue({
            title: data.title,
            categoryId: data.categoryId,
            jobType,
            location: data.location,
            experience: data.experience,
            numberOfPositions: data.numberOfPositions,
            salaryMin: data.salaryMin,
            salaryMax: data.salaryMax,
            deadline: data.deadline.slice(0, 10),
            skillIdsText: data.skills.map(skill => skill.skillId).join(', '),
            description: data.description,
            requirements: data.requirements
          });
          this.form.markAsPristine();
          this.form.markAsUntouched();
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 401) this.loadError.set('Phiên đăng nhập không hợp lệ.');
          else if (err.status === 403) this.loadError.set('Tài khoản không có quyền Recruiter.');
          else if (err.status === 404) this.loadError.set('Không tìm thấy Job hoặc Job không thuộc quyền của bạn.');
          else if (err.status === 0) this.loadError.set('Không thể kết nối Backend.');
          else this.loadError.set('Không thể tải thông tin tin tuyển dụng.');
        }
      });
  }

  cancel(): void {
    if (this.saving()) return;
    void this.router.navigate(['/recruiter/jobs']);
  }

  submit(): void {
    if (this.loading() || this.saving()) return;
    this.errorMessage.set('');
    if (!this.canEdit()) {
      this.errorMessage.set('Job đã đóng hoặc hết hạn nên không thể cập nhật.');
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errorMessage.set('Vui lòng kiểm tra các trường bắt buộc và giá trị nhập.');
      return;
    }

    const v = this.form.getRawValue();
    const requiredStrings = [
      v.title, v.categoryId, v.location, v.experience, v.description, v.requirements
    ];
    if (requiredStrings.some(s => !s.trim())) {
      this.errorMessage.set('Trường bắt buộc không được chỉ chứa khoảng trắng.');
      return;
    }
    if (!v.jobType || !this.jobTypes.some(t => t.value === v.jobType)) {
      this.errorMessage.set('Hình thức làm việc không hợp lệ.');
      return;
    }
    if (v.deadline < this.minDeadline) {
      this.errorMessage.set('Deadline phải sau ngày hiện tại (UTC).');
      return;
    }
    if (v.salaryMin !== null && v.salaryMax !== null && v.salaryMax < v.salaryMin) {
      this.errorMessage.set('Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu.');
      return;
    }
    const ids = v.skillIdsText.split(',').map(s => s.trim()).filter(Boolean);
    if (!ids.length || new Set(ids).size !== ids.length) {
      this.errorMessage.set('Nhập ít nhất một Skill ID và không được trùng nhau.');
      return;
    }

    const body: UpdateJobRequest = {
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
      skillIds: ids
    };

    this.saving.set(true);
    this.jobs.updateJob(this.jobId, body)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => { void this.router.navigate(['/recruiter/jobs']); },
        error: (err: HttpErrorResponse) => {
          if (err.status === 400) this.errorMessage.set(err.error?.detail || 'Dữ liệu cập nhật không hợp lệ.');
          else if (err.status === 401) this.errorMessage.set('Phiên đăng nhập đã hết hạn.');
          else if (err.status === 403) this.errorMessage.set('Bạn không có quyền chỉnh sửa Job này.');
          else if (err.status === 404) this.errorMessage.set('Job không còn tồn tại.');
          else if (err.status === 409) this.errorMessage.set(err.error?.detail || 'Job đã đóng hoặc hết hạn.');
          else this.errorMessage.set('Không thể lưu thay đổi. Kiểm tra kết nối Backend.');
        }
      });
  }
}
