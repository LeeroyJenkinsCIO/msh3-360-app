import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

/**
 * MainLayout - Wraps all authenticated pages with Header
 * Uses Outlet to render child routes
 */
export default function MainLayout() {
  return (
    <div className="min-h-screen bg-neutral-light">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  );
}