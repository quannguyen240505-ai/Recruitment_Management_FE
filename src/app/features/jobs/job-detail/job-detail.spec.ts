import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    JobDetailResponse,
    JobService
} from '../../../core/services/job';

import { JobDetail } from './job-detail';

describe('JobDetail - SCRUM-147', () => {
    let harness: RouterTestingHarness;

    const getJobDetail = vi.fn();

    const mockJob: JobDetailResponse = {
        jobId: 'job-001',
        title: 'Frontend Angular Developer',
        description: 'Phát triển ứng dụng Angular.',
        requirements: 'Biết TypeScript và HTML/CSS.',
        location: 'Quy Nhơn',
        jobType: 'FULL_TIME',
        experience: '1 năm',
        numberOfPositions: 2,
        salaryMin: 10000000,
        salaryMax: 20000000,
        deadline: '2026-12-30T00:00:00Z',
        status: 'OPEN',
        createdAt: '2026-11-10T00:00:00Z',
        company: {
            companyId: 'company-001',
            name: 'Recruitly Test Company',
            website: 'https://example.com',
            address: 'Quy Nhơn'
        },
        skills: [
            { skillId: 'skill-001', name: 'Angular' }
        ]
    };

    beforeEach(async () => {
        getJobDetail.mockReset();
        getJobDetail.mockReturnValue(of(mockJob));

        TestBed.configureTestingModule({
            imports: [JobDetail],
            providers: [
                provideRouter([
                    {
                        path: 'jobs/:jobId',
                        component: JobDetail
                    },
                    {
                        path: 'jobs',
                        component: JobDetail
                    }
                ]),
                {
                    provide: JobService,
                    useValue: { getJobDetail }
                }
            ]
        });

        harness = await RouterTestingHarness.create();
    });

    // TEST 1 - Load successful job
    it('should load job details successfully', async () => {
        const component = await harness.navigateByUrl(
            '/jobs/job-001',
            JobDetail
        );

        expect(getJobDetail).toHaveBeenCalledWith('job-001');
        expect(component.job()?.title).toBe(
            'Frontend Angular Developer'
        );
        expect(component.loading()).toBe(false);
        expect(component.error()).toBe('');
    });

    // TEST 2 - Render job and company information
    it('should display job details in the UI', async () => {
        await harness.navigateByUrl('/jobs/job-001', JobDetail);

        const content = harness.routeNativeElement?.textContent ?? '';

        expect(content).toContain('Frontend Angular Developer');
        expect(content).toContain('Recruitly Test Company');
        expect(content).toContain('Quy Nhơn');
        expect(content).toContain('Angular');
        expect(content).toContain('30/12/2026');
    });

    // TEST 3 - Loading state
    it('should display loading before API completes', async () => {
        const pending = new Subject<JobDetailResponse>();
        getJobDetail.mockReturnValue(pending.asObservable());

        const component = await harness.navigateByUrl(
            '/jobs/job-001',
            JobDetail
        );

        expect(component.loading()).toBe(true);

        expect(
            harness.routeNativeElement?.textContent
        ).toContain('Đang tải công việc');

        pending.next(mockJob);
        pending.complete();

        harness.detectChanges();

        expect(component.loading()).toBe(false);
        expect(component.job()?.jobId).toBe('job-001');
    });

    // TEST 4 - HTTP 404
    it('should handle job not found', async () => {
        getJobDetail.mockReturnValue(
            throwError(() => new HttpErrorResponse({
                status: 404
            }))
        );

        const component = await harness.navigateByUrl(
            '/jobs/not-found',
            JobDetail
        );

        expect(component.loading()).toBe(false);
        expect(component.job()).toBeNull();
        expect(component.error()).toContain(
            'Không tìm thấy tin tuyển dụng'
        );
    });

    // TEST 5 - Network error
    it('should handle network connection errors', async () => {
        getJobDetail.mockReturnValue(
            throwError(() => new HttpErrorResponse({
                status: 0
            }))
        );

        const component = await harness.navigateByUrl(
            '/jobs/job-001',
            JobDetail
        );

        expect(component.error()).toContain(
            'Không thể kết nối Backend'
        );
    });

    // TEST 6 - Server error
    it('should handle server errors', async () => {
        getJobDetail.mockReturnValue(
            throwError(() => new HttpErrorResponse({
                status: 500
            }))
        );

        const component = await harness.navigateByUrl(
            '/jobs/job-001',
            JobDetail
        );

        expect(component.error()).toContain(
            'Không thể tải chi tiết công việc'
        );
    });

    // TEST 7 - Missing Job ID
    it('should handle missing job ID', async () => {
        const component = await harness.navigateByUrl(
            '/jobs',
            JobDetail
        );

        expect(component.error()).toContain(
            'Thiếu mã tin tuyển dụng'
        );
        expect(getJobDetail).not.toHaveBeenCalled();
        expect(component.loading()).toBe(false);
    });

    // TEST 8 - Retry after failure
    it('should retry loading after an error', async () => {
        getJobDetail
            .mockReturnValueOnce(
                throwError(() => new HttpErrorResponse({
                    status: 500
                }))
            )
            .mockReturnValueOnce(of(mockJob));

        const component = await harness.navigateByUrl(
            '/jobs/job-001',
            JobDetail
        );

        expect(component.error()).not.toBe('');

        component.retry();
        harness.detectChanges();

        expect(getJobDetail).toHaveBeenCalledTimes(2);
        expect(component.error()).toBe('');
        expect(component.job()?.title).toBe(mockJob.title);
    });

    // TEST 9 - Route parameter changes
    it('should load the correct job when ID changes', async () => {
        getJobDetail.mockImplementation((jobId: string) =>
            of({
                ...mockJob,
                jobId,
                title: jobId === 'job-002'
                    ? 'Backend Developer'
                    : 'Frontend Angular Developer'
            })
        );

        await harness.navigateByUrl('/jobs/job-001', JobDetail);

        const component = await harness.navigateByUrl(
            '/jobs/job-002',
            JobDetail
        );

        expect(getJobDetail).toHaveBeenLastCalledWith('job-002');
        expect(component.job()?.jobId).toBe('job-002');
        expect(component.job()?.title).toBe('Backend Developer');
    });
});
