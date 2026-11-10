import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  JobService,
  SearchJobsResponse
} from '../../../core/services/job';

import { SearchJobs } from './search-jobs';

describe('SearchJobs - SCRUM-144', () => {
  let component: SearchJobs;
  let fixture: ComponentFixture<SearchJobs>;

  const searchJobsMock = vi.fn();

  const mockResponse: SearchJobsResponse = {
    items: [
      {
        jobId: 'job-001',
        title: 'Frontend Angular Developer',
        companyId: 'company-001',
        companyName: 'Recruitly Test Company',
        categoryId: 'category-001',
        location: 'Quy Nhơn',
        jobType: 'FULL_TIME',
        experience: '1',
        salaryMin: 10000000,
        salaryMax: 20000000,
        deadline: '2026-12-30T00:00:00Z',
        createdAt: '2026-11-10T00:00:00Z'
      }
    ],
    page: 0,
    size: 10,
    totalItems: 1
  };

  beforeEach(async () => {
    searchJobsMock.mockReset();
    searchJobsMock.mockReturnValue(of(mockResponse));

    await TestBed.configureTestingModule({
      imports: [SearchJobs],
      providers: [
        provideRouter([]),
        {
          provide: JobService,
          useValue: {
            searchJobs: searchJobsMock
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchJobs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // TEST 1: Component initialization
  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // TEST 2: Default API request
  it('should load jobs on initialization', () => {
    expect(searchJobsMock).toHaveBeenCalledWith({
      page: 0,
      size: 10
    });

    expect(component.jobs()).toHaveLength(1);
    expect(component.totalItems()).toBe(1);
  });

  // TEST 3: Display real response data
  it('should render job information', () => {
    const content = fixture.nativeElement.textContent;

    expect(content).toContain('Frontend Angular Developer');
    expect(content).toContain('Recruitly Test Company');
    expect(content).toContain('Quy Nhơn');
    expect(content).toContain('10.000.000');
  });

  // TEST 4: Combined search filters
  it('should apply keyword and multiple filters', () => {
    component.filters.keyword = ' Angular ';
    component.filters.location = ' Quy Nhơn ';
    component.filters.jobType = 'FULL_TIME';
    component.filters.salaryMin = 10000000;

    component.search();

    expect(searchJobsMock).toHaveBeenLastCalledWith({
      keyword: 'Angular',
      location: 'Quy Nhơn',
      jobType: 'FULL_TIME',
      experience: '',
      salaryMin: 10000000,
      page: 0,
      size: 10
    });
  });

  // TEST 5: Clear filters
  it('should clear filters and reload jobs', () => {
    component.filters.keyword = 'Angular';
    component.filters.location = 'Quy Nhơn';

    component.search();
    component.clearFilters();

    expect(component.filters.keyword).toBe('');
    expect(component.filters.location).toBe('');
    expect(component.page()).toBe(0);

    expect(searchJobsMock).toHaveBeenLastCalledWith({
      page: 0,
      size: 10
    });
  });

  // TEST 6: Empty state
  it('should display empty state', () => {
    searchJobsMock.mockReturnValue(
      of({
        items: [],
        page: 0,
        size: 10,
        totalItems: 0
      })
    );

    component.loadJobs();
    fixture.detectChanges();

    expect(component.jobs()).toHaveLength(0);

    expect(
      fixture.nativeElement.textContent
    ).toContain('Không tìm thấy công việc phù hợp');
  });

  // TEST 7: Pagination
  it('should navigate to the next page', () => {
    component.result.set({
      ...mockResponse,
      totalItems: 25
    });

    component.goToPage(1);

    expect(component.page()).toBe(1);

    expect(searchJobsMock).toHaveBeenLastCalledWith({
      page: 1,
      size: 10
    });
  });

  // TEST 8: Loading state
  it('should show loading while waiting for the API', () => {
    const pending = new Subject<SearchJobsResponse>();

    searchJobsMock.mockReturnValue(
      pending.asObservable()
    );

    component.loadJobs();
    fixture.detectChanges();

    expect(component.loading()).toBe(true);

    expect(
      fixture.nativeElement.textContent
    ).toContain('Đang tìm kiếm công việc');

    pending.next(mockResponse);
    pending.complete();

    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.jobs()).toHaveLength(1);
  });

  // TEST 9: Network error
  it('should handle network errors', () => {
    searchJobsMock.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 0 })
      )
    );

    component.loadJobs();
    fixture.detectChanges();

    expect(component.error()).toContain(
      'Không thể kết nối Backend'
    );

    expect(
      fixture.nativeElement.textContent
    ).toContain('Không thể tải dữ liệu');
  });

  // TEST 10: Invalid salary
  it('should reject negative salary filters', () => {
    component.filters.salaryMin = -1000;

    const previousCalls = searchJobsMock.mock.calls.length;

    component.search();

    expect(component.error()).toContain(
      'Mức lương tối thiểu không hợp lệ'
    );

    expect(searchJobsMock).toHaveBeenCalledTimes(
      previousCalls
    );
  });
});
