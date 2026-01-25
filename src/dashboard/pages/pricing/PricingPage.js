
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCheck, FiX, FiStar, FiZap, FiLayout, FiTrendingUp } from 'react-icons/fi';
import { cn } from '../../../utils/cn';
import Button from '../../../components/BoxedInputFields/Button';

const PricingPage = () => {
    const { t } = useTranslation(['common']);
    const [billingCycle, setBillingCycle] = useState('yearly'); // 'monthly' | 'yearly'

    const plans = [
        {
            id: 'free',
            name: 'Free',
            subtitle: 'Perfect for trying out clipizy',
            price: { monthly: 0, yearly: 0 },
            features: [
                { text: '60 Credits Included', included: true },
                { text: '720p Max', included: true },
                { text: '500 MB Cloud Storage', included: true },
                { text: 'Community Support', included: true },
                { text: 'Watermark on exports', included: false, negative: true }, // Screenshot shows X Checkmark on exports? "Watermark on exports" with a green check or red X? 
                // Screenshot: Green check "Watermark on exports" -> wait, usually free has watermark. 
                // Screenshot shows: "Watermark on exports" with Green Check (idx 5) AND "Watermark on exports" with Red X (idx 6). 
                // Wait, the screenshot shows:
                // Check: Watermark on exports
                // X: Watermark on exports
                // That seems contradictory or I'm misreading.
                // Let's assume Free HAS watermark. Ideally "No Watermark" is the feature.
                // Screenshot:
                // Check "Watermark on exports" (This means it HAS watermark)
                // Red X "Watermark on exports" (Maybe this lines up with 'No Watermark' in other tiers?)
                // Let's look at Tier 1: "1080p Full HD (No Watermark)".
                // So Free Tier probably has checks for what you GET.
                // Let's list "Watermark on exports" as included (so yes, you get a watermark).
                { text: 'Watermark on exports', included: true }
            ],
            isPopular: false,
            color: 'slate'
        },
        {
            id: 'creator',
            name: 'Tier 1: Creator',
            subtitle: 'Perfect for content creators and influencers',
            price: { monthly: 25, yearly: 20 },
            features: [
                { text: '1,500 Credits Included', included: true },
                { text: '1080p Full HD (No Watermark)', included: true },
                { text: '10 GB Cloud Storage', included: true },
                { text: 'Video Automation Access', sub: '(Scheduling Only)', included: true },
                { text: 'Commercial Licensing', included: true },
                { text: 'Email Support (Standard SLA)', included: true }
            ],
            isPopular: true,
            color: 'blue' // "tertiary" gradient will apply here
        },
        {
            id: 'pro',
            name: 'Tier 2: Pro',
            subtitle: 'For professional creators and agencies',
            price: { monthly: 59, yearly: 49 },
            features: [
                { text: '5,000 Credits Included', included: true },
                { text: '1080p Full HD', included: true },
                { text: '50 GB Cloud Storage', included: true },
                { text: 'Video Automation Access', sub: '(Auto-Upload Included)', included: true },
                { text: '1 Upload/Day Automated', included: true },
                { text: 'Email Support (Standard SLA)', included: true }
            ],
            isPopular: false,
            color: 'slate',
            badge: 'Release Soon!'
        },
        {
            id: 'business',
            name: 'Tier 3: Business',
            subtitle: 'For large teams and organizations',
            price: { monthly: 119, yearly: 99 },
            features: [
                { text: '12,500 Credits Included', included: true },
                { text: '1080p Full HD', included: true },
                { text: '150 GB Cloud Storage', included: true },
                { text: 'Premium Model LLM', included: true },
                { text: 'Video Automation Access', sub: '(Advanced Queue)', included: true },
                { text: '5 Uploads/Day Automated', included: true },
                { text: 'Priority Queue Access', included: true },
                { text: 'Priority Email Support', included: true }
            ],
            isPopular: false,
            color: 'slate',
            badge: 'Release Soon!'
        }
    ];

    return (
        <div className="min-h-full w-full flex flex-col items-center py-12 px-4 relative overflow-hidden">
            {/* Background with requested animated gradient */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-[#0f172a]" /> {/* Dark base */}
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        background: 'linear-gradient(135deg, #4f46e5 0%, #ec4899 50%, #8b5cf6 100%)', // Purple-Pink-Blue "tertiary" feel
                        filter: 'blur(100px)',
                        animation: 'pulse-slow 8s ease-in-out infinite alternate'
                    }}
                />
                {/* Animated Orbs */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
            </div>

            <style>{`
        @keyframes pulse-slow {
          0% { opacity: 0.2; transform: scale(1); }
          100% { opacity: 0.4; transform: scale(1.1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>

            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-12 animate-in slide-in-from-bottom-5 fade-in duration-700">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-pink-300 mb-6 backdrop-blur-sm shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                    <FiZap className="w-4 h-4" />
                    <span>PRICING & CREDITS</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                    Subscription Plans
                </h1>
                <p className="text-lg text-slate-300 leading-relaxed">
                    Scale your creation with monthly plans designed for every stage of your creative journey.
                </p>

                {/* Toggle */}
                <div className="flex items-center justify-center mt-8 gap-4">
                    <span className={cn("text-sm font-medium transition-colors", billingCycle === 'monthly' ? "text-white" : "text-slate-400")}>Monthly</span>
                    <button
                        onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                        className={cn(
                            "relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50",
                            billingCycle === 'yearly' ? "bg-gradient-to-r from-pink-500 to-purple-600" : "bg-slate-700"
                        )}
                    >
                        <span
                            className={cn(
                                "absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300",
                                billingCycle === 'yearly' ? "translate-x-7" : "translate-x-0"
                            )}
                        />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-medium transition-colors", billingCycle === 'yearly' ? "text-white" : "text-slate-400")}>Yearly</span>
                        <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30">
                            SAVE 20%
                        </span>
                    </div>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-[1400px] animate-in slide-in-from-bottom-10 fade-in duration-700 delay-150">
                {plans.map((plan, index) => {
                    const isFeatured = plan.isPopular;
                    return (
                        <div
                            key={plan.id}
                            className={cn(
                                "relative flex flex-col rounded-2xl p-6 transition-all duration-300",
                                "backdrop-blur-md border",
                                isFeatured
                                    ? "bg-[#0f172a]/80 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)] transform scale-[1.02] z-10"
                                    : "bg-slate-900/40 border-slate-700/50 hover:bg-slate-900/60 hover:border-slate-600"
                            )}
                        >
                            {isFeatured && (
                                <div className="absolute -top-4 left-0 right-0 mx-auto w-max px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
                                    <FiStar className="w-3 h-3 fill-white" />
                                    Most Popular
                                </div>
                            )}

                            {plan.badge && (
                                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-bold shadow-lg transform rotate-3">
                                    {plan.badge}
                                </div>
                            )}

                            <div className="mb-6 text-center">
                                <h3 className={cn("text-lg font-bold mb-2", isFeatured ? "text-white" : "text-slate-200")}>
                                    {plan.name}
                                </h3>
                                <p className="text-xs text-slate-400 min-h-[40px] px-2">{plan.subtitle}</p>
                            </div>

                            <div className="mb-8 text-center">
                                {plan.price.monthly > 0 ? (
                                    <div className="flex items-baseline justify-center gap-2">
                                        {billingCycle === 'yearly' && (
                                            <span className="text-lg text-slate-500 line-through decoration-slate-500/50 decoration-2">
                                                ${plan.price.monthly}
                                            </span>
                                        )}
                                        <span className="text-4xl font-bold text-white">
                                            ${billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="text-4xl font-bold text-white">Free</div>
                                )}
                                {plan.price.monthly > 0 && (
                                    <div className="text-xs text-slate-400 mt-2">
                                        per month • Billed {billingCycle === 'yearly' ? 'Annually' : 'Monthly'}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-4 mb-8">
                                {plan.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        {feature.negative ? (
                                            <FiX className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        ) : (
                                            feature.included ?
                                                <FiCheck className={cn("w-5 h-5 shrink-0 mt-0.5", isFeatured ? "text-blue-400" : "text-green-500")} /> :
                                                <FiX className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                                        )}
                                        <span className={cn("text-sm", feature.included ? "text-slate-300" : "text-slate-500")}>
                                            {feature.text} {feature.sub && <span className="text-slate-500 text-xs block">{feature.sub}</span>}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <Button
                                className={cn(
                                    "w-full py-3 font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-center justify-center",
                                    isFeatured
                                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
                                        : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                                )}
                                onClick={() => { }} // Handle upgrade
                            >
                                {plan.price.monthly === 0 ? 'Current Plan' : `Upgrade to ${plan.name.split(':')[0] || 'Plan'}`}
                                {plan.price.monthly > 0 && <span className="ml-2">→</span>}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PricingPage;
