import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { JobService, UpdateJobRequest } from './job';

describe('JobService – SCRUM-190 Edit Job HTTP', () => {
  let service: JobService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/recruiter/jobs`;
  const body: UpdateJobRequest = {
    title: 'Updated', description: 'Description', requirements: 'C#',
    location: 'Da Nang', jobType: 'FULL_TIME', experience: '2 years',
    numberOfPositions: 2, salaryMin: null, salaryMax: 300,
    deadline: '2099-12-31T00:00:00Z', categoryId: 'CAT-IT', skillIds: ['SK-CSHARP']
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(JobService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('GET chi tiết thuộc Recruiter với jobId encode', () => {
    service.getRecruiterJobDetail('job/1').subscribe();
    const req = http.expectOne(`${url}/job%2F1`);
    expect(req.request.method).toBe('GET');
    req.flush({ jobId: 'job/1', categoryId: 'CAT-IT', skills: [] });
  });
  it('PUT gửi đúng payload và jobId', () => {
    service.updateJob('job-01', body).subscribe(response => { expect(response.title).toBe('Updated'); });
    const req = http.expectOne(`${url}/job-01`);
    expect(req.request.method).toBe('PUT'); expect(req.request.body).toEqual(body);
    req.flush({ jobId: 'job-01', title: 'Updated', status: 'OPEN', createdAt: '2026-11-20' });
  });
  it('PUT không tự thêm ownership, status vào body', () => {
    service.updateJob('job-01', body).subscribe();
    const req = http.expectOne(`${url}/job-01`);
    expect(req.request.body.recruiterId).toBeUndefined();
    expect(req.request.body.companyId).toBeUndefined();
    expect(req.request.body.status).toBeUndefined();
    req.flush({ jobId: 'job-01', title: 'Updated', status: 'OPEN', createdAt: '2026-11-20' });
  });
  it.each([400, 403, 404, 409])('PUT trả lỗi %s', status => {
    let code = 0;
    service.updateJob('job-01', body).subscribe({ error: (err: HttpErrorResponse) => { code = err.status; } });
    const req = http.expectOne(`${url}/job-01`);
    req.flush({ detail: 'Error' }, { status, statusText: 'Error' });
    expect(code).toBe(status);
  });
  it('GET 401 được trả về cho caller', () => {
    let code = 0;
    service.getRecruiterJobDetail('job-01').subscribe({ error: (err: HttpErrorResponse) => { code = err.status; } });
    const req = http.expectOne(`${url}/job-01`);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(code).toBe(401);
  });
});
