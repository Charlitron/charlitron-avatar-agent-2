import React from 'react';
import { WhatsAppIcon } from './Icons';

const Contact: React.FC = () => {
  return (
    <footer id="contact" className="py-20 px-4 sm:px-6 lg:px-8 text-center bg-slate-900/50 mt-20">
      <div className="max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
          ¿Listo para innovar?
        </h2>
        <p className="text-slate-400 mt-4 mb-8">
          Descubre cómo nuestro asistente de IA puede transformar la interacción con tus clientes. Hablemos sobre tu proyecto.
        </p>
        <a 
          href="https://api.whatsapp.com/send/?phone=%2B524444237092&text&type=phone_number&app_absent=0" 
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 shadow-lg shadow-green-500/30 hover:shadow-green-600/40 transform hover:-translate-y-0.5"
        >
          <WhatsAppIcon />
          <span>Contactar por WhatsApp</span>
        </a>
      </div>
       <div className="mt-16 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} Charlitron. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
};

export default Contact;