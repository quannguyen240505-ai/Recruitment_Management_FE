import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  catchError,
  combineLatest,
  EMPTY,
  finalize,
  startWith,
  Subject,
  switchMap
} from 'rxjs';

import {
  JobDetailResponse,
  JobService
} from '../../../core/services/job';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './job-detail.html',
  styleUrl: './job-detail.css'
})
export class JobDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly jobService = inject(JobService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reloadTrigger = new Subject<void>();

  readonly loading = signal(true);
  readonly error = signal('');
  readonly job = signal<JobDetailResponse | null>(null);

  constructor() {
    combineLatest([
      this.route.paramMap,
      this.reloadTrigger.pipe(startWith(undefined))
    ])
      .pipe(
        switchMap(([params]) => {
          const jobId = params.get('jobId');

          this.loading.set(true);
          this.error.set('');
          this.job.set(null);

          if (!jobId) {
            this.error.set('Thiếu mã tin tuyển dụng.');
            this.loading.set(false);
            return EMPTY;
          }

          return this.jobService.getJobDetail(jobId).pipe(
            catchError((err: HttpErrorResponse) => {
              if (err.status === 404) {
                this.error.set(
                  'Không tìm thấy hoặc không thể xem công việc này.'
                );
              } else if (err.status === 0) {
                this.error.set(
                  'Không thể kết nối Backend. Vui lòng kiểm tra máy chủ.'
                );
              } else {
                this.error.set(
                  'Không thể tải chi tiết công việc. Vui lòng thử lại.'
                );
              }

              return EMPTY;
            }),
            finalize(() => this.loading.set(false))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(result => this.job.set(result));
  }

  retry(): void {
    this.reloadTrigger.next();
  }

  getJobTypeLabel(jobType: string): string {
    const labels: Record<string, string> = {
      FULL_TIME: 'Toàn thời gian',
      PART_TIME: 'Bán thời gian',
      INTERNSHIP: 'Thực tập',
      CONTRACT: 'Hợp đồng',
      FREELANCE: 'Tự do'
    };

    return labels[jobType] ?? jobType;
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'OPEN':
        return 'Đang tuyển';
      case 'PAUSED':
        return 'Tạm dừng';
      case 'CLOSED':
        return 'Đã đóng';
      default:
        return status;
    }
  }

  formatSalary(
    min: number | null,
    max: number | null
  ): string {
    const format = (amount: number) =>
      new Intl.NumberFormat('vi-VN').format(amount);

    if (min !== null && max !== null) {
      return `${format(min)} - ${format(max)} VNĐ`;
    }

    if (min !== null) {
      return `Từ ${format(min)} VNĐ`;
    }

    if (max !== null) {
      return `Đến ${format(max)} VNĐ`;
    }

    return 'Thỏa thuận';
  }
}
