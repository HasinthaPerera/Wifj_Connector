/* eslint-disable react-refresh/only-export-components */
import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { PageLoader, ErrorBoundary } from '@/components/ui'
import { NotFoundPage } from '@/pages'
import { routes } from './routes'

export { routes } from './routes'
export type { RouteConfig } from './routes'

/**
 * AppRoutes — Configures the main React Router mapping structure inside the RootLayout framework.
 * Integrates React Suspense dynamically to render a custom PageLoader while components are lazily fetched.
 * Unmatched paths default to the customized NotFoundPage.
 */
export function AppRoutes(): React.JSX.Element {
  return (
    <Suspense fallback={<PageLoader fullScreen={false} message="Initializing page module..." />}>
      <Routes>
        <Route element={<RootLayout />}>
          {routes.map((route) => {
            const Component = route.component
            return (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <ErrorBoundary>
                    <Component />
                  </ErrorBoundary>
                }
              />
            )
          })}
          {/* Unmatched Fallback Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
