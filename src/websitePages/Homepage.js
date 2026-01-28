import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useInView, useSpring } from 'framer-motion';
import { 
  Calendar as CalendarIcon, Users, Sparkles, CheckCircle2, 
  AlertCircle, MessageSquare, Clock, Search, ArrowRight,
  Shield, Zap, UserPlus, FileText, Bot, Brain, TrendingUp,
  ChevronDown, Activity, BookOpen, Globe, Building2, User,
  Lock, Server, Code, Rocket, Building, FileCheck
} from 'lucide-react';

// --- Shared Design Elements ---

const Avatar = ({ name, color, className }) => (
  <div className={`flex items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm ring-2 ring-white ${color} ${className}`}>
    {name.substring(0, 2).toUpperCase()}
  </div>
);

const Pill = ({ text, icon: Icon, color }) => (
  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${color}`}>
    {Icon && <Icon size={12} />}
    {text}
  </div>
);

// --- Crossing Line Component (Between Sections) ---

const CrossingLine = ({ sectionRef, index }) => {
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });
  
  const crossOpacity = useTransform(scrollYProgress, [0.3, 0.5, 0.7], [0, 1, 0]);
  const crossWidth = useTransform(scrollYProgress, [0.3, 0.5, 0.7], ['0%', 'calc(100% - 2rem)', '0%']);
  
  return (
    <motion.div
      style={{
        opacity: crossOpacity,
        width: crossWidth
      }}
      className="fixed left-4 right-4 h-0.5 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 z-40 pointer-events-none"
    />
  );
};

// --- Scrolling Thread Component ---

const ScrollingThread = () => {
  const { scrollYProgress } = useScroll();
  const [sections, setSections] = useState([]);
  
  useEffect(() => {
    const updateSections = () => {
      const sectionElements = document.querySelectorAll('section[data-section]');
      setSections(Array.from(sectionElements));
    };
    
    updateSections();
    const timer = setTimeout(updateSections, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  const threadHeight = useTransform(scrollYProgress, [0, 1], ['0vh', '100vh']);
  const threadOpacity = useTransform(scrollYProgress, [0, 0.02, 0.98, 1], [0, 1, 1, 0]);

  return (
    <>
      {/* Left Thread - Grows from top as you scroll */}
      <motion.div
        style={{
          height: threadHeight,
          opacity: threadOpacity
        }}
        className="fixed left-4 top-0 w-0.5 bg-gradient-to-b from-blue-400 via-purple-400 via-pink-400 to-rose-400 z-40 pointer-events-none shadow-lg"
      />
      
      {/* Right Thread - Grows from top as you scroll */}
      <motion.div
        style={{
          height: threadHeight,
          opacity: threadOpacity
        }}
        className="fixed right-4 top-0 w-0.5 bg-gradient-to-b from-emerald-400 via-teal-400 via-cyan-400 to-blue-400 z-40 pointer-events-none shadow-lg"
      />
      
      {/* Horizontal Crossing Lines Between Sections */}
      {sections.map((section, index) => {
        if (index === 0) return null;
        return <CrossingLine key={`cross-${index}`} sectionRef={{ current: section }} index={index} />;
      })}
    </>
  );
};

// --- Scroll Connector Component (Between Sections) ---

const ScrollConnector = ({ context, color = "blue", sectionRef }) => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });
  
  const connectorHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const contextOpacity = useTransform(scrollYProgress, [0.4, 0.5, 0.6], [0, 1, 0]);
  
  const colorClasses = {
    blue: "from-blue-400 via-indigo-400 to-purple-400",
    purple: "from-purple-400 via-pink-400 to-rose-400",
    green: "from-emerald-400 via-teal-400 to-cyan-400",
    orange: "from-orange-400 via-amber-400 to-yellow-400"
  };

  return (
    <div ref={containerRef} className="relative h-full w-full pointer-events-none">
      <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full z-0">
        <motion.div 
          style={{ height: connectorHeight, opacity }}
          className={`w-full bg-gradient-to-b ${colorClasses[color]} shadow-lg rounded-full`}
        />
        {context && (
          <motion.div
            style={{ opacity: contextOpacity }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap z-10"
          >
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full px-4 py-2 shadow-lg text-xs font-medium" style={{ color: 'var(--color-logo-2, #0f172a)' }}>
              {context}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// --- 1. Hero: The Self-Healing Calendar Demo ---

const InteractiveCalendarHero = () => {
  const heroRef = useRef(null);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  
  // Animation State Sequence
  const [step, setStep] = useState(0); 

  useEffect(() => {
    // Loop the animation sequence
    const sequence = async () => {
      await new Promise(r => setTimeout(r, 2000)); // Wait
      setStep(1); // Gap Appears
      await new Promise(r => setTimeout(r, 1500)); // AI Suggests
      setStep(2); // AI Searching
      await new Promise(r => setTimeout(r, 2000)); // Match Found
      setStep(3); // Shift Filled
      await new Promise(r => setTimeout(r, 4000)); // Reset
      setStep(0);
    };
    sequence();
  }, [step === 3]); // Re-run when loop ends (hacky simple loop)

  return (
    <section ref={heroRef} data-section="hero" className="relative pt-32 pb-20 overflow-hidden bg-hero-gradient">
      
      {/* Hero Gradient Background (from index.css) */}
      <div className="absolute inset-0 bg-hero-gradient -z-10" />
      
      <div className="text-center mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-sm text-slate-600 mb-6"
        >
          <Sparkles size={14} className="text-amber-400 fill-amber-400" />
          <span>Swiss Healthcare Operating System</span>
        </motion.div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6">
          The Operating System for<br className="hidden md:block"/>
          <span className="text-blue-600 relative">
            Switzerland's Healthcare Workforce
            <svg className="absolute w-full h-3 -bottom-1 left-0 text-blue-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
               <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
            </svg>
          </span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          Stop managing shortages. Start engineering capacity. We combine enterprise-grade Team Management Software with an On-Demand Staffing Marketplace in one SECO-compliant platform.
        </p>
      </div>

      {/* --- THE DEMO UI --- */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden ring-1 ring-slate-900/5">
          
          {/* Mock Browser Header */}
          <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400/80"/>
              <div className="w-3 h-3 rounded-full bg-amber-400/80"/>
              <div className="w-3 h-3 rounded-full bg-green-400/80"/>
            </div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              October 2026 • Emergency Ward
            </div>
            <div className="w-16"/> 
          </div>

          <div className="flex flex-col md:flex-row h-[500px]">
            
            {/* Sidebar (People) */}
            <div className="w-full md:w-64 border-r border-slate-100 p-6 bg-slate-50/50 hidden md:block">
              <div className="text-xs font-semibold text-slate-400 mb-4 uppercase">Internal Team</div>
              <div className="space-y-3">
                {['Dr. Weber', 'Nurse Sarah', 'Tech Mike'].map((n, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer group">
                    <Avatar name={n} color={['bg-blue-500', 'bg-emerald-500', 'bg-purple-500'][i]} className="w-8 h-8"/>
                    <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">{n}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-xs font-semibold text-slate-400 mb-4 uppercase flex justify-between items-center">
                <span>Talent Pool</span>
                <span className="bg-blue-100 text-blue-700 px-1.5 rounded text-[10px]">142</span>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-center">
                <p className="text-xs text-blue-600 font-medium mb-2">Need coverage?</p>
                <button className="text-xs bg-white text-blue-600 border border-blue-200 px-3 py-1.5 rounded-full shadow-sm w-full hover:shadow-md transition-all">
                  Post Mission
                </button>
              </div>
            </div>

            {/* Main Calendar Area */}
            <div className="flex-1 p-6 relative bg-white">
              <div className="grid grid-cols-1 gap-4">
                
                {/* 08:00 - 16:00 (Stable) */}
                <div className="flex gap-4">
                  <div className="w-16 text-right text-xs text-slate-400 font-medium pt-3">08:00</div>
                  <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl p-3 relative group hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Avatar name="Sarah" color="bg-emerald-500" className="w-6 h-6"/>
                        <span className="text-sm font-medium text-emerald-900">Shift #2204 • ICU Nurse</span>
                      </div>
                      <Pill text="Confirmed" icon={CheckCircle2} color="bg-emerald-100 text-emerald-700" />
                    </div>
                  </div>
                </div>

                {/* 16:00 - 00:00 (THE ANIMATION TARGET) */}
                <div className="flex gap-4 relative">
                  <div className="w-16 text-right text-xs text-slate-400 font-medium pt-3">16:00</div>
                  
                  <AnimatePresence mode="wait">
                    {/* STATE 0: Normal */}
                    {step === 0 && (
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-3"
                      >
                         <div className="flex items-center gap-2">
                            <Avatar name="Mike" color="bg-blue-500" className="w-6 h-6"/>
                            <span className="text-sm font-medium text-blue-900">Shift #2205 • Technician</span>
                          </div>
                      </motion.div>
                    )}

                    {/* STATE 1: Gap/Drop */}
                    {step === 1 && (
                      <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex-1 bg-white border-2 border-dashed border-rose-300 rounded-xl p-4 flex items-center justify-between"
                      >
                         <div className="flex items-center gap-3 text-rose-500">
                            <div className="p-2 bg-rose-50 rounded-full"><AlertCircle size={18}/></div>
                            <div>
                                <span className="block text-sm font-bold">Shift Dropped</span>
                                <span className="text-xs text-rose-400">Mike is sick (uploaded certificate)</span>
                            </div>
                          </div>
                          <button className="bg-rose-500 text-white text-xs px-3 py-1.5 rounded-lg shadow-sm animate-pulse">
                             Find Cover
                          </button>
                      </motion.div>
                    )}

                     {/* STATE 2: AI Working */}
                     {step === 2 && (
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex items-center justify-center gap-3"
                      >
                         <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                         <span className="text-sm font-medium text-blue-700">AI contacting 3 qualified floaters...</span>
                      </motion.div>
                    )}

                    {/* STATE 3: Resolved */}
                    {step === 3 && (
                       <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                                <Avatar name="Julia" color="bg-indigo-600" className="w-6 h-6"/>
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-[1px]">
                                    <Zap size={10} className="text-amber-500 fill-amber-500"/>
                                </div>
                            </div>
                            <div>
                                <span className="text-sm font-medium text-indigo-900 block">Julia K. (External)</span>
                                <span className="text-[10px] text-indigo-500 uppercase tracking-wide">Accepted 2m ago</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                             <Pill text="GLN Verified" icon={Shield} color="bg-white/50 text-indigo-600 border border-indigo-100" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                 {/* 00:00 - 08:00 */}
                 <div className="flex gap-4 opacity-50">
                  <div className="w-16 text-right text-xs text-slate-400 font-medium pt-3">00:00</div>
                  <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                        <Avatar name="David" color="bg-slate-400" className="w-6 h-6"/>
                        <span className="text-sm font-medium text-slate-500">Shift #2206 • Night Watch</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* AI Chat Overlay Toast */}
              <AnimatePresence>
                {step === 1 && (
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}
                        className="absolute bottom-6 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-20"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg text-white"><Sparkles size={16}/></div>
                            <div>
                                <p className="text-sm text-slate-700 font-medium mb-1">I detected a gap.</p>
                                <p className="text-xs text-slate-500 mb-2">Based on availability patterns, Julia K. matches this shift perfectly and is SECO compliant.</p>
                                <button className="text-xs font-medium text-blue-600 hover:text-blue-700">Auto-invite Julia →</button>
                            </div>
                        </div>
                    </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
        </div>
      </div>

      {/* Scroll Down Indicator with Context */}
      <motion.div 
        style={{ opacity }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 z-20"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="text-slate-600 text-sm font-medium flex items-center gap-2"
        >
          <span>Discover the AI Agent</span>
          <ChevronDown size={16} />
        </motion.div>
        <motion.div 
          style={{ height: y1 }}
          className="w-0.5 bg-gradient-to-b from-blue-400 via-purple-400 to-pink-400"
        />
      </motion.div>
    </section>
  );
};

// --- 2. Feature Grid: "The Operating System" ---

const FeatureCard = ({ icon: Icon, title, desc, delay, gradient }) => {
    const gradientClasses = {
        blue: "from-blue-50 to-indigo-50 text-blue-600",
        purple: "from-purple-50 to-pink-50 text-purple-600",
        green: "from-emerald-50 to-teal-50 text-emerald-600",
        orange: "from-orange-50 to-amber-50 text-orange-600"
    };
    
    return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
          className={`p-6 rounded-2xl bg-gradient-to-br ${gradientClasses[gradient]} border border-white/50 shadow-sm hover:shadow-lg transition-all group backdrop-blur-sm`}
    >
          <div className={`w-12 h-12 rounded-xl bg-white/80 text-${gradient}-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
    </motion.div>
);
};

const FeatureGrid = () => {
    return (
        <section data-section="features" className="relative py-24 bg-white overflow-hidden">
            <div className="relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                    >
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">One Platform. The Entire Workforce Lifecycle.</h2>
                        <p className="text-slate-600">Why pay for a rostering tool, a recruitment agency, and a compliance auditor? We consolidated 150+ operational actions into a single source of truth.</p>
                    </motion.div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureCard 
                        icon={Clock}
                        title="AI Auto-Rostering"
                        desc="Don't just fill slots. Our Constraint Programming engine respects legal rest times (ArG), skill mix, and fair distribution of weekends."
                        delay={0.1}
                        gradient="blue"
                    />
                    <FeatureCard 
                        icon={UserPlus}
                        title="Instant Gap Resolution"
                        desc="One click to resolve gaps. The system invites qualified external talent based on certifications. Try before you buy with temporary missions."
                        delay={0.2}
                        gradient="purple"
                    />
                    <FeatureCard 
                        icon={FileText}
                        title="Fiduciary-Ready Payroll"
                        desc="Hard-lock payroll periods and export data directly to your fiduciary. We handle night premiums, piquets, and holiday balances."
                        delay={0.3}
                        gradient="green"
                    />
                </div>
            </div>
        </section>
    );
};

// --- 3. Enhanced AI Agent Showcase Section ---

const AIChatSection = () => {
    const aiRef = useRef(null);
    const isInView = useInView(aiRef, { margin: "-100px", once: true });
    const [chatStep, setChatStep] = useState(0);
    
    useEffect(() => {
        if (!isInView) return;
        
        const sequence = async () => {
            await new Promise(r => setTimeout(r, 1000));
            setChatStep(1);
            await new Promise(r => setTimeout(r, 2000));
            setChatStep(2);
            await new Promise(r => setTimeout(r, 3000));
            setChatStep(3);
        };
        sequence();
    }, [isInView]);
    
    const aiFeatures = [
        { icon: Brain, text: "Understands Swiss labor laws", color: "purple" },
        { icon: BookOpen, text: "Reads your contracts & documents", color: "blue" },
        { icon: Activity, text: "Monitors compliance in real-time", color: "green" },
        { icon: Globe, text: "Answers in multiple languages", color: "orange" }
    ];
    
    return (
        <section ref={aiRef} data-section="ai" className="relative py-32 bg-white overflow-hidden">
            
            <div className="relative z-10">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center max-w-3xl mx-auto mb-16"
                >
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", delay: 0.2 }}
                      className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 border border-purple-200/50 text-purple-700 text-sm font-bold uppercase tracking-wider mb-6 shadow-sm"
                    >
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                        >
                            <Bot size={16} className="text-purple-600" />
                        </motion.div>
                        <span>AI Agent Powered by RAG</span>
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="w-2 h-2 rounded-full bg-green-500"
                        />
                    </motion.div>
                    
                    <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
                        Your HR Department<br />
                        <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                            Available 24/7
                        </span>
                    </h2>
                    <p className="text-xl text-slate-600 leading-relaxed">
                        Don't dig through folders. Just ask. Our AI understands your roster, contracts, and Swiss holidays. 
                        It's like having an HR director in your pocket.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left: Features Grid */}
                    <div className="space-y-6">
                        {aiFeatures.map((feature, i) => {
                            const Icon = feature.icon;
                            const colorClasses = {
                                purple: "from-purple-50 to-pink-50 border-purple-200 text-purple-700",
                                blue: "from-blue-50 to-indigo-50 border-blue-200 text-blue-700",
                                green: "from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700",
                                orange: "from-orange-50 to-amber-50 border-orange-200 text-orange-700"
                            };
                            
                            return (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, x: -20 }}
                                  whileInView={{ opacity: 1, x: 0 }}
                                  viewport={{ once: true }}
                                  transition={{ delay: i * 0.1 }}
                                  className={`p-4 rounded-xl bg-gradient-to-r ${colorClasses[feature.color]} border backdrop-blur-sm shadow-sm flex items-center gap-4`}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">
                                        <Icon size={20} />
                </div>
                                    <span className="font-medium text-slate-800">{feature.text}</span>
                                </motion.div>
                            );
                        })}
                        
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.5 }}
                          className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200/50 backdrop-blur-sm"
                        >
                            <div className="flex items-start gap-4">
                                <TrendingUp className="text-purple-600 flex-shrink-0 mt-1" size={24} />
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-2">Real-time Intelligence</h4>
                                    <p className="text-sm text-slate-600">
                                        The AI agent continuously learns from your scheduling patterns, 
                                        compliance requirements, and team preferences to provide increasingly accurate suggestions.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right: Enhanced Chat Interface */}
                    <div className="relative">
                        {/* Animated Background Blobs */}
                        <motion.div 
                          animate={{ 
                            scale: [1, 1.2, 1],
                            x: [0, 20, 0],
                            y: [0, -20, 0]
                          }}
                          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                          className="absolute top-0 right-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -z-10"
                        />
                        <motion.div 
                          animate={{ 
                            scale: [1, 1.3, 1],
                            x: [0, -30, 0],
                            y: [0, 30, 0]
                          }}
                          transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
                          className="absolute bottom-0 left-0 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -z-10"
                        />
                        <motion.div 
                          animate={{ 
                            scale: [1, 1.1, 1],
                            x: [0, 15, 0],
                            y: [0, 15, 0]
                          }}
                          transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
                          className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -z-10 transform -translate-x-1/2 -translate-y-1/2"
                        />

                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-6 relative z-10"
                        >
                            {/* Chat Header */}
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                                <motion.div
                                  animate={{ scale: [1, 1.1, 1] }}
                                  transition={{ repeat: Infinity, duration: 2 }}
                                  className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg"
                                >
                                    <Bot size={20} />
                                </motion.div>
                                <div>
                                    <h4 className="font-bold text-slate-900">AI Assistant</h4>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Online • Analyzing your data
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 min-h-[300px]">
                                {/* User Message */}
                                <AnimatePresence>
                                    {chatStep >= 1 && (
                                        <motion.div 
                                          initial={{ opacity: 0, x: 20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          exit={{ opacity: 0 }}
                                          className="flex gap-3 items-end justify-end"
                                        >
                                            <div className="bg-slate-100 text-slate-700 px-4 py-3 rounded-2xl rounded-br-sm text-sm max-w-[80%] shadow-sm">
                                    Can Dr. Weber take the night shift on the 24th?
                                </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* AI Thinking Indicator */}
                                <AnimatePresence>
                                    {chatStep >= 2 && chatStep < 3 && (
                                        <motion.div
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          exit={{ opacity: 0 }}
                                          className="flex gap-3 items-center"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white flex-shrink-0">
                                                <Bot size={14} />
                            </div>
                                            <div className="bg-purple-50 border border-purple-100 px-4 py-3 rounded-2xl rounded-bl-sm text-xs text-purple-700 flex items-center gap-2">
                                                <motion.div
                                                  animate={{ rotate: 360 }}
                                                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                                  className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full"
                                                />
                                                Analyzing schedules, contracts, and SECO regulations...
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* AI Response */}
                                <AnimatePresence>
                                    {chatStep >= 3 && (
                                        <motion.div
                                          initial={{ opacity: 0, x: -20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          exit={{ opacity: 0 }}
                                          className="flex gap-3 items-end"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white flex-shrink-0 shadow-lg">
                                                <Bot size={14} />
                                </div>
                                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 text-purple-900 border border-purple-200 px-4 py-3 rounded-2xl rounded-bl-sm text-sm max-w-[85%] shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <AlertCircle size={14} className="text-amber-500" />
                                                    <p className="font-semibold">Warning: Compliance Risk</p>
                                                </div>
                                                <p className="opacity-90 mb-3">
                                                    Dr. Weber is scheduled for a training seminar at 08:00 the next day. 
                                                    This would violate the mandatory 11h rest period (SECO Art. 73).
                                                </p>
                                    
                                    <div className="mt-3 pt-3 border-t border-purple-200">
                                                    <p className="text-xs font-semibold mb-2 text-purple-700">Suggested Alternative:</p>
                                        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-purple-100">
                                            <Avatar name="Sarah" color="bg-emerald-500" className="w-5 h-5"/>
                                                        <span className="text-xs text-slate-700">Sarah is available and rested. 98% match.</span>
                                        </div>
                                    </div>
                                </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                        </div>

                        {/* Input Area */}
                        <div className="mt-6 relative">
                            <input 
                                type="text" 
                                disabled
                                    placeholder="Ask about schedules, payroll, compliance..." 
                                    className="w-full bg-gradient-to-r from-slate-50 to-purple-50/30 border border-purple-200/50 rounded-xl py-3 px-4 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-300"
                                />
                                <motion.button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="absolute right-2 top-2 p-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-lg"
                                >
                                    <ArrowRight size={16} />
                                </motion.button>
                        </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// --- Trust Bar Component ---

const TrustBar = () => {
    return (
        <section data-section="trust" className="relative py-12 bg-white border-y border-slate-100/50 z-10">
            <div>
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex flex-wrap justify-center items-center gap-16 md:gap-32"
                >
                    <motion.img 
                      whileHover={{ scale: 1.1 }}
                      src="https://assets.onedoc.ch/images/groups/233046662f84ce9a70aaf7dbadf02b6de290d4c613fffd0ac40e38709e28e404-small.png" 
                      alt="Trusted Partner" 
                      className="h-16 w-auto object-contain opacity-60 hover:opacity-100 transition-opacity" 
                    />
                    <motion.img 
                      whileHover={{ scale: 1.1 }}
                      src="https://www.pikpng.com/pngl/b/577-5770945_switzerland-global-value-propositions-confdration-suisse-clipart.png" 
                      alt="Swiss Confederation" 
                      className="h-20 w-auto object-contain opacity-60 hover:opacity-100 transition-opacity" 
                    />
                    <motion.img 
                      whileHover={{ scale: 1.1 }}
                      src="https://assets.onedoc.ch/images/entities/b76d5e33eab4aa7bd5940f08ef50511e7e4c6c1227ebb9491d4d16b97f2637e0-medium.png" 
                      alt="Trusted Partner" 
                      className="h-20 w-auto object-contain opacity-60 hover:opacity-100 transition-opacity" 
                    />
                </motion.div>
            </div>
        </section>
    );
};

// --- Enhanced Feature Grid (Asymmetrical) ---

const EnhancedFeatureGrid = () => {
    return (
        <section data-section="enhanced-features" className="relative py-24 bg-white overflow-hidden">
            <div className="relative z-10">
                <div className="max-w-3xl mx-auto text-center mb-20">
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6"
                    >
                        Why Choose <span className="text-blue-600 underline decoration-blue-100 underline-offset-8">MediShift</span>
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 }}
                      className="text-lg text-slate-600 font-medium"
                    >
                        Built for Swiss healthcare professionals, by healthcare professionals. One platform for the entire workforce lifecycle.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-12 gap-8">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className="md:col-span-8 group p-8 lg:p-12 rounded-[2.5rem] bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 flex flex-col lg:flex-row gap-10 items-center"
                    >
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                            <Zap size={32} />
            </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">Internal Optimization (SaaS)</h3>
                            <p className="text-lg text-slate-600 font-medium leading-relaxed">
                                Powered by the Calendar and Team engines. AI Auto-Rostering respects legal rest times (ArG), skill mix, and fair distribution. 
                                Automate shift swaps and leave requests without admin intervention.
                            </p>
          </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      className="md:col-span-4 group p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl transition-all duration-500 hover:-translate-y-2 flex flex-col justify-between overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-green-400 mb-8 relative z-10">
                            <Lock size={24} />
          </div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold text-white mb-3">External Liquidity (Marketplace)</h3>
                            <p className="text-slate-400 font-medium text-sm leading-relaxed">
                                Powered by the Marketplace and Recruitment engines. Instant gap resolution with verified external talent. 
                                Every profile verified against GLN, UID, and NAREG registries.
                            </p>
          </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 }}
                      className="md:col-span-4 group p-8 rounded-[2.5rem] bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                            <CalendarIcon size={24} />
        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Network Intelligence (Organization)</h3>
                        <p className="text-slate-600 font-medium text-sm leading-relaxed">
                            For Hospital Groups and Cantonal Networks. Predict load across facilities and dispatch floaters to where the need is highest. 
                            Automate cross-charging between wards or sites.
                        </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 }}
                      className="md:col-span-4 group p-8 rounded-[2.5rem] bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                            <FileCheck size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">SECO & ArG Automation</h3>
                        <p className="text-slate-600 font-medium text-sm leading-relaxed">
                            Generate SECO-compliant reports instantly. The system prevents scheduling that violates federal rest periods or maximum weekly hours.
                        </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 }}
                      className="md:col-span-4 group p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl hover:shadow-blue-200 transition-all duration-500 hover:-translate-y-2 flex flex-col justify-between"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white mb-8">
                            <Rocket size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-3">Wage Protection (LSE/GAV)</h3>
                            <p className="text-blue-100 font-medium text-sm leading-relaxed">
                                Never fear 'Wage Dumping.' Our engine calculates period variables against local GAV (Collective Labor Agreements) in real-time.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

// --- Dual Persona Section ---

const DualPersonaSection = () => {
    return (
        <section data-section="persona" className="relative py-24 bg-white overflow-hidden">
            <div className="relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[4rem] p-12 lg:p-20 relative overflow-hidden shadow-2xl"
                >
                    <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                        <svg viewBox="0 0 400 400" className="w-full h-full text-blue-500 fill-current">
                            <circle cx="400" cy="0" r="400" />
                        </svg>
                    </div>
                    <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-blue-600 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>

                    <div className="grid lg:grid-cols-2 gap-20 items-center relative z-10 text-white text-left">
                        <div>
                        <h2 className="text-4xl lg:text-5xl font-bold mb-8 leading-tight">
                            Built for <span className="text-blue-500">Everyone</span>
                        </h2>
                        <p className="text-xl text-slate-400 mb-10 leading-relaxed font-medium">
                            Whether you're a healthcare facility or a professional, we've built the perfect solution for you. 
                            One platform uniting internal Team Management with an On-Demand Staffing Marketplace.
                        </p>

                            <div className="space-y-6">
                                <motion.a
                                  href="#"
                                  whileHover={{ x: 5 }}
                                  className="block group"
                                >
                                    <div className="flex gap-4 items-center p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                                            <Building2 size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                                </span>
                                                <h4 className="text-lg font-bold text-white">For Facilities</h4>
                                            </div>
                                            <p className="text-slate-500 text-sm">Post shifts, find qualified professionals, manage your team</p>
                                        </div>
                                        <ArrowRight className="text-blue-500 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </motion.a>

                                <motion.a
                                  href="#"
                                  whileHover={{ x: 5 }}
                                  className="block group"
                                >
                                    <div className="flex gap-4 items-center p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
                                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                            <User size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                                </span>
                                                <h4 className="text-lg font-bold text-white">For Professionals</h4>
                                            </div>
                                            <p className="text-slate-500 text-sm">Find flexible work, set your availability, get paid on time</p>
                                        </div>
                                        <ArrowRight className="text-white group-hover:translate-x-1 transition-transform opacity-50 group-hover:opacity-100" />
                                    </div>
                                </motion.a>
                            </div>
                        </div>

                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] p-12 text-center relative overflow-hidden shadow-2xl"
                        >
                            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                            <Rocket size={80} className="mx-auto mb-8 text-blue-200 opacity-50" />

                            <div className="relative z-10">
                                <h3 className="text-3xl font-bold mb-6 text-white">Get Started Today</h3>
                                <p className="text-lg font-medium text-blue-100 mb-8 leading-relaxed">
                                    Join hundreds of healthcare facilities and professionals already using MediShift
                                </p>
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="w-full py-4 bg-white text-blue-600 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2"
                                >
                                    Sign Up Free
                                    <ArrowRight />
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

// --- Security & Swiss Made Section ---

const SecuritySection = () => {
    return (
        <section data-section="security" className="relative py-24 bg-white overflow-hidden">
            <div>
                <div className="flex flex-col lg:flex-row items-center gap-20">
                    <div className="flex-1">
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-bold tracking-wider uppercase mb-8 shadow-sm"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                            </span>
                            Swiss Made
                        </motion.div>
                        <motion.h2
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.1 }}
                          className="text-4xl lg:text-5xl font-bold text-slate-900 mb-8 leading-tight"
                        >
                            Regulatory Armor for <span className="text-red-500">Swiss Healthcare</span>
                        </motion.h2>
                        <motion.p
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.2 }}
                          className="text-xl text-slate-600 mb-12 leading-relaxed font-medium"
                        >
                            In a market defined by strict labor laws, our platform is your compliance officer. 
                            Your data is protected by Swiss law, hosted in Zurich, and encrypted end-to-end. 
                            We're GDPR compliant and ISO 27001 certified.
                        </motion.p>

                        <div className="grid sm:grid-cols-2 gap-8">
                            {[
                                { icon: Server, title: "Data Sovereignty", desc: "100% Swiss Hosting (Data never leaves CH)" },
                                { icon: Shield, title: "Identity Management", desc: "SSO Support for Azure AD, OKTA, and Google Workspace" },
                                { icon: Lock, title: "Connectivity", desc: "REST API for bi-directional sync with ERPs (SAP, Opale)" },
                                { icon: Code, title: "AI Processing", desc: "OCR for document extraction and Parsing for CV analysis" }
                            ].map((item, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, y: 20 }}
                                  whileInView={{ opacity: 1, y: 0 }}
                                  viewport={{ once: true }}
                                  transition={{ delay: 0.3 + i * 0.1 }}
                                  className="flex gap-4 items-start group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                                        <item.icon size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 mb-1">{item.title}</h4>
                                        <p className="text-sm text-slate-600 font-medium">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      className="flex-1 relative"
                    >
                        <div className="relative w-full max-w-lg mx-auto aspect-square bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-12 flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:24px_24px]"></div>

                            <div className="relative z-10 flex flex-col items-center">
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  className="w-48 h-48 lg:w-64 lg:h-64 bg-gradient-to-br from-red-600 to-red-700 rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-12 relative group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-[2.5rem]"></div>
                                    <svg viewBox="0 0 100 100" className="w-32 h-32 lg:w-40 lg:h-40 text-white fill-current drop-shadow-2xl">
                                        <rect x="41" y="15" width="18" height="70" rx="3" />
                                        <rect x="15" y="41" width="70" height="18" rx="3" />
                                    </svg>
                                </motion.div>
                                <div className="flex gap-4 justify-center">
                                    <div className="px-6 py-2.5 bg-slate-900 text-white rounded-full shadow-lg text-xs font-bold tracking-widest uppercase flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        SECURE
                                    </div>
                                    <div className="px-6 py-2.5 bg-white text-slate-900 rounded-full shadow-lg border border-slate-100 text-xs font-bold tracking-widest uppercase flex items-center gap-2">
                                        <Lock size={12} className="text-slate-400" />
                                        ENCRYPTED
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

// --- Why Choose Us Section ---

const WhyChooseUsSection = () => {
    const features = [
        {
            title: "For Facilities",
            subtitle: "Free marketplace access",
            desc: "Post unlimited shifts, access the full talent pool, and hire qualified professionals—all at no cost. No registration fees, no commissions.",
            icon: Building2,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            title: "For Professionals",
            subtitle: "Free marketplace access",
            desc: "Create your profile for free, browse all available shifts, and accept missions with zero fees. Your earnings are yours to keep.",
            icon: User,
            color: "text-purple-600",
            bg: "bg-purple-50"
        },
        {
            title: "Transparent Pricing",
            subtitle: "No hidden costs",
            desc: "What you see is what you get. No subscription fees, no per-transaction charges, no surprise costs. Free marketplace access for everyone.",
            icon: Users,
            color: "text-green-600",
            bg: "bg-green-50"
        }
    ];

    return (
        <section data-section="why-choose" className="relative py-24 bg-white overflow-hidden">
            <div className="relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center max-w-3xl mx-auto mb-20"
                >
                    <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
                        Why Choose Us
                    </h2>
                    <h3 className="text-3xl lg:text-4xl font-bold text-blue-600 mb-4">
                        Free Access to the Marketplace. Forever.
                    </h3>
                    <p className="text-lg text-slate-600 font-medium leading-relaxed">
                        Both professionals and facilities get free access to our marketplace. No hidden fees, no commissions, no surprises. Simple and transparent.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((card, idx) => {
                        const Icon = card.icon;
                        return (
                            <motion.a
                              key={idx}
                              href="#"
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: idx * 0.1 }}
                              whileHover={{ y: -5 }}
                              className="group block"
                            >
                                <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-xl transition-all duration-300 h-full">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 ${card.bg} ${card.color}`}>
                                        <Icon size={30} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">{card.subtitle}</div>
                                        <h3 className="text-xl font-bold mb-3 text-slate-900">{card.title}</h3>
                                        <p className="text-slate-600 leading-relaxed text-sm">{card.desc}</p>
                                    </div>
                                </div>
                            </motion.a>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

// --- Main Layout ---

export default function HealthcareLandingLight() {
  return (
    <div className="bg-white min-h-screen font-sans selection:bg-blue-100 selection:text-blue-900 relative">
      <ScrollingThread />
      <main className="relative">
        <InteractiveCalendarHero />
        
        {/* Trust Bar */}
        <TrustBar />
        
        {/* Scroll Connector 1: Hero to Features */}
        <div className="relative h-40 -mt-20 mb-20">
          <ScrollConnector 
            context="Smart Features"
            color="blue"
          />
        </div>
        
        <FeatureGrid />
        
        {/* Enhanced Feature Grid - Asymmetrical */}
        <EnhancedFeatureGrid />
        
        {/* Scroll Connector 2: Features to AI */}
        <div className="relative h-40 -mt-20 mb-20">
          <ScrollConnector 
            context="AI Agent"
            color="purple"
          />
                </div>
        
        <AIChatSection />
        
        {/* Dual Persona Section */}
        <DualPersonaSection />
        
        {/* Why Choose Us Section */}
        <WhyChooseUsSection />
        
        {/* Security & Swiss Made Section */}
        <SecuritySection />
        
        {/* Enhanced CTA Footer with Gradient */}
        <section data-section="cta" className="relative py-32 bg-white overflow-hidden">
            <div className="text-center relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="space-y-8"
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                        Ready to Transform Your<br />
                        <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                            Healthcare Staffing?
                        </span>
                    </h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Join facilities and professionals already using AI-powered scheduling
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all shadow-xl shadow-blue-200 text-lg"
                        >
                            Get Started Free
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-8 py-4 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-700 border-2 border-slate-200 rounded-xl font-medium transition-all shadow-lg text-lg"
                        >
                            Schedule Demo
                        </motion.button>
                    </div>
                    <div className="flex flex-wrap justify-center gap-6 mt-12 pt-8 border-t border-slate-200">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <CheckCircle2 size={16} className="text-green-500" />
                            <span>50+ Facilities</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Shield size={16} className="text-blue-500" />
                            <span>ISO 27001 Certified</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Globe size={16} className="text-purple-500" />
                            <span>Hosted in Zurich</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
      </main>

    </div>
  );
}