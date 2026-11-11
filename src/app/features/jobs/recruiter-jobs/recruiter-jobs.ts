import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  finalize,
  Subscription
} from 'rxjs';

import {
  JobService,
  JobStatus,
  RecruiterJobsResponse
} from '../../../core/services/job';

type StatusFilter = JobStatus | 'ALL';

@Component({
  selector: 'app-recruiter-jobs',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe
  ],
  templateUrl: './recruiter-jobs.html',
  styleUrl: './recruiter-jobs.css'
})
export class RecruiterJobs {
  private readonly jobService = inject(JobService);
  private readonly destroyRef = inject(DestroyRef);

  private activeRequest?: Subscription;

  readonly loading = signal(false);
  readonly error = signal('');

  readonly selectedStatus = signal<StatusFilter>('ALL');
  readonly currentPage = signal(1);
  readonly pageSize = 10;

  readonly result = signal<RecruiterJobsResponse | null>(
    null
  );

  readonly jobs = computed(
    () => this.result()?.items ?? []
  );

  readonly totalCount = computed(
    () => this.result()?.totalCount ?? 0
  );

  readonly totalPages = computed(
    () => this.result()?.totalPages ?? 0
  );

  readonly startItem = computed(() => {
    if (this.totalCount() === 0) {
      return 0;
    }

    return (this.currentPage() - 1) * this.pageSize + 1;
  });

  readonly endItem = computed(() => {
    return Math.min(
      this.currentPage() * this.pageSize,
      this.totalCount()
    );
  });

  constructor() {
    this.loadJobs();
  }

  // 1. LOAD JOBS FROM BACKEND
  loadJobs(): void {
    // Cancel an older request when filters or page change.
    this.activeRequest?.unsubscribe();

    this.loading.set(true);
    this.error.set('');
    this.result.set(null);

    const status = this.selectedStatus();

    this.activeRequest = this.jobService
      .getRecruiterJobs(
        this.currentPage(),
        this.pageSize,
        status === 'ALL' ? undefined : status
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: response => {
          this.result.set(response);
        },

        error: (error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.error.set(
              'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'
            );
          } else if (error.status === 403) {
            this.error.set(
              'Bạn không có quyền Recruiter để xem danh sách tin tuyển dụng.'
            );
          } else if (error.status === 400) {
            this.error.set(
              'Tham số tìm kiếm không hợp lệ.'
            );
          } else if (error.status === 0) {
            this.error.set(
              'Không thể kết nối đến Backend. Vui lòng kiểm tra máy chủ.'
            );
          } else {
            this.error.set(
              'Không thể tải danh sách tin tuyển dụng. Vui lòng thử lại.'
            );
          }
        }
      });
  }

  // 2. FILTER BY STATUS
  setFilter(status: StatusFilter): void {
    if (this.selectedStatus() === status) {
      return;
    }

    this.selectedStatus.set(status);
    this.currentPage.set(1);

    this.loadJobs();
  }

  // 3. PAGINATION
  goToPage(page: number): void {
    if (
      this.loading() ||
      page < 1 ||
      page > this.totalPages() ||
      page === this.currentPage()
    ) {
      return;
    }

    this.currentPage.set(page);
    this.loadJobs();
  }

  // 4. REFRESH
  refresh(): void {
    this.loadJobs();
  }

  // 5. DISPLAY STATUS IN VIETNAMESE
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
}
