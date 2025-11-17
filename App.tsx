
import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Contact from './components/Contact';
import GeminiChat from './components/GeminiChat';
import IntegrationStatus from './components/IntegrationStatus';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-gray-200 font-sans overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-900 via-brand-primary/20 to-slate-900 animate-gradient-bg" style={{ backgroundSize: '200% 200%' }}></div>
      <div className="absolute top-0 left-0 w-full h-full bg-grid-slate-700/[0.1] [mask-image:linear-gradient(to_bottom,white_5%,transparent_80%)]"></div>
      <div className="relative z-10">
        <Header />
        <main>
          <Hero />
          <Contact />
        </main>
      </div>
      <GeminiChat />
      <IntegrationStatus />
    </div>
  );
};

export default App;