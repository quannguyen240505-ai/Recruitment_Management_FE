import { TestBed } from '@angular/core/testing';
import {
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    UrlTree,
    provideRouter
} from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Auth } from '../services/auth';
import { roleGuard } from './role-guard';
import { routes } from '../../app.routes';

describe('Role Guard - SCRUM-154', () => {
    const authMock = {
        hasAccessToken: vi.fn(),
        getCurrentRole: vi.fn()
    };

    beforeEach(() => {
        vi.resetAllMocks();

        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: Auth, useValue: authMock }
            ]
        });
    });

    const executeGuard = () =>
        TestBed.runInInjectionContext(() =>
            roleGuard(
                {} as ActivatedRouteSnapshot,
                {} as RouterStateSnapshot
            )
        );

    // TEST 1: Guest phải về Login
    it('redirects Guest to login', () => {
        authMock.hasAccessToken.mockReturnValue(false);

        const result = executeGuard() as UrlTree;

        expect(result.toString()).toBe('/login');
    });

    // TEST 2: Candidate bị chặn
    it('blocks Candidate', () => {
        authMock.hasAccessToken.mockReturnValue(true);
        authMock.getCurrentRole.mockReturnValue('CANDIDATE');

        const result = executeGuard() as UrlTree;

        expect(result.toString()).toBe('/dashboard');
    });

    // TEST 3: Admin không có quyền Recruiter
    it('blocks Admin from Recruiter routes', () => {
        authMock.hasAccessToken.mockReturnValue(true);
        authMock.getCurrentRole.mockReturnValue('ADMIN');

        const result = executeGuard() as UrlTree;

        expect(result.toString()).toBe('/dashboard');
    });

    // TEST 4: Recruiter được phép truy cập
    it('allows Recruiter', () => {
        authMock.hasAccessToken.mockReturnValue(true);
        authMock.getCurrentRole.mockReturnValue('RECRUITER');

        expect(executeGuard()).toBe(true);
    });

    // TEST 5-6: Hai route bắt buộc có roleGuard
    it.each([
        'recruiter/jobs',
        'recruiter/jobs/create'
    ])('protects route %s', path => {
        const route = routes.find(r => r.path === path);

        expect(route).toBeDefined();
        expect(route?.canActivate).toContain(roleGuard);
    });
});
