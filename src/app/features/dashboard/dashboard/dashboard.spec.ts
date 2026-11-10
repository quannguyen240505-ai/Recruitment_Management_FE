import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Dashboard } from './dashboard';
import { Auth } from '../../../core/services/auth';

describe('Dashboard', () => {
    let component: Dashboard;
    let router: Router;

    const authMock = {
        logout: vi.fn()
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        await TestBed.configureTestingModule({
            imports: [Dashboard],
            providers: [
                provideRouter([]),
                {
                    provide: Auth,
                    useValue: authMock
                }
            ]
        }).compileComponents();

        router = TestBed.inject(Router);

        const fixture = TestBed.createComponent(Dashboard);
        component = fixture.componentInstance;

        fixture.detectChanges();
    });

    it('should create dashboard', () => {
        expect(component).toBeTruthy();
    });

    it('should logout and navigate to login', () => {
        const navigateSpy = vi
            .spyOn(router, 'navigate')
            .mockResolvedValue(true);

        component.logout();

        expect(authMock.logout).toHaveBeenCalledOnce();
        expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
});
