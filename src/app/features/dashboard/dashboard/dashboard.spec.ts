import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { Dashboard } from './dashboard';
import { Auth } from '../../../core/services/auth';

describe('Dashboard', () => {
    let component: Dashboard;

    const authMock = {
        logout: vi.fn()
    };

    const routerMock = {
        navigate: vi.fn()
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        await TestBed.configureTestingModule({
            imports: [Dashboard],
            providers: [
                { provide: Auth, useValue: authMock },
                { provide: Router, useValue: routerMock }
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(Dashboard);
        component = fixture.componentInstance;
    });

    it('should logout and navigate to login', () => {
        component.logout();

        expect(authMock.logout).toHaveBeenCalledOnce();
        expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });
});