
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
  RecruiterJobSummary,
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

  readonly result = signal<RecruiterJobsResponse | null>(null);

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

  // SCRUM-194 - Close Job UI state
  readonly selectedJob = signal<RecruiterJobSummary | null>(null);
  readonly closing = signal(false);
  readonly closeError = signal('');
  readonly closeSuccess = signal('');

  constructor() {
    this.loadJobs();
  }

  // 1. LOAD JOBS FROM BACKEND
  loadJobs(): void {
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
    this.closeSuccess.set('');

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
    this.closeSuccess.set('');

    this.loadJobs();
  }

  // 4. REFRESH
  refresh(): void {
    this.closeSuccess.set('');
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

  // 6. SCRUM-194 - OPEN CLOSE CONFIRMATION
  openCloseModal(job: RecruiterJobSummary): void {
    if (job.status !== 'OPEN' || this.closing()) {
      return;
    }

    this.selectedJob.set(job);
    this.closeError.set('');
    this.closeSuccess.set('');
  }

  // 7. SCRUM-194 - CANCEL CLOSE JOB
  cancelClose(): void {
    if (this.closing()) {
      return;
    }

    this.selectedJob.set(null);
    this.closeError.set('');
  }

  // 8. SCRUM-194 - CONFIRM CLOSE JOB
  confirmClose(): void {
    const job = this.selectedJob();

    if (!job || job.status !== 'OPEN' || this.closing()) {
      return;
    }

    this.closing.set(true);
    this.closeError.set('');
    this.closeSuccess.set('');

    this.jobService
      .closeJob(job.jobId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.closing.set(false);
        })
      )
      .subscribe({
        next: response => {
          if (
            response.jobId !== job.jobId ||
            response.status !== 'CLOSED'
          ) {
            this.closeError.set(
              'Phản hồi từ máy chủ không hợp lệ. Vui lòng kiểm tra lại.'
            );
            return;
          }

          this.selectedJob.set(null);

          if (response.alreadyClosed) {
            this.closeSuccess.set(
              'Tin tuyển dụng này đã được đóng trước đó.'
            );
          } else {
            this.closeSuccess.set(
              'Đóng tin tuyển dụng thành công.'
            );
          }

          // Reload from Backend to keep filters and
          // pagination consistent after status changes.
          this.loadJobs();
        },

        error: (error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.closeError.set(
              'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
            );
          } else if (error.status === 403) {
            this.closeError.set(
              'Bạn không có quyền đóng tin tuyển dụng này.'
            );
          } else if (error.status === 404) {
            this.closeError.set(
              'Không tìm thấy tin tuyển dụng hoặc bạn không phải người sở hữu.'
            );
          } else if (error.status === 409) {
            this.closeError.set(
              'Trạng thái tin tuyển dụng không cho phép đóng.'
            );
          } else if (error.status === 0) {
            this.closeError.set(
              'Không thể kết nối đến Backend. Vui lòng thử lại.'
            );
          } else {
            this.closeError.set(
              'Đóng tin tuyển dụng thất bại. Vui lòng thử lại.'
            );
          }
        }
      });
  }
}
