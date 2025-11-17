
import React from 'react';
import { ArrowDownLeftIcon, InteractionIcon, SupportIcon, SalesIcon, BenefitsIcon } from './Icons';

const ServiceCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; delay: string }> = ({ icon, title, children, delay }) => (
    <div 
      className="bg-white text-slate-800 p-8 rounded-2xl border border-rose-200/50 shadow-xl shadow-rose-900/10 animate-fade-in-up flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-rose-900/20"
      style={{ background: 'linear-gradient(145deg, #ffffff, #fdf8f8)' }}
    >
        <div className="flex items-center space-x-4 mb-4">
            {icon}
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        </div>
        <p className="text-slate-600 leading-relaxed grow">{children}</p>
    </div>
);


const Hero: React.FC = () => {
  return (
    <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 relative">
       <div 
        className="absolute top-1/2 left-0 -translate-x-1/4 -translate-y-1/2 w-80 h-80 border-2 border-slate-700/50 rounded-full opacity-50 hidden md:block"
        aria-hidden="true"
      ></div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Conecta con tu Asistente de IA,
        </h1>
        <div 
            className="mt-4 h-3 sm:h-4 w-1/2 md:w-[450px] mx-auto bg-gradient-to-r from-brand-primary to-brand-secondary rounded-lg animate-fade-in-up" 
            style={{ animationDelay: '0.3s' }}>
        </div>

        <p className="max-w-2xl mx-auto text-lg text-slate-400 mt-8 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          Conoce a nuestra experta digital, lista para responder tus preguntas y guiarte a través de nuestros servicios. Simplemente haz clic en el avatar y comienza una conversación.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
            <div className="flex items-center text-brand-primary/80 animate-pulse mt-4">
                <ArrowDownLeftIcon/>
                <span className="ml-2 text-sm text-slate-400">¡Pruébalo ahora! Habla con nuestro avatar</span>
            </div>
        </div>
      </div>
      
      <section id="services" className="max-w-6xl mx-auto mt-24 md:mt-32 scroll-mt-20">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight text-center mb-12 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              Beneficios de Nuestro Avatar IA
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <ServiceCard icon={<InteractionIcon />} title="Interacción Inmersiva 24/7" delay="1s">
                  Cautiva a tus visitantes desde el primer momento. Nuestro avatar ofrece una experiencia de usuario dinámica y conversacional, disponible día y noche para resolver dudas y guiar a tus clientes.
              </ServiceCard>
              <ServiceCard icon={<SupportIcon />} title="Eficiencia y Reducción de Costos" delay="1.2s">
                  Automatiza la atención al cliente de primer nivel. Libera a tu equipo para que se concentre en tareas estratégicas mientras el avatar gestiona las interacciones recurrentes, optimizando tus recursos.
              </ServiceCard>
              <ServiceCard icon={<SalesIcon />} title="Personalización que Convierte" delay="1.4s">
                  Adapta la conversación para presentar promociones y recomendar productos, creando un recorrido de compra personalizado que impulsa las conversiones y la satisfacción del cliente.
              </ServiceCard>
              <ServiceCard icon={<BenefitsIcon />} title="Imagen de Marca Innovadora" delay="1.6s">
                  Posiciona tu negocio a la vanguardia tecnológica. Un asistente IA proyecta una imagen moderna y sofisticada, diferenciándote de la competencia y atrayendo a un público digital.
              </ServiceCard>
          </div>
      </section>
    </section>
  );
};

export default Hero;