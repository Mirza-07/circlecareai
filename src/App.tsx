import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { FamilyProvider } from './context/FamilyContext.js';
import { JudgeDemoBanner } from './components/JudgeDemoBanner.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { CookieBanner } from './components/CookieBanner.js';
import { AssistantDrawer } from './components/AssistantDrawer.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { TasksPage } from './pages/TasksPage.js';
import { CalendarPage } from './pages/CalendarPage.js';
import { FamilyPage } from './pages/FamilyPage.js';
import { AlexaSimulatorPage } from './pages/AlexaSimulatorPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import {
  PrivacyPolicyPage,
  TermsPage,
  CookiePolicyPage,
  CookiePreferencesPage
} from './pages/legal/LegalPages.js';
import { Sparkles } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<string>('dashboard');
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  const handleNavigate = (route: string) => {
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCurrentPage = () => {
    switch (currentRoute) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={handleNavigate}
            onOpenAssistant={() => setIsAssistantOpen(true)}
          />
        );
      case 'tasks':
        return <TasksPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'family':
        return <FamilyPage />;
      case 'alexa-simulator':
        return <AlexaSimulatorPage />;
      case 'settings':
        return <SettingsPage onNavigate={handleNavigate} />;
      case 'privacy':
        return <PrivacyPolicyPage onBack={() => handleNavigate('dashboard')} />;
      case 'terms':
        return <TermsPage onBack={() => handleNavigate('dashboard')} />;
      case 'cookies':
        return <CookiePolicyPage onBack={() => handleNavigate('dashboard')} />;
      case 'cookie-preferences':
        return <CookiePreferencesPage onBack={() => handleNavigate('dashboard')} />;
      default:
        return (
          <DashboardPage
            onNavigate={handleNavigate}
            onOpenAssistant={() => setIsAssistantOpen(true)}
          />
        );
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg animate-bounce mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Loading CircleCare AI Workspace...</p>
        <span className="text-xs text-slate-400 mt-1">Authenticating session & verifying family isolation</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* 1. Hackathon Evaluation Top Banner */}
      <JudgeDemoBanner onNavigateToSimulator={() => handleNavigate('alexa-simulator')} />

      {/* 2. Global Navbar */}
      <Navbar
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onToggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)}
      />

      {/* 3. Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderCurrentPage()}
      </main>

      {/* 4. Persistent Floating Assistant Button (FR-DASH-003) */}
      {!isAssistantOpen && (
        <button
          onClick={() => setIsAssistantOpen(true)}
          className="fixed bottom-6 right-6 z-40 p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl hover:shadow-2xl flex items-center gap-2 transition hover:scale-105 group"
          title="Open CircleCare AI Assistant"
          aria-label="Open CircleCare AI Assistant"
        >
          <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-bold hidden sm:inline">Ask CircleCare AI</span>
        </button>
      )}

      {/* 5. Persistent In-App Assistant Drawer */}
      <AssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />

      {/* 6. Cookie Consent Banner (FR-SET-004) */}
      <CookieBanner onOpenFullPreferences={() => handleNavigate('cookie-preferences')} />

      {/* 7. Footer with legal links & hackathon badge */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <FamilyProvider>
        <AppContent />
      </FamilyProvider>
    </AuthProvider>
  );
};

export default App;
