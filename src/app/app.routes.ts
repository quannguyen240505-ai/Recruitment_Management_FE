import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
  // Authentication
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login')
        .then(m => m.Login)
  },

  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register')
        .then(m => m.Register)
  },
  // SCRUM-158: Forgot Password
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password')
        .then(m => m.ForgotPassword)
  },
  // SCRUM-158: Reset Password
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password')
        .then(m => m.ResetPassword)
  },
  {
    path: 'change-password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/change-password/change-password')
        .then(m => m.ChangePassword)
  },

  // Dashboard
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard/dashboard')
        .then(m => m.Dashboard)
  },

  // SCRUM-154: Recruiter - Create Job
  {
    path: 'recruiter/jobs/create',
    canActivate: [roleGuard],
    loadComponent: () =>
      import('./features/jobs/create-job/create-job')
        .then(m => m.CreateJob)
  },

  // SCRUM-154: Recruiter - Manage Jobs
  {
    path: 'recruiter/jobs',
    canActivate: [roleGuard],
    loadComponent: () =>
      import('./features/jobs/recruiter-jobs/recruiter-jobs')
        .then(m => m.RecruiterJobs)
  },

  // Public Search Jobs
  {
    path: 'jobs/search',
    loadComponent: () =>
      import('./features/jobs/search-jobs/search-jobs')
        .then(m => m.SearchJobs)
  },

  // Public Job Details
  {
    path: 'jobs/:jobId',
    loadComponent: () =>
      import('./features/jobs/job-detail/job-detail')
        .then(m => m.JobDetail)
  },

  // Default
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },

  // SCRUM-154: Unknown URL redirects to Dashboard.
  // The existing authGuard on Dashboard redirects
  // unauthenticated users to Login.
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
