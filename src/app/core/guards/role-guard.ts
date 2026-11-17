
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Auth } from '../services/auth';

export const roleGuard: CanActivateFn = () => {
    const auth = inject(Auth);
    const router = inject(Router);

    if (!auth.hasAccessToken()) {
        return router.createUrlTree(['/login']);
    }

    if (auth.getCurrentRole() !== 'RECRUITER') {
        return router.createUrlTree(['/dashboard']);
    }

    return true;
};
