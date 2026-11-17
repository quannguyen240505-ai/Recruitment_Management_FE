import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Dashboard } from './dashboard';
import { Auth } from '../../../core/services/auth';

describe('Dashboard - SCRUM-154', () => {
    let component: Dashboard;
    let fixture: ComponentFixture<Dashboard>;
    let router: Router;

    const authMock = {
        logout: vi.fn(),
        hasAccessToken: vi.fn(),
        getCurrentRole: vi.fn()
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        authMock.hasAccessToken.mockReturnValue(true);
        authMock.getCurrentRole.mockReturnValue('CANDIDATE');

        await TestBed.configureTestingModule({
            imports: [Dashboard],
            providers: [
                provideRouter([]),
                { provide: Auth, useValue: authMock }
            ]
        }).compileComponents();

        router = TestBed.inject(Router);
        fixture = TestBed.createComponent(Dashboard);
        component = fixture.componentInstance;
    });

    it('should create dashboard', () => {
        fixture.detectChanges();

        expect(component).toBeTruthy();
    });

    it('should logout and navigate to login', () => {
        const navigateSpy = vi
            .spyOn(router, 'navigate')
            .mockResolvedValue(true);

        component.logout();

        expect(authMock.logout).toHaveBeenCalledOnce();
        expect(navigateSpy)
            .toHaveBeenCalledWith(['/login']);
    });

    it('hides Recruiter menu for Candidate', () => {
        fixture.detectChanges();

        const content = fixture.nativeElement.textContent;

        expect(content)
            .not.toContain('Quản lý tin tuyển dụng');

        expect(content)
            .not.toContain('Tạo tin tuyển dụng');
    });

    it('shows Recruiter menu for Recruiter', () => {
        authMock.getCurrentRole.mockReturnValue('RECRUITER');

        fixture.detectChanges();

        const content = fixture.nativeElement.textContent;

        expect(content)
            .toContain('Quản lý tin tuyển dụng');

        expect(content)
            .toContain('Tạo tin tuyển dụng');
    });

    it('hides Recruiter menu when unauthenticated', () => {
        authMock.hasAccessToken.mockReturnValue(false);

        fixture.detectChanges();

        const content = fixture.nativeElement.textContent;

        expect(content)
            .not.toContain('Quản lý tin tuyển dụng');

        expect(content)
            .not.toContain('Tạo tin tuyển dụng');
    });
});
