import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { JobDetailResponse, JobService } from '../../../core/services/job';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './job-detail.html',
  styleUrl: './job-detail.css'
})
export class JobDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly jobService = inject(JobService);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly job = signal<JobDetailResponse | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('jobId');
    if (!id) {
      this.loading.set(false);
      this.error.set('Thiếu Job ID.');
      return;
    }
    this.jobService.getJobDetail(id).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: result => this.job.set(result),
      error: () => this.error.set('Không thể tải chi tiết tin tuyển dụng. Kiểm tra Backend.')
    });
  }
}
