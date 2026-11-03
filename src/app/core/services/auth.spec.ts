import { TestBed } from '@angular/core/testing';
import { Auth } from './auth';

describe('Auth', () => {
    let auth: Auth;

    beforeEach(() => {
        TestBed.configureTestingModule({});

        auth = TestBed.inject(Auth);

        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should store access token', () => {
        auth.setAccessToken('test-token');

        expect(auth.getAccessToken()).toBe('test-token');
        expect(auth.isAuthenticated()).toBe(true);
    });

    it('should remove access token when logout', () => {
        auth.setAccessToken('test-token');

        auth.logout();

        expect(auth.getAccessToken()).toBeNull();
        expect(auth.isAuthenticated()).toBe(false);
    });

    it('should report unauthenticated when token does not exist', () => {
        expect(auth.hasAccessToken()).toBe(false);
    });
});