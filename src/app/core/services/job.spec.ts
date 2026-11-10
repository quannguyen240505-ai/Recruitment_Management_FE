import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CreateJobRequest, JobService } from './job';

describe('JobService (SCRUM-138)', () => {
  let service: JobService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(JobService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('POST đúng body CreateJob, không gửi recruiterId/companyId/status', () => {
    const body: CreateJobRequest = {
      title: 'Backend Developer', description: 'Mô tả', requirements: 'Yêu cầu',
      location: 'Hà Nội', jobType: 'FULL_TIME', experience: '1 năm',
      numberOfPositions: 2, salaryMin: null, salaryMax: null,
      deadline: '2030-01-20T00:00:00Z', categoryId: 'CAT-01', skillIds: ['SK-01']
    };
    service.createJob(body).subscribe(result => expect(result.jobId).toBe('job-123'));
    const req = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/Jobs'));
    expect(req.request.body).toEqual(body);
    expect(req.request.body.recruiterId).toBeUndefined();
    expect(req.request.body.companyId).toBeUndefined();
    expect(req.request.body.status).toBeUndefined();
    req.flush({ jobId: 'job-123', title: body.title, status: 'OPEN', createdAt: '2030-01-01' });
  });
});
