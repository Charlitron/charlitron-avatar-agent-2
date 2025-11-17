import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-5 px-4 sm:px-6 lg:px-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <nav className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <img 
            src="https://static.wixstatic.com/media/7fb206_893f39bbcc1d4a469839dce707985bf7~mv2.png/v1/fill/w_314,h_314,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/charlitron-logo.png" 
            alt="Charlitron Logo" 
            className="h-12 w-12" 
          />
          <span className="text-xl font-bold text-white tracking-wider">CHARLITRON</span>
        </div>
        <a 
          href="https://api.whatsapp.com/send/?phone=%2B524444237092&text&type=phone_number&app_absent=0" 
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-block bg-brand-primary hover:bg-brand-secondary text-white font-semibold py-2 px-5 rounded-lg transition-all duration-300 shadow-lg shadow-brand-primary/30 hover:shadow-brand-secondary/40 transform hover:-translate-y-0.5"
        >
          Contáctanos
        </a>
      </nav>
    </header>
  );
};

export default Header;