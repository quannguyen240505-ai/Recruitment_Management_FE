
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type JobType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'INTERNSHIP'
  | 'CONTRACT'
  | 'FREELANCE';

export type JobStatus =
  | 'OPEN'
  | 'CLOSED'
  | 'PAUSED';

export interface CreateJobRequest {
  title: string;
  description: string;
  requirements: string;
  location: string;
  jobType: JobType;
  experience: string;
  numberOfPositions: number;
  salaryMin: number | null;
  salaryMax: number | null;
  deadline: string;
  categoryId: string;
  skillIds: string[];
}

export interface CreateJobResponse {
  jobId: string;
  title: string;
  status: string;
  createdAt: string;
}

export interface JobDetailResponse {
  jobId: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  jobType: string;
  experience: string;
  numberOfPositions: number;
  salaryMin: number | null;
  salaryMax: number | null;
  deadline: string;
  status: string;
  createdAt: string;

  company: {
    companyId: string;
    name: string;
    website: string | null;
    address: string | null;
  };

  skills: {
    skillId: string;
    name: string;
  }[];
}

// SCRUM-141 - Recruiter Jobs List
export interface RecruiterJobSummary {
  jobId: string;
  title: string;
  status: JobStatus;
  companyName: string;
  deadline: string;
  createdAt: string;
}

export interface RecruiterJobsResponse {
  items: RecruiterJobSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/Jobs`;

  // SCRUM-138 - CREATE JOB
  createJob(
    body: CreateJobRequest
  ): Observable<CreateJobResponse> {
    return this.http.post<CreateJobResponse>(
      this.apiUrl,
      body
    );
  }

  // GET JOB DETAILS
  getJobDetail(
    jobId: string
  ): Observable<JobDetailResponse> {
    return this.http.get<JobDetailResponse>(
      `${this.apiUrl}/${encodeURIComponent(jobId)}`
    );
  }

  // SCRUM-141 - GET RECRUITER JOBS
  getRecruiterJobs(
    page: number = 1,
    pageSize: number = 10,
    status?: JobStatus
  ): Observable<RecruiterJobsResponse> {

    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<RecruiterJobsResponse>(
      `${environment.apiUrl}/recruiter/jobs`,
      { params }
    );
  }
}
