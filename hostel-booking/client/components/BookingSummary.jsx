// COMPONENT: Step 3 - Booking Summary & Security Check
// DESIGN: Modern "Split-Ticket" Checkout Layout
// FEATURES: Visual Invoice, Custom Captcha, Secure Payment Gateway Handoff

const { useState, useEffect } = React;

const BookingSummary = ({ student, bookingData, onBack, onNext }) => {
    
    // --- STATE ---
    const [captchaCode, setCaptchaCode] = useState('');
    const [userInput, setUserInput] = useState('');
    const [isValid, setIsValid] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // --- PRICING LOGIC ---
    const calculateFee = () => {
        const { seater, isAC, hostelCode } = bookingData;
        // Premium Wing Logic
        if (hostelCode?.code?.includes('WING')) return 75000;
        // Standard Logic
        if (isAC) return 80000;
        if (seater === 1) return 55000;
        if (seater === 2) return 45000;
        return 35000;
    };

    const semesterFee = calculateFee();
    const securityDeposit = 5000;
    const totalFee = semesterFee + securityDeposit;

    // --- CAPTCHA ENGINE ---
    const generateCaptcha = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        setCaptchaCode(result);
        setUserInput('');
        setIsValid(false);
    };

    useEffect(() => { generateCaptcha(); }, []);

    const handleInput = (e) => {
        const val = e.target.value.toUpperCase();
        setUserInput(val);
        setIsValid(val === captchaCode);
    };

    return (
        <div className="min-h-screen bg-[#f3f4f6] flex justify-center items-center p-4 fade-in">
            
            {/* MAIN CONTAINER: Split Layout (Ticket Style) */}
            <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto md:h-[550px]">
                
                {/* --- LEFT PANEL: THE TICKET (Summary) --- */}
                <div className="bg-[#720026] p-10 md:w-[40%] text-white flex flex-col relative overflow-hidden">
                    
                    {/* Background Texture */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full -ml-20 -mb-20 pointer-events-none"></div>

                    {/* Header */}
                    <div className="relative z-10 mb-8">
                        <div className="flex items-center gap-3 opacity-80 mb-2">
                            <i className="fas fa-receipt text-lg"></i>
                            <span className="text-xs font-bold uppercase tracking-widest">Booking Summary</span>
                        </div>
                        <h1 className="text-3xl font-bold leading-tight">Review Order</h1>
                    </div>

                    {/* Ticket Details */}
                    <div className="relative z-10 flex-1 space-y-6">
                        
                        {/* Hostel Info */}
                        <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                            <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">Selected Hostel</div>
                            <div className="text-xl font-bold">{bookingData?.hostelCode?.name || 'Hostel'}</div>
                            <div className="flex items-center gap-2 mt-2 text-xs font-medium text-green-300">
                                <i className="fas fa-check-circle"></i> {bookingData?.hostelCode?.bedsLeft} Beds Available
                            </div>
                        </div>

                        {/* Configuration */}
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <div>
                                <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">Occupancy</div>
                                <div className="font-bold text-lg">{bookingData?.seater} Seater</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">Comfort</div>
                                <div className="font-bold text-lg">{bookingData?.isAC ? 'AC' : 'Non-AC'}</div>
                            </div>
                        </div>

                        {/* Price Breakdown */}
                        <div className="space-y-2 text-sm opacity-90">
                            <div className="flex justify-between">
                                <span>Semester Fee</span>
                                <span>₹{semesterFee.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Security Deposit</span>
                                <span>₹{securityDeposit.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Total */}
                    <div className="relative z-10 mt-auto pt-6 border-t border-white/20">
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-medium opacity-80">Total Payable</span>
                            <span className="text-3xl font-bold text-[#ffc400]">₹{totalFee.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT PANEL: THE GATEKEEPER (Captcha) --- */}
                <div className="p-10 md:w-[60%] bg-white flex flex-col relative">
                    
                    {/* Header with Navigation */}
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Security Check</h2>
                            <p className="text-sm text-gray-500 mt-1">Verify you are human to lock this room.</p>
                        </div>
                        <button onClick={onBack} className="text-gray-400 hover:text-[#720026] text-xs font-bold uppercase flex items-center gap-2 transition-colors">
                            <i className="fas fa-arrow-left"></i> Edit Selection
                        </button>
                    </div>

                    {/* Central Content */}
                    <div className="flex-1 flex flex-col justify-center items-center w-full max-w-md mx-auto">
                        
                        {/* Captcha Card */}
                        <div className="w-full bg-gray-50 rounded-2xl border border-gray-200 p-6 mb-6 relative group hover:border-[#720026]/30 transition-colors">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Security Code</label>
                                <button onClick={generateCaptcha} className="text-gray-400 hover:text-[#720026] transition-colors" title="Refresh">
                                    <i className="fas fa-sync-alt"></i>
                                </button>
                            </div>
                            
                            {/* The Code Display */}
                            <div className="bg-white h-20 rounded-xl border border-gray-200 flex items-center justify-center relative overflow-hidden mb-6 select-none">
                                {/* Noise Overlay */}
                                <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '4px 4px'}}></div>
                                {/* Strike Line */}
                                <div className="absolute w-full h-0.5 bg-gray-300 transform -rotate-6"></div>
                                <div className="text-4xl font-mono font-black tracking-[0.5em] text-gray-700 z-10">
                                    {captchaCode}
                                </div>
                            </div>

                            {/* Input Field */}
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={userInput}
                                    onChange={handleInput}
                                    maxLength={6}
                                    placeholder="ENTER CODE"
                                    className={`
                                        w-full h-14 pl-12 pr-4 rounded-xl border-2 font-bold tracking-widest text-lg outline-none transition-all text-center uppercase
                                        ${isValid 
                                            ? 'border-green-500 bg-green-50/50 text-green-800 focus:ring-4 focus:ring-green-100' 
                                            : 'border-gray-300 bg-white text-gray-800 focus:border-[#720026] focus:ring-4 focus:ring-[#720026]/10'}
                                    `}
                                />
                                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <i className={`fas ${isValid ? 'fa-check-circle text-green-500' : 'fa-keyboard'} text-xl`}></i>
                                </div>
                            </div>
                        </div>

                        {/* Warning */}
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
                            <i className="fas fa-clock"></i>
                            <span>Session expires in 10:00 minutes</span>
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="mt-auto pt-6 border-t border-gray-100 flex justify-end">
                        <button 
                            onClick={() => onNext({ ...bookingData, price: totalFee })}
                            disabled={!isValid || isProcessing}
                            className={`
                                px-10 py-4 rounded-xl font-bold text-white shadow-lg flex items-center gap-3 transition-all
                                ${isValid 
                                    ? 'bg-[#720026] hover:bg-[#5a001e] hover:shadow-xl hover:-translate-y-0.5 cursor-pointer' 
                                    : 'bg-gray-300 cursor-not-allowed'}
                            `}
                        >
                            {isProcessing ? (
                                <>
                                    <i className="fas fa-circle-notch fa-spin"></i> Processing...
                                </>
                            ) : (
                                <>
                                    PAYMENT GATEWAY <i className="fas fa-chevron-right"></i>
                                </>
                            )}
                        </button>
                    </div>

                </div>

            </div>
        </div>
    );
};