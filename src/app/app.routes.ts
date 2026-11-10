
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  // Authentication
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login')
        .then(m => m.Login)
  },

  // Dashboard
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard/dashboard')
        .then(m => m.Dashboard)
  },

  // Create Job
  {
    path: 'recruiter/jobs/create',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/jobs/create-job/create-job')
        .then(m => m.CreateJob)
  },

  // SCRUM-144: Search Jobs
  // Route cu the phai nam truoc route co tham so
  {
    path: 'jobs/search',
    loadComponent: () =>
      import('./features/jobs/search-jobs/search-jobs')
        .then(m => m.SearchJobs)
  },

  // Job Details
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

  // Not Found
  {
    path: '**',
    redirectTo: 'login'
  }
];
