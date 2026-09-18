import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage.tsx';
import { StudentPortal } from './components/student/StudentPortal.tsx';
import { AdminLogin } from './components/admin/AdminLogin.tsx';
import { AdminLayout } from './components/admin/AdminLayout.tsx';
import {
  getAdminToken,
  getCachedAdminUser,
  clearAdminSession,
  verifyAdminSessionOnServer
} from './lib/auth.ts';

type AppView = 'landing' | 'student' | 'admin-login' | 'admin-app';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [adminUser, setAdminUser] = useState<any | null>(() => getCachedAdminUser());
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(true);

  // Verify existing admin session on initial load
  useEffect(() => {
    const checkExistingSession = async () => {
      const token = getAdminToken();
      if (token) {
        const result = await verifyAdminSessionOnServer();
        if (result.valid && result.user) {
          setAdminUser(result.user);
        } else {
          clearAdminSession();
          setAdminUser(null);
        }
      }
      setIsVerifyingAuth(false);
    };

    checkExistingSession();
  }, []);

  // Handle Lecturer/Admin selection from Landing Page
  const handleSelectAdmin = () => {
    const token = getAdminToken();
    if (token && adminUser) {
      setCurrentView('admin-app');
    } else {
      setCurrentView('admin-login');
    }
  };

  // Handle successful Admin Login
  const handleAdminLoginSuccess = (userData: any) => {
    setAdminUser(userData);
    setCurrentView('admin-app');
  };

  // Handle Admin Logout
  const handleAdminLogout = () => {
    clearAdminSession();
    setAdminUser(null);
    setCurrentView('landing');
  };

  // Loading state during initial session verification
  if (isVerifyingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-slate-400">Memverifikasi Sesi Sistem CBT...</span>
        </div>
      </div>
    );
  }

  // 1. View: Landing Page (Halaman Awal)
  if (currentView === 'landing') {
    return (
      <LandingPage
        onSelectStudent={() => setCurrentView('student')}
        onSelectAdmin={handleSelectAdmin}
      />
    );
  }

  // 2. View: Student Portal (Khusus Mahasiswa: Form -> Instruksi -> Ruang Ujian -> Selesai)
  if (currentView === 'student') {
    return (
      <StudentPortal
        onBackToLanding={() => setCurrentView('landing')}
      />
    );
  }

  // 3. View: Admin Login (Server-Validated Login for Lecturer/Proctor)
  if (currentView === 'admin-login') {
    return (
      <AdminLogin
        onLoginSuccess={handleAdminLoginSuccess}
        onBackToLanding={() => setCurrentView('landing')}
      />
    );
  }

  // 4. View: Admin Application (Sidebar layout with 10 management menus)
  if (currentView === 'admin-app') {
    // Strict route protection: if no admin session, force to login
    if (!adminUser) {
      return (
        <AdminLogin
          onLoginSuccess={handleAdminLoginSuccess}
          onBackToLanding={() => setCurrentView('landing')}
        />
      );
    }

    return (
      <AdminLayout
        adminUser={adminUser}
        onLogout={handleAdminLogout}
        onSwitchToStudentPortal={() => setCurrentView('student')}
      />
    );
  }

  return (
    <LandingPage
      onSelectStudent={() => setCurrentView('student')}
      onSelectAdmin={handleSelectAdmin}
    />
  );
}
