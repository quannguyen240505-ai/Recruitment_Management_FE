import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CloseJobResponse,
  JobService,
  RecruiterJobsResponse
} from '../../../core/services/job';

import { RecruiterJobs } from './recruiter-jobs';

describe('RecruiterJobs - SCRUM-141', () => {
  let component: RecruiterJobs;
  let fixture: ComponentFixture<RecruiterJobs>;

  const getRecruiterJobs = vi.fn();
  const closeJob = vi.fn();

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

    closeJob.mockReset();

    closeJob.mockReturnValue(
      of({
        jobId: 'job-001',
        status: 'CLOSED',
        alreadyClosed: false
      })
    );

    await TestBed.configureTestingModule({
      imports: [RecruiterJobs],
      providers: [
        provideRouter([]),
        {
          provide: JobService,
          useValue: {
            getRecruiterJobs,
            closeJob
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

  // ============================================
  // SCRUM-194 - CLOSE JOB UI TESTS
  // ============================================

  // TEST 9: Close button only for OPEN jobs
  it('should show Close button only for OPEN jobs', () => {
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('.close-job-button').length
    ).toBe(1);

    component.result.set({
      ...mockResponse(),
      items: [
        {
          ...mockResponse().items[0],
          status: 'CLOSED'
        }
      ]
    });

    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.close-job-button')
    ).toBeNull();
  });

  // TEST 10: Open confirmation modal
  it('should open confirmation modal before closing a job', () => {
    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('.close-job-button');

    button.click();
    fixture.detectChanges();

    expect(component.selectedJob()?.jobId).toBe('job-001');

    expect(
      fixture.nativeElement.querySelector('[role="dialog"]')
    ).not.toBeNull();

    expect(closeJob).not.toHaveBeenCalled();
  });

  // TEST 11: Cancel without calling API
  it('should cancel Close Job without calling API', () => {
    component.openCloseModal(component.jobs()[0]);
    fixture.detectChanges();

    const cancelButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('.close-cancel-button');

    cancelButton.click();
    fixture.detectChanges();

    expect(component.selectedJob()).toBeNull();
    expect(closeJob).not.toHaveBeenCalled();

    expect(component.jobs()[0].status).toBe('OPEN');

    expect(
      fixture.nativeElement.querySelector('[role="dialog"]')
    ).toBeNull();
  });

  // TEST 12: Successful confirmation
  it('should close job and update UI to CLOSED', () => {
    const closedJobs: RecruiterJobsResponse = {
      ...mockResponse(),
      items: [
        {
          ...mockResponse().items[0],
          status: 'CLOSED'
        }
      ]
    };

    // Response used when the component reloads the list.
    getRecruiterJobs.mockReturnValueOnce(of(closedJobs));

    component.openCloseModal(component.jobs()[0]);
    fixture.detectChanges();

    const confirmButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('.close-confirm-button');

    confirmButton.click();
    fixture.detectChanges();

    expect(closeJob).toHaveBeenCalledTimes(1);
    expect(closeJob).toHaveBeenCalledWith('job-001');

    expect(getRecruiterJobs).toHaveBeenCalledTimes(2);

    expect(component.jobs()[0].status).toBe('CLOSED');
    expect(component.selectedJob()).toBeNull();

    expect(component.closeSuccess()).toContain('thành công');

    expect(
      fixture.nativeElement.querySelector('.close-job-button')
    ).toBeNull();
  });

  // TEST 13: Already closed response
  it('should handle alreadyClosed response', () => {
    closeJob.mockReturnValue(
      of({
        jobId: 'job-001',
        status: 'CLOSED',
        alreadyClosed: true
      })
    );

    component.openCloseModal(component.jobs()[0]);
    component.confirmClose();

    expect(closeJob).toHaveBeenCalledTimes(1);
    expect(component.closeSuccess()).toContain(
      'đã được đóng trước đó'
    );
    expect(component.selectedJob()).toBeNull();
  });

  // TEST 14: Prevent duplicate submissions
  it('should prevent duplicate Close Job requests', () => {
    const pending = new Subject<CloseJobResponse>();

    closeJob.mockReturnValue(pending.asObservable());

    component.openCloseModal(component.jobs()[0]);

    component.confirmClose();
    component.confirmClose();

    expect(closeJob).toHaveBeenCalledTimes(1);
    expect(component.closing()).toBe(true);

    // Cannot dismiss while request is processing.
    component.cancelClose();
    expect(component.selectedJob()).not.toBeNull();

    pending.next({
      jobId: 'job-001',
      status: 'CLOSED',
      alreadyClosed: false
    });
    pending.complete();

    expect(component.closing()).toBe(false);
    expect(component.selectedJob()).toBeNull();
  });

  // TEST 15: Prevent closing non-OPEN jobs
  it('should reject Close Job for CLOSED or PAUSED jobs', () => {
    for (const status of ['CLOSED', 'PAUSED'] as const) {
      component.openCloseModal({
        ...mockResponse().items[0],
        status
      });

      expect(component.selectedJob()).toBeNull();
    }

    component.confirmClose();

    expect(closeJob).not.toHaveBeenCalled();
  });

  // TEST 16-21: Handle API errors
  it.each([
    {
      status: 401,
      message: 'Phiên đăng nhập đã hết hạn'
    },
    {
      status: 403,
      message: 'không có quyền đóng'
    },
    {
      status: 404,
      message: 'Không tìm thấy tin tuyển dụng'
    },
    {
      status: 409,
      message: 'không cho phép đóng'
    },
    {
      status: 0,
      message: 'Không thể kết nối'
    },
    {
      status: 500,
      message: 'Đóng tin tuyển dụng thất bại'
    }
  ])(
    'should handle Close Job HTTP $status without false success',
    ({ status, message }) => {
      closeJob.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status }))
      );

      component.openCloseModal(component.jobs()[0]);
      component.confirmClose();
      fixture.detectChanges();

      expect(closeJob).toHaveBeenCalledTimes(1);

      expect(component.closeError()).toContain(message);
      expect(component.closeSuccess()).toBe('');

      // Keep the current job unchanged on failure.
      expect(component.jobs()[0].status).toBe('OPEN');
      expect(component.selectedJob()).not.toBeNull();

      expect(
        fixture.nativeElement.querySelector('.close-error-message')
      ).not.toBeNull();
    }
  );

  // TEST 22: Reject invalid server response
  it('should not show success for invalid API response', () => {
    closeJob.mockReturnValue(
      of({
        jobId: 'unexpected-job-id',
        status: 'CLOSED',
        alreadyClosed: false
      })
    );

    component.openCloseModal(component.jobs()[0]);
    component.confirmClose();

    expect(component.closeError()).toContain(
      'Phản hồi từ máy chủ không hợp lệ'
    );

    expect(component.closeSuccess()).toBe('');
    expect(component.selectedJob()).not.toBeNull();
    expect(component.jobs()[0].status).toBe('OPEN');
  });

});
