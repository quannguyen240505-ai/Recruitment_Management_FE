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
  SearchJobsResponse
} from './job';

describe('JobService - SCRUM-138 & SCRUM-144', () => {
  let service: JobService;
  let http: HttpTestingController;

  const jobsUrl = `${environment.apiUrl}/Jobs`;

  const emptyResponse: SearchJobsResponse = {
    items: [],
    page: 0,
    size: 10,
    totalItems: 0
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

    const req = http.expectOne(request =>
      request.method === 'POST' &&
      request.url === jobsUrl
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

  // TEST 2 - SCRUM-144: DEFAULT SEARCH
  it('should GET jobs with page 0 and size 10', () => {
    let result: SearchJobsResponse | undefined;

    service.searchJobs().subscribe(response => {
      result = response;
    });

    const req = http.expectOne(request =>
      request.method === 'GET' &&
      request.url === jobsUrl
    );

    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');

    expect(req.request.params.has('keyword')).toBe(false);
    expect(req.request.params.has('location')).toBe(false);

    req.flush(emptyResponse);

    expect(result).toEqual(emptyResponse);
  });

  // TEST 3 - SCRUM-144: COMBINED FILTERS
  it('should send all search filters correctly', () => {
    service.searchJobs({
      keyword: ' Angular ',
      location: ' Quy Nhơn ',
      jobType: 'FULL_TIME',
      experience: '1',
      salaryMin: 10000000,
      skillId: 'SK-01',
      categoryId: 'CAT-01',
      companyId: 'COMP-01',
      page: 0,
      size: 10
    }).subscribe();

    const req = http.expectOne(request =>
      request.method === 'GET' &&
      request.url === jobsUrl
    );

    const params = req.request.params;

    expect(params.get('keyword')).toBe('Angular');
    expect(params.get('location')).toBe('Quy Nhơn');
    expect(params.get('jobType')).toBe('FULL_TIME');
    expect(params.get('experience')).toBe('1');
    expect(params.get('salaryMin')).toBe('10000000');
    expect(params.get('skillId')).toBe('SK-01');
    expect(params.get('categoryId')).toBe('CAT-01');
    expect(params.get('companyId')).toBe('COMP-01');
    expect(params.get('page')).toBe('0');
    expect(params.get('size')).toBe('10');

    req.flush(emptyResponse);
  });

  // TEST 4 - SCRUM-144: PAGINATION
  it('should support zero-based pagination', () => {
    service.searchJobs({
      page: 2,
      size: 5
    }).subscribe();

    const req = http.expectOne(request =>
      request.method === 'GET' &&
      request.url === jobsUrl
    );

    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('5');

    req.flush({
      items: [],
      page: 2,
      size: 5,
      totalItems: 11
    });
  });

  // TEST 5 - SCRUM-144: IGNORE EMPTY FILTERS
  it('should not send blank optional filters', () => {
    service.searchJobs({
      keyword: '  ',
      location: '',
      experience: ' ',
      skillId: ' ',
      categoryId: ' ',
      companyId: ''
    }).subscribe();

    const req = http.expectOne(request =>
      request.method === 'GET' &&
      request.url === jobsUrl
    );

    const params = req.request.params;

    expect(params.has('keyword')).toBe(false);
    expect(params.has('location')).toBe(false);
    expect(params.has('experience')).toBe(false);
    expect(params.has('skillId')).toBe(false);
    expect(params.has('categoryId')).toBe(false);
    expect(params.has('companyId')).toBe(false);

    req.flush(emptyResponse);
  });

  // TEST 6 - SCRUM-144: HTTP 400
  it('should propagate invalid search parameters error', () => {
    let receivedStatus = 0;

    service.searchJobs({
      page: 0,
      size: 10
    }).subscribe({
      error: (error: HttpErrorResponse) => {
        receivedStatus = error.status;
      }
    });

    const req = http.expectOne(request =>
      request.method === 'GET' &&
      request.url === jobsUrl
    );

    req.flush(
      {
        title: 'Invalid search parameters'
      },
      {
        status: 400,
        statusText: 'Bad Request'
      }
    );

    expect(receivedStatus).toBe(400);
  });
});
