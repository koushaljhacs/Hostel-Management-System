// COMPONENT: Step 4 - Payment Gateway (IRCTC Style)
// UPDATED: Timer set to 10 minutes (600s), UPI selection triggers email OTP simulation.

const { useState, useEffect } = React;

const PaymentGateway = ({ student, bookingData, amount, onBack, onPay }) => {
    
    // --- CONFIG ---
    const INITIAL_TIMER_SECONDS = 600; // 10 minutes
    
    // --- STATE ---
    const [method, setMethod] = useState('CARD');
    const [processing, setProcessing] = useState(false);
    const [localTimer, setLocalTimer] = useState(INITIAL_TIMER_SECONDS);
    const [otpStatus, setOtpStatus] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    const convenienceFee = 23.60;
    const totalPayable = amount + convenienceFee;

    useEffect(() => {
        const interval = setInterval(() => {
            setLocalTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (method === 'UPI' && otpStatus !== 'sent') {
            setOtpStatus('sending');
            setTimeout(() => {
                setOtpStatus('sent');
            }, 1500);
        } else if (method !== 'UPI') {
            setOtpStatus(null); // Reset status if user switches tabs
        }
    }, [method]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handlePayment = async () => {
        if (processing) return;
        setProcessing(true);
        setErrorMessage('');
        try {
            await onPay(method);
        } catch (error) {
            setErrorMessage(error.message || 'Unable to proceed with payment.');
            setProcessing(false);
            return;
        }
        setProcessing(false);
    };

    // --- SUB-COMPONENTS ---

    const PaymentTab = ({ id, label, icon }) => (
        <button 
            onClick={() => setMethod(id)}
            className={`
                w-full text-left px-4 py-4 flex items-center gap-3 border-b border-gray-200 transition-colors
                ${method === id 
                    ? 'bg-white border-l-4 border-l-[#720026] text-[#720026] font-bold' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-l-4 border-l-transparent'}
            `}
        >
            <i className={`fas ${icon} w-6 text-center`}></i>
            <span className="text-sm">{label}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-[#e0e6ed] p-2 md:p-6 flex justify-center items-start fade-in">
            
            <div className="w-full max-w-[1400px] flex flex-col lg:flex-row gap-4">
                
                {/* --- LEFT & MIDDLE: PAYMENT INTERFACE --- */}
                <div className="flex-1 bg-white rounded-t-lg shadow-sm border border-gray-300 flex flex-col">
                    
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-lg">
                        <div className="font-bold text-xl text-gray-800">Payment Methods</div>
                        <div className="flex items-center gap-2 text-green-600 font-bold text-xs uppercase">
                            <i className="fas fa-shield-alt"></i> Safe & Secure
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row min-h-[400px]">
                        
                        {/* 1. LEFT SIDEBAR (Tabs) */}
                        <div className="md:w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                            <PaymentTab id="CARD" label="Credit / Debit / ATM Card" icon="fa-credit-card" />
                            <PaymentTab id="UPI" label="BHIM / UPI / QR" icon="fa-qrcode" />
                            <PaymentTab id="NET" label="Net Banking" icon="fa-university" />
                        </div>

                        {/* 2. MIDDLE AREA (Action) */}
                        <div className="flex-1 p-6 md:p-8 bg-white relative">
                            
                            {/* CARD FORM */}
                            {method === 'CARD' && (
                                <div className="space-y-6 max-w-md animate-[fadeIn_0.2s]">
                                    <div className="p-4 bg-[#fff8e1] border border-[#ffe082] rounded text-xs text-[#f57f17] leading-relaxed">
                                        <strong>Note:</strong> 1.8% + GST applicable for Credit Cards. NIL for RuPay Debit Cards.
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Card Number</label>
                                            <div className="relative">
                                                <input type="text" placeholder="XXXX XXXX XXXX XXXX" className="w-full p-3 border border-gray-300 rounded focus:border-[#720026] outline-none font-mono" />
                                                <i className="fab fa-cc-visa absolute right-3 top-3 text-2xl text-blue-800"></i>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry</label>
                                                <input type="text" placeholder="MM / YY" className="w-full p-3 border border-gray-300 rounded focus:border-[#720026] outline-none text-center" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CVV</label>
                                                <input type="password" placeholder="123" className="w-full p-3 border border-gray-300 rounded focus:border-[#720026] outline-none text-center" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name on Card</label>
                                            <input type="text" placeholder={student?.fullName} className="w-full p-3 border border-gray-300 rounded focus:border-[#720026] outline-none" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* UPI FORM (With OTP Logic) */}
                            {method === 'UPI' && (
                                <div className="flex flex-col items-center justify-center h-full animate-[fadeIn_0.2s]">
                                    
                                    {otpStatus === 'sending' && (
                                        <div className="flex flex-col items-center">
                                            <i className="fas fa-paper-plane text-4xl text-blue-500 animate-pulse mb-3"></i>
                                            <p className="text-sm text-gray-600 font-bold">Sending Secure Transaction OTP...</p>
                                            <p className="text-xs text-gray-400 mt-1">Check email: {student?.email || 'email@example.com'}</p>
                                        </div>
                                    )}

                                    {otpStatus === 'sent' && (
                                        <div className="w-full max-w-sm">
                                            <div className="bg-green-50 text-green-700 text-xs p-3 rounded-lg border border-green-200 text-center mb-4">
                                                <i className="fas fa-check-circle mr-1"></i> OTP sent! Scan QR code to authenticate.
                                            </div>

                                            <div className="bg-white p-4 border-2 border-gray-800 rounded-lg mb-4 shadow-xl">
                                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=HMS_PAYMENT_TEST" alt="QR" className="opacity-80 mx-auto" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-700 mb-4 text-center">Scan with any UPI App</p>
                                            <div className="w-full max-w-xs mt-4 mx-auto">
                                                <input type="text" placeholder="Enter VPA (e.g. user@upi)" className="w-full p-3 border border-gray-300 rounded focus:border-[#720026] outline-none text-center text-sm" />
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}

                            {/* NETBANKING FORM */}
                            {method === 'NET' && (
                                <div className="grid grid-cols-3 gap-4 animate-[fadeIn_0.2s]">
                                    {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'AXIS Bank', 'Kotak Bank', 'PNB'].map(bank => (
                                        <button key={bank} className="p-4 border border-gray-200 rounded hover:border-[#720026] hover:bg-[#720026]/5 text-sm font-bold text-gray-600">
                                            {bank}
                                        </button>
                                    ))}
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Footer Action */}
                        <div className="bg-gray-100 p-4 border-t border-gray-300 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            {errorMessage && (
                                <div className="text-sm text-red-600 font-bold">{errorMessage}</div>
                            )}
                        <button 
                            onClick={onBack}
                            className="px-6 py-2 border border-gray-400 bg-white text-gray-700 font-bold rounded hover:bg-gray-50"
                        >
                            Back
                        </button>
                        <button 
                            onClick={handlePayment}
                                disabled={processing || localTimer === 0}
                            className={`
                                px-10 py-3 rounded font-bold text-white shadow-md uppercase tracking-wide transition-all mt-2 md:mt-0
                                ${processing || localTimer === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#fb792b] hover:bg-[#e66012]'}
                            `}
                        >
                                {processing ? 'Processing...' : `Pay & Book ₹${totalPayable.toLocaleString()}`}
                        </button>
                    </div>

                </div>

                {/* --- RIGHT: BOOKING SUMMARY --- */}
                <div className="lg:w-[350px] flex-shrink-0">
                    
                    <div className="bg-[#720026] text-white p-3 rounded-t-lg font-bold text-sm uppercase tracking-wider flex justify-between items-center">
                        <span>Booking Summary</span>
                        <span className={`bg-white/20 px-2 py-0.5 rounded text-xs ${localTimer <= 60 ? 'text-red-300 animate-pulse' : ''}`}>
                            TIME LEFT: {formatTime(localTimer)}
                        </span>
                    </div>

                    <div className="bg-white border-x border-b border-gray-300 shadow-sm">
                        
                        {/* Hostel Details */}
                        <div className="p-4 border-b border-dashed border-gray-300">
                            <div className="flex justify-between font-bold text-gray-800 text-sm mb-1">
                                <span>{bookingData?.hostel?.hostel_name || bookingData?.hostel?.name}</span>
                                <span className="text-[#720026] text-xs">{bookingData?.hostel?.hostel_code || bookingData?.hostel?.code}</span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                <span>{bookingData?.seater} Seater</span>
                                <span>•</span>
                                <span>{bookingData?.isAC ? 'AC' : 'Non-AC'}</span>
                            </div>
                            <div className="mt-2 text-[10px] font-mono bg-gray-100 p-1.5 rounded text-gray-600">
                                Boarding Date: {new Date().toLocaleDateString()}
                            </div>
                        </div>

                        {/* Student Details */}
                        <div className="p-4 border-b border-gray-200">
                            <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Passenger / Student</div>
                            <div className="text-sm font-bold text-gray-800">1. {student?.fullName}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{student?.gender} | {student?.rollNo}</div>
                        </div>

                        {/* Contact */}
                        <div className="p-4 border-b border-gray-200 bg-[#fcfcfc]">
                            <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Contact Details</div>
                            <div className="text-xs text-gray-600 truncate">Email: {student?.email || 'student@hms.com'}</div>
                        </div>

                        {/* Fare Summary */}
                        <div className="p-4">
                            <div className="text-sm font-bold text-gray-700 mb-3">Fare Summary</div>
                            
                            <div className="flex justify-between text-xs text-gray-600 mb-2">
                                <span>Hostel Fee</span>
                                <span className="font-mono">₹ {amount.toLocaleString()}.00</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-600 mb-2">
                                <span>Convenience Fee</span>
                                <span className="font-mono">₹ {convenienceFee.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center bg-[#720026] text-white p-3 rounded shadow-sm mt-2">
                                <span className="text-xs font-bold uppercase">Total Payable</span>
                                <span className="text-lg font-bold">₹ {totalPayable.toLocaleString()}</span>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};