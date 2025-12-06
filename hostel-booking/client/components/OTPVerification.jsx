// COMPONENT: Step 4 - OTP Verification Screen
// DISPLAYS: Centralized Timer

const { useState, useEffect } = React;

const OTPVerification = ({ student, timer, onBack, onVerify, isProcessing }) => {
    const [otpInput, setOtpInput] = useState(new Array(6).fill(''));
    const [isVerifying, setIsVerifying] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
    const email = student?.email || 'student@hms.com';
    const isOTPComplete = otpInput.every(digit => digit !== '');

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Handle single input changes
    const handleChange = (element, index) => {
        if (isNaN(element.value)) return;

        const newOtpInput = [...otpInput];
        newOtpInput[index] = element.value;
        setOtpInput(newOtpInput);

        // Focus next input
        if (element.nextSibling && element.value) {
            element.nextSibling.focus();
        }
    };

    // Handle form submission
    const handleVerify = async () => {
        if (!isOTPComplete) {
            setFeedback('Please enter the full 6-digit code.');
            return;
        }
        setFeedback('');
        setErrorMessage('');
        setIsVerifying(true);
        const submittedCode = otpInput.join('');
        try {
            await onVerify(submittedCode);
            setFeedback('Verification successful! Finalizing booking...');
        } catch (error) {
            setErrorMessage(error.message || 'Invalid OTP. Please try again.');
            setIsVerifying(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#e0e6ed] flex justify-center items-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8 md:p-10 text-center">
                
                {/* Timer Display (Reflects Central Timer) */}
                <div className={`mb-6 p-3 rounded-lg font-mono font-bold tracking-widest ${timer < 120 ? 'bg-red-100 text-red-600' : 'bg-[#720026]/10 text-[#720026]'}`}>
                    TIME LEFT: {formatTime(timer)}
                </div>

                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Confirm Transaction</h2>
                    <p className="text-sm text-gray-600">
                        Enter the 6-digit code sent to: <strong className="font-medium">{email}</strong>
                    </p>
                </div>

                {/* OTP Input Grid */}
                <div className="flex justify-center gap-2 mb-6" onChange={() => setFeedback('')}>
                    {otpInput.map((digit, index) => (
                        <input
                            key={index}
                            type="text"
                            maxLength="1"
                            value={digit}
                            onChange={(e) => handleChange(e.target, index)}
                            onFocus={(e) => e.target.select()}
                            disabled={isVerifying || timer === 0}
                            className="w-10 h-14 text-center text-xl font-bold border-2 rounded-lg focus:border-[#720026] outline-none transition-colors"
                        />
                    ))}
                </div>

                {/* Feedback & Error */}
                {(feedback || errorMessage) && (
                    <p className={`text-sm mb-6 ${feedback ? 'text-green-600' : 'text-red-600'}`}>
                        {feedback || errorMessage}
                    </p>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={handleVerify}
                        disabled={isVerifying || isProcessing || !isOTPComplete || timer === 0}
                        className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-md ${
                            !isOTPComplete || isVerifying || isProcessing || timer === 0
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-[#720026] hover:bg-[#5a001e] hover:-translate-y-0.5'
                        }`}
                    >
                        {isVerifying || isProcessing ? (
                            <><i className="fas fa-circle-notch fa-spin"></i> VERIFYING...</>
                        ) : timer === 0 ? (
                            'TIME EXPIRED'
                        ) : (
                            'VERIFY & COMPLETE BOOKING'
                        )}
                    </button>
                    <button
                        onClick={onBack}
                        disabled={isVerifying || isProcessing}
                        className="w-full py-3 text-gray-500 font-bold rounded-lg border border-gray-300 hover:bg-gray-100"
                    >
                        Cancel & Return to Payment Options
                    </button>
                </div>

            </div>
        </div>
    );
};