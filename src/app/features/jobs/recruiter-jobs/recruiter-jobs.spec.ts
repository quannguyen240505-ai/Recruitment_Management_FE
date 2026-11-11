import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  JobService,
  RecruiterJobsResponse
} from '../../../core/services/job';

import { RecruiterJobs } from './recruiter-jobs';

describe('RecruiterJobs - SCRUM-141', () => {
  let component: RecruiterJobs;
  let fixture: ComponentFixture<RecruiterJobs>;

  const getRecruiterJobs = vi.fn();

  function mockResponse(): RecruiterJobsResponse {
    return {
      items: [
        {
          jobId: 'job-001',
          title: 'Angular Developer',
          companyName: 'Recruitly Company',
          status: 'OPEN',
          createdAt: '2026-11-01T00:00:00Z',
          deadline: '2026-12-31T00:00:00Z'
        }
      ],
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1
    };
  }

  beforeEach(async () => {
    getRecruiterJobs.mockReset();
    getRecruiterJobs.mockReturnValue(of(mockResponse()));

    await TestBed.configureTestingModule({
      imports: [RecruiterJobs],
      providers: [
        provideRouter([]),
        {
          provide: JobService,
          useValue: {
            getRecruiterJobs
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RecruiterJobs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // TEST 1 - Component
  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  // TEST 2 - Initial API request
  it('should load recruiter jobs on initialization', () => {
    expect(getRecruiterJobs).toHaveBeenCalledWith(
      1,
      10,
      undefined
    );

    expect(component.jobs().length).toBe(1);
    expect(component.jobs()[0].title).toBe(
      'Angular Developer'
    );
  });

  // TEST 3 - Filter
  it('should filter jobs by status', () => {
    component.setFilter('PAUSED');

    expect(component.selectedStatus()).toBe('PAUSED');

    expect(getRecruiterJobs).toHaveBeenLastCalledWith(
      1,
      10,
      'PAUSED'
    );
  });

  // TEST 4 - Pagination
  it('should navigate to the next page', () => {
    component.result.set({
      ...mockResponse(),
      totalCount: 25,
      totalPages: 3
    });

    component.goToPage(2);

    expect(component.currentPage()).toBe(2);

    expect(getRecruiterJobs).toHaveBeenLastCalledWith(
      2,
      10,
      undefined
    );
  });

  // TEST 5 - Empty state
  it('should show empty state when no jobs exist', () => {
    getRecruiterJobs.mockReturnValue(
      of({
        ...mockResponse(),
        items: [],
        totalCount: 0,
        totalPages: 0
      })
    );

    component.refresh();
    fixture.detectChanges();

    expect(component.jobs().length).toBe(0);

    expect(
      fixture.nativeElement.textContent
    ).toContain('Chưa có tin tuyển dụng');
  });

  // TEST 6 - HTTP 401
  it('should handle unauthorized response', () => {
    getRecruiterJobs.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 401
      }))
    );

    component.refresh();

    expect(component.error()).toContain(
      'Phiên đăng nhập'
    );
  });

  // TEST 7 - HTTP 403
  it('should handle forbidden recruiter access', () => {
    getRecruiterJobs.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 403
      }))
    );

    component.refresh();
    fixture.detectChanges();

    expect(component.error()).toContain('Recruiter');

    expect(
      fixture.nativeElement.textContent
    ).toContain('Không thể tải dữ liệu');
  });

  // TEST 8 - Cancel stale requests
  it('should cancel an old request when filter changes', () => {
    const pendingRequest =
      new Subject<RecruiterJobsResponse>();

    getRecruiterJobs
      .mockReturnValueOnce(pendingRequest.asObservable())
      .mockReturnValueOnce(of(mockResponse()));

    component.refresh();

    expect(component.loading()).toBe(true);

    component.setFilter('OPEN');

    expect(component.loading()).toBe(false);
    expect(component.selectedStatus()).toBe('OPEN');

    pendingRequest.next({
      ...mockResponse(),
      items: []
    });

    expect(component.jobs().length).toBe(1);
  });
});
