import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NEVER, of, throwError } from 'rxjs';
import { CreateJob } from './create-job';
import { JobService } from '../../../core/services/job';

describe('CreateJob (SCRUM-138)', () => {
  const createJob = vi.fn();
  const navigate = vi.fn();

  const deadline = (): string => {
    const date = new Date(); date.setUTCDate(date.getUTCDate() + 5);
    return date.toISOString().slice(0, 10);
  };
  const fillValid = (component: CreateJob) => component.form.patchValue({
    title: 'Frontend Developer', categoryId: 'CAT-01', jobType: 'FULL_TIME',
    location: 'Huế', experience: '1 năm', numberOfPositions: 2,
    salaryMin: 10000000, salaryMax: 20000000,
    deadline: deadline(), skillIdsText: 'SK-01, SK-02',
    description: 'Mô tả công việc', requirements: 'Yêu cầu ứng viên'
  });


  beforeEach(() => {
    createJob.mockReset();
    navigate.mockReset();

    localStorage.removeItem('scrum138_create_job_draft');

    TestBed.configureTestingModule({
      imports: [CreateJob],
      providers: [
        provideRouter([]),
        {
          provide: JobService,
          useValue: { createJob }
        }
      ]
    });

    vi.spyOn(TestBed.inject(Router), 'navigate')
      .mockImplementation((commands) => {
        navigate(commands);
        return Promise.resolve(true);
      });
  });


  it('không gửi API nếu thiếu trường bắt buộc', () => {
    const fixture = TestBed.createComponent(CreateJob);
    fixture.componentInstance.submit();
    expect(createJob).not.toHaveBeenCalled();
    expect(fixture.componentInstance.errorMessage()).not.toBe('');
  });

  it('không gửi nếu lương tối đa nhỏ hơn tối thiểu', () => {
    const fixture = TestBed.createComponent(CreateJob);
    fillValid(fixture.componentInstance);
    fixture.componentInstance.form.patchValue({ salaryMax: 100 });
    fixture.componentInstance.submit();
    expect(createJob).not.toHaveBeenCalled();
  });

  it('không gửi nếu deadline là hôm nay UTC', () => {
    const fixture = TestBed.createComponent(CreateJob);
    fillValid(fixture.componentInstance);
    fixture.componentInstance.form.patchValue({ deadline: new Date().toISOString().slice(0, 10) });
    fixture.componentInstance.submit();
    expect(createJob).not.toHaveBeenCalled();
  });

  it('tách danh sách Skills và loại trùng ID', () => {
    const fixture = TestBed.createComponent(CreateJob);
    fillValid(fixture.componentInstance);
    fixture.componentInstance.form.patchValue({ skillIdsText: 'SK-01, SK-02, SK-01' });
    createJob.mockReturnValue(NEVER);
    fixture.componentInstance.submit();
    expect(createJob).toHaveBeenCalledTimes(1);
    expect(createJob.mock.calls[0][0].skillIds).toEqual(['SK-01', 'SK-02']);
  });

  it('chỉ gửi một request khi đang loading', () => {
    const fixture = TestBed.createComponent(CreateJob);
    fillValid(fixture.componentInstance);
    createJob.mockReturnValue(NEVER);
    fixture.componentInstance.submit();
    fixture.componentInstance.submit();
    expect(createJob).toHaveBeenCalledTimes(1);
  });

  it('tạo thành công thì điều hướng tới trang chi tiết', () => {
    const fixture = TestBed.createComponent(CreateJob);
    fillValid(fixture.componentInstance);
    createJob.mockReturnValue(of({ jobId: 'job-123', title: 'Frontend Developer', status: 'OPEN', createdAt: '2030-01-01' }));
    fixture.componentInstance.submit();
    expect(navigate).toHaveBeenCalledWith(['/jobs', 'job-123']);
  });

  it('API trả 400 thì hiển thị lỗi validation', () => {
    const fixture = TestBed.createComponent(CreateJob);
    fillValid(fixture.componentInstance);
    createJob.mockReturnValue(throwError(() => ({ status: 400, error: { detail: 'Category không hợp lệ.' } })));
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.errorMessage()).toBe('Category không hợp lệ.');
  });
});
