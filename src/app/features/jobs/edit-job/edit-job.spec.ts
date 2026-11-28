import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobService, RecruiterJobEditDetail, JobStatus } from '../../../core/services/job';
import { EditJob } from './edit-job';

describe('EditJob – SCRUM-190', () => {
  const getRecruiterJobDetail = vi.fn();
  const updateJob = vi.fn();
  const navigate = vi.fn();
  let fixture: ComponentFixture<EditJob>;
  let component: EditJob;

  const future = (days: number): string => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return `${date.toISOString().slice(0, 10)}T00:00:00Z`;
  };

  const detail = (overrides: Partial<RecruiterJobEditDetail> = {}): RecruiterJobEditDetail => ({
    jobId: 'job-001', title: 'Backend Developer', description: 'Mo ta cu',
    requirements: 'Yeu cau cu', location: 'Da Nang', jobType: 'FULL_TIME',
    experience: '2 years', numberOfPositions: 2, salaryMin: 100, salaryMax: 300,
    deadline: future(30), status: 'OPEN', createdAt: '2026-11-20T00:00:00Z',
    categoryId: 'CAT-IT', company: { companyId: 'COMP-01', name: 'Company', website: null, address: null },
    skills: [{ skillId: 'SK-CSHARP', name: 'C#' }], ...overrides
  });

  const setup = (response: RecruiterJobEditDetail = detail()): void => {
    getRecruiterJobDetail.mockReturnValue(of(response));
    fixture = TestBed.createComponent(EditJob);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    getRecruiterJobDetail.mockReset();
    updateJob.mockReset();
    navigate.mockReset();
    updateJob.mockReturnValue(of({ jobId: 'job-001', title: 'Updated', status: 'OPEN', createdAt: '2026-11-20' }));

    TestBed.configureTestingModule({
      imports: [EditJob],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ jobId: 'job-001' }) } } },
        { provide: JobService, useValue: { getRecruiterJobDetail, updateJob } }
      ]
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(commands => {
      navigate(commands);
      return Promise.resolve(true);
    });
  });

  it('tạo component EditJob', () => { setup(); expect(component).toBeTruthy(); });
  it('gọi GET với jobId trong route', () => {
    setup(); expect(getRecruiterJobDetail).toHaveBeenCalledWith('job-001');
  });
  it('preload title, CategoryId và jobType', () => {
    setup(); const v = component.form.getRawValue();
    expect(v.title).toBe('Backend Developer'); expect(v.categoryId).toBe('CAT-IT'); expect(v.jobType).toBe('FULL_TIME');
  });
  it('preload salary, vị trí và Location', () => {
    setup(); const v = component.form.getRawValue();
    expect(v.salaryMin).toBe(100); expect(v.salaryMax).toBe(300);
    expect(v.numberOfPositions).toBe(2); expect(v.location).toBe('Da Nang');
  });
  it('preload Skills và deadline', () => {
    setup(); const v = component.form.getRawValue();
    expect(v.skillIdsText).toBe('SK-CSHARP'); expect(v.deadline).toBe(detail().deadline.slice(0, 10));
  });
  it('preload description, requirements và experience', () => {
    setup(); const v = component.form.getRawValue();
    expect(v.description).toBe('Mo ta cu'); expect(v.requirements).toBe('Yeu cau cu'); expect(v.experience).toBe('2 years');
  });
  it('preload nhiều kỹ năng', () => {
    setup(detail({ skills: [{ skillId: 'SK-CSHARP', name: 'C#' }, { skillId: 'SK-JAVA', name: 'Java' }] }));
    expect(component.form.value.skillIdsText).toBe('SK-CSHARP, SK-JAVA');
  });
  it('không gửi PUT khi chưa hoàn tất GET', () => {
    getRecruiterJobDetail.mockReturnValue(NEVER);
    fixture = TestBed.createComponent(EditJob); component = fixture.componentInstance;
    component.submit(); expect(component.loading()).toBe(true); expect(updateJob).not.toHaveBeenCalled();
  });
  it('không gửi PUT nếu thiếu title', () => { setup(); component.form.patchValue({ title: '' }); component.submit(); expect(updateJob).not.toHaveBeenCalled(); });
  it.each(['title', 'categoryId', 'location', 'experience', 'description', 'requirements'] as const)(
    'không chấp nhận %s chỉ gồm khoảng trắng', field => {
      setup(); component.form.controls[field].setValue('   '); component.submit();
      expect(updateJob).not.toHaveBeenCalled(); expect(component.errorMessage()).not.toBe('');
    }
  );
  it('không gửi nếu JobType thiếu', () => { setup(); component.form.patchValue({ jobType: '' }); component.submit(); expect(updateJob).not.toHaveBeenCalled(); });
  it('không gửi nếu JobType không hợp lệ', () => {
    setup(); component.form.patchValue({ jobType: 'INVALID' as any }); component.submit(); expect(updateJob).not.toHaveBeenCalled();
  });
  it.each([0, -1, 1.5, 2.2])('không gửi khi numberOfPositions=%s', positions => {
    setup(); component.form.patchValue({ numberOfPositions: positions }); component.submit(); expect(updateJob).not.toHaveBeenCalled();
  });
  it.each([{ salaryMin: -1 }, { salaryMax: -1 }, { salaryMin: 400, salaryMax: 300 }])(
    'không gửi khi salary sai: %o', patch => {
      setup(); component.form.patchValue(patch); component.submit(); expect(updateJob).not.toHaveBeenCalled();
    }
  );
  it('không gửi khi deadline hôm nay UTC', () => {
    setup(); component.form.patchValue({ deadline: new Date().toISOString().slice(0, 10) });
    component.submit(); expect(updateJob).not.toHaveBeenCalled();
  });
  it('không gửi khi deadline trong quá khứ', () => {
    setup(); component.form.patchValue({ deadline: '2020-01-01' });
    component.submit(); expect(updateJob).not.toHaveBeenCalled();
  });
  it('không gửi nếu SkillIds trống', () => {
    setup(); component.form.patchValue({ skillIdsText: '  ,   ' }); component.submit(); expect(updateJob).not.toHaveBeenCalled();
  });
  it('không gửi nếu SkillIds bị trùng', () => {
    setup(); component.form.patchValue({ skillIdsText: 'SK-CSHARP, SK-CSHARP' });
    component.submit(); expect(updateJob).not.toHaveBeenCalled();
  });
  it('gửi PUT đúng jobId và payload được trim', () => {
    setup(); component.form.patchValue({ title: ' New Title ', skillIdsText: ' SK-CSHARP , SK-JAVA ' });
    component.submit();
    expect(updateJob).toHaveBeenCalledOnce();
    const [id, payload] = updateJob.mock.calls[0];
    expect(id).toBe('job-001'); expect(payload.title).toBe('New Title');
    expect(payload.skillIds).toEqual(['SK-CSHARP', 'SK-JAVA']);
    expect(payload.status).toBeUndefined(); expect(payload.companyId).toBeUndefined();
    expect(payload.recruiterId).toBeUndefined();
  });
  it('gửi deadline theo UTC và nullable salary', () => {
    setup(); component.form.patchValue({ salaryMin: null, salaryMax: null });
    component.submit(); const payload = updateJob.mock.calls[0][1];
    expect(payload.deadline).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00Z$/);
    expect(payload.salaryMin).toBeNull(); expect(payload.salaryMax).toBeNull();
  });
  it('sau PUT thành công quay lại My Jobs', () => {
    setup(); component.submit(); expect(navigate).toHaveBeenCalledWith(['/recruiter/jobs']);
  });
  it('không gửi nhiều PUT khi saving', () => {
    setup(); updateJob.mockReturnValue(NEVER); component.submit(); component.submit();
    expect(updateJob).toHaveBeenCalledTimes(1); expect(component.saving()).toBe(true);
  });
  it('Cancel không gọi PUT', () => {
    setup(); component.cancel(); expect(updateJob).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/recruiter/jobs']);
  });
  it('Cancel khi đang saving không điều hướng', () => {
    setup(); updateJob.mockReturnValue(NEVER); component.submit(); component.cancel();
    expect(navigate).not.toHaveBeenCalled();
  });
  it.each(['CLOSED'] as JobStatus[])('Job %s không cho lưu', status => {
    setup(detail({ status })); component.submit(); expect(component.canEdit()).toBe(false); expect(updateJob).not.toHaveBeenCalled();
  });
  it('Job hết hạn không cho lưu', () => {
    setup(detail({ deadline: '2020-01-01T00:00:00Z' }));
    component.submit(); expect(updateJob).not.toHaveBeenCalled();
  });
  it('Job PAUSED còn hạn được phép chỉnh sửa, giữ nguyên Status', () => {
    setup(detail({ status: 'PAUSED' })); component.submit();
    expect(component.canEdit()).toBe(true); expect(updateJob).toHaveBeenCalledOnce();
    expect(updateJob.mock.calls[0][1].status).toBeUndefined();
  });
  it('Backend thiếu CategoryId không cho hiển thị form sửa', () => {
    setup(detail({ categoryId: '' })); expect(component.job()).toBeNull(); expect(component.loadError()).toContain('CategoryId');
  });
  it('GET 404 hiển thị không thuộc quyền', () => {
    getRecruiterJobDetail.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    fixture = TestBed.createComponent(EditJob); component = fixture.componentInstance;
    expect(component.loadError()).toContain('không thuộc quyền');
  });
  it.each([401, 403, 0, 500])('GET lỗi HTTP %s hiển thị thông báo', status => {
    getRecruiterJobDetail.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    fixture = TestBed.createComponent(EditJob); component = fixture.componentInstance;
    expect(component.loadError()).not.toBe(''); expect(component.loading()).toBe(false);
  });
  it('Retry gọi lại GET khi đã lỗi', () => {
    getRecruiterJobDetail.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 }))).mockReturnValueOnce(of(detail()));
    fixture = TestBed.createComponent(EditJob); component = fixture.componentInstance;
    component.load(); expect(getRecruiterJobDetail).toHaveBeenCalledTimes(2); expect(component.job()?.jobId).toBe('job-001');
  });
  it.each([400, 401, 403, 404, 409, 0, 500])('PUT HTTP %s hiển thị lỗi, không điều hướng', status => {
    setup(); updateJob.mockReturnValue(throwError(() => new HttpErrorResponse({
      status, error: { detail: 'Loi nghiep vu' }
    })));
    component.submit(); expect(component.errorMessage()).not.toBe('');
    expect(component.saving()).toBe(false); expect(navigate).not.toHaveBeenCalled();
  });
  it('GET xong form pristine', () => {
    setup(); expect(component.form.pristine).toBe(true); expect(component.form.untouched).toBe(true);
  });
  it('giao diện hiển thị tiêu đề và nút Lưu', () => {
    setup(); expect(fixture.nativeElement.textContent).toContain('Chỉnh sửa tin tuyển dụng');
    expect(fixture.nativeElement.textContent).toContain('Lưu thay đổi');
  });
});
