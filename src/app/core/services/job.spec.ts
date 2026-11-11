import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';

import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';

import {
  CreateJobRequest,
  JobService,
  RecruiterJobsResponse
} from './job';

describe('JobService - SCRUM-138 & SCRUM-141', () => {
  let service: JobService;
  let http: HttpTestingController;

  const recruiterJobsUrl =
    `${environment.apiUrl}/recruiter/jobs`;

  const mockJobs: RecruiterJobsResponse = {
    items: [
      {
        jobId: 'job-001',
        title: 'Angular Developer',
        companyName: 'Recruitly',
        status: 'OPEN',
        deadline: '2026-12-31T00:00:00Z',
        createdAt: '2026-11-01T00:00:00Z'
      }
    ],
    totalCount: 1,
    page: 1,
    pageSize: 10,
    totalPages: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(JobService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  // TEST 1 - SCRUM-138: CREATE JOB
  it('should POST correct CreateJob payload', () => {
    const body: CreateJobRequest = {
      title: 'Backend Developer',
      description: 'Mô tả',
      requirements: 'Yêu cầu',
      location: 'Hà Nội',
      jobType: 'FULL_TIME',
      experience: '1 năm',
      numberOfPositions: 2,
      salaryMin: null,
      salaryMax: null,
      deadline: '2030-01-20T00:00:00Z',
      categoryId: 'CAT-01',
      skillIds: ['SK-01']
    };

    service.createJob(body).subscribe(result => {
      expect(result.jobId).toBe('job-123');
    });

    const req = http.expectOne(
      request =>
        request.method === 'POST' &&
        request.url.endsWith('/api/Jobs')
    );

    expect(req.request.body).toEqual(body);
    expect(req.request.body.recruiterId).toBeUndefined();
    expect(req.request.body.companyId).toBeUndefined();
    expect(req.request.body.status).toBeUndefined();

    req.flush({
      jobId: 'job-123',
      title: body.title,
      status: 'OPEN',
      createdAt: '2030-01-01'
    });
  });

  // TEST 2 - SCRUM-141: GET ALL JOBS
  it('should GET recruiter jobs with default pagination', () => {
    let result: RecruiterJobsResponse | undefined;

    service.getRecruiterJobs().subscribe(response => {
      result = response;
    });

    const req = http.expectOne(
      request =>
        request.method === 'GET' &&
        request.url === recruiterJobsUrl
    );

    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    expect(req.request.params.has('status')).toBe(false);

    req.flush(mockJobs);

    expect(result).toEqual(mockJobs);
    expect(result?.items.length).toBe(1);
  });

  // TEST 3 - SCRUM-141: FILTER AND PAGINATION
  it('should send status, page and pageSize', () => {
    service.getRecruiterJobs(2, 5, 'PAUSED').subscribe();

    const req = http.expectOne(
      request =>
        request.method === 'GET' &&
        request.url === recruiterJobsUrl
    );

    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('5');
    expect(req.request.params.get('status')).toBe('PAUSED');

    req.flush({
      items: [],
      totalCount: 0,
      page: 2,
      pageSize: 5,
      totalPages: 0
    });
  });

  // TEST 4 - SCRUM-141: EMPTY RESULTS
  it('should handle an empty recruiter jobs response', () => {
    let result: RecruiterJobsResponse | undefined;

    service.getRecruiterJobs().subscribe(response => {
      result = response;
    });

    const req = http.expectOne(
      request =>
        request.method === 'GET' &&
        request.url === recruiterJobsUrl
    );

    req.flush({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0
    });

    expect(result?.items).toEqual([]);
    expect(result?.totalCount).toBe(0);
  });

  // TEST 5 - SCRUM-141: FORBIDDEN
  it('should propagate HTTP 403 for non-recruiter users', () => {
    let errorStatus = 0;

    service.getRecruiterJobs().subscribe({
      error: (error: HttpErrorResponse) => {
        errorStatus = error.status;
      }
    });

    const req = http.expectOne(
      request =>
        request.method === 'GET' &&
        request.url === recruiterJobsUrl
    );

    req.flush(
      { detail: 'Recruiter access required' },
      {
        status: 403,
        statusText: 'Forbidden'
      }
    );

    expect(errorStatus).toBe(403);
  });
});
