import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';

import {
  JobService,
  JobType,
  SearchJobsFilters,
  SearchJobsResponse
} from '../../../core/services/job';

@Component({
  selector: 'app-search-jobs',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './search-jobs.html',
  styleUrl: './search-jobs.css'
})
export class SearchJobs {
  private readonly jobService = inject(JobService);
  private readonly destroyRef = inject(DestroyRef);
  private activeRequest?: Subscription;

  readonly loading = signal(false);
  readonly error = signal('');
  readonly result = signal<SearchJobsResponse | null>(null);
  readonly page = signal(0);
  readonly pageSize = 10;

  filters = {
    keyword: '',
    location: '',
    jobType: '' as JobType | '',
    experience: '',
    salaryMin: null as number | null
  };

  private appliedFilters: SearchJobsFilters = {};

  readonly jobs = computed(() => this.result()?.items ?? []);
  readonly totalItems = computed(
    () => this.result()?.totalItems ?? 0
  );
  readonly totalPages = computed(
    () => Math.ceil(this.totalItems() / this.pageSize)
  );

  constructor() {
    this.loadJobs();
  }

  search(): void {
    if (
      this.filters.salaryMin !== null &&
      (!Number.isFinite(this.filters.salaryMin) ||
        this.filters.salaryMin < 0)
    ) {
      this.error.set('Mức lương tối thiểu không hợp lệ.');
      return;
    }

    this.appliedFilters = {
      keyword: this.filters.keyword.trim(),
      location: this.filters.location.trim(),
      jobType: this.filters.jobType || undefined,
      experience: this.filters.experience.trim(),
      salaryMin: this.filters.salaryMin ?? undefined
    };

    this.page.set(0);
    this.loadJobs();
  }

  clearFilters(): void {
    this.filters = {
      keyword: '',
      location: '',
      jobType: '',
      experience: '',
      salaryMin: null
    };

    this.appliedFilters = {};
    this.page.set(0);
    this.loadJobs();
  }

  loadJobs(): void {
    this.activeRequest?.unsubscribe();

    this.loading.set(true);
    this.error.set('');
    this.result.set(null);

    this.activeRequest = this.jobService
      .searchJobs({
        ...this.appliedFilters,
        page: this.page(),
        size: this.pageSize
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: response => {
          this.result.set(response);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 400) {
            this.error.set(
              'Bộ lọc không hợp lệ. Vui lòng kiểm tra thông tin.'
            );
          } else if (err.status === 0) {
            this.error.set(
              'Không thể kết nối Backend. Vui lòng kiểm tra máy chủ.'
            );
          } else {
            this.error.set(
              'Không thể tải danh sách công việc. Vui lòng thử lại.'
            );
          }
        }
      });
  }

  goToPage(nextPage: number): void {
    if (
      this.loading() ||
      nextPage < 0 ||
      nextPage >= this.totalPages() ||
      nextPage === this.page()
    ) {
      return;
    }

    this.page.set(nextPage);
    this.loadJobs();
  }

  formatSalary(
    min: number | null,
    max: number | null
  ): string {
    const format = (value: number) =>
      new Intl.NumberFormat('vi-VN').format(value);

    if (min != null && max != null) {
      return `${format(min)} – ${format(max)} VNĐ`;
    }

    if (min != null) {
      return `Từ ${format(min)} VNĐ`;
    }

    if (max != null) {
      return `Đến ${format(max)} VNĐ`;
    }

    return 'Thỏa thuận';
  }
}
