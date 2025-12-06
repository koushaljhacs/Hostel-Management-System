// HMS-CENTRAL Main Controller
// FLOW: Profile (1) -> Room Selection (2) -> Payment (3) -> OTP_VERIFICATION (4) -> SUCCESS

const BookingApp = () => {
    const { useState, useEffect } = React;
    const API_BASE = '/api/booking';
    const INITIAL_TIMER_SECONDS = 600;

    const [step, setStep] = useState('PROFILE');
    const [student, setStudent] = useState(null);
    const [profileError, setProfileError] = useState('');
    const [bookingData, setBookingData] = useState(null);
    const [finalAmount, setFinalAmount] = useState(0);
    const [timer, setTimer] = useState(INITIAL_TIMER_SECONDS);
    const [csrfToken, setCsrfToken] = useState(null);
    const [globalError, setGlobalError] = useState('');
    const [bookingResult, setBookingResult] = useState(null);
    const [isFinalizing, setIsFinalizing] = useState(false);

    const getAuthToken = () => localStorage.getItem('hmsToken') || localStorage.getItem('adminJwtToken');

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchCsrfToken = async () => {
            try {
                const response = await fetch('/api/security/csrf-token', { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    if (data.token) {
                        setCsrfToken(data.token);
                    }
                }
            } catch (error) {
                console.warn('Unable to fetch CSRF token', error);
            }
        };

        fetchCsrfToken();
    }, []);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const token = getAuthToken();
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const res = await fetch(`${API_BASE}/profile`, {
                    headers,
                    credentials: 'include'
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Failed to load profile');
                }

                setStudent(data);
            } catch (err) {
                console.error('Profile fetch failed', err);
                setProfileError('Unable to load your hostel profile. Please refresh or contact support.');
                setStudent(null);
            }
        };

        loadProfile();
    }, []);

    const calculatePrice = (data) => {
        const { seater, isAC, hostel } = data;
        const hostelCode = hostel?.hostel_code || hostel?.hostelCode || '';

        if (hostelCode.includes('WING')) return 75000;
        if (isAC) return 80000;
        if (seater === 1) return 55000;
        if (seater === 2) return 45000;
        return 35000;
    };

    const handleRoomSelection = (data) => {
        setGlobalError('');
        setBookingData(data);
        const price = calculatePrice(data);
        setFinalAmount(price);
        setTimer(INITIAL_TIMER_SECONDS);
        setStep('PAYMENT');
    };

    const initiateOtpRequest = async () => {
        if (!bookingData?.room?.roomId) {
            throw new Error('Please select a room before initiating payment.');
        }
        if (!csrfToken) {
            throw new Error('Security token missing. Refresh the page and try again.');
        }
        const token = getAuthToken();
        const response = await fetch(`${API_BASE}/otp/send`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                'X-CSRF-Token': csrfToken
            }
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to send OTP.');
        }
    };

    const verifyOtpAndBook = async (otpCode) => {
        if (!csrfToken) {
            throw new Error('Security token missing. Please refresh and try again.');
        }
        const token = getAuthToken();
        const verifyResp = await fetch(`${API_BASE}/otp/verify`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ otp: otpCode })
        });
        const verifyData = await verifyResp.json();
        if (!verifyResp.ok || !verifyData.success) {
            throw new Error(verifyData.message || 'OTP verification failed.');
        }

        setIsFinalizing(true);
        const bookingResp = await fetch(`${API_BASE}/book`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                roomId: bookingData.room.roomId,
                hostelId: bookingData.hostel.hostel_id || bookingData.hostel.hostelId,
                amount: finalAmount,
                otpTicket: verifyData.ticket
            })
        });
        const bookingResponse = await bookingResp.json();
        setIsFinalizing(false);

        if (!bookingResp.ok || !bookingResponse.success) {
            throw new Error(bookingResponse.message || 'Unable to confirm booking.');
        }

        setBookingResult(bookingResponse);
        setStep('SUCCESS');
    };

    // --- RENDER MANAGER ---
    return (
        <div>
            {profileError && (
                <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg text-sm z-50">
                    {profileError}
                </div>
            )}
            {globalError && (
                <div className="fixed top-16 right-4 bg-yellow-500 text-white px-4 py-2 rounded shadow-lg text-sm z-50">
                    {globalError}
                </div>
            )}

            {step === 'PROFILE' && (
                <ProfileVerification
                    student={student}
                    onNext={() => setStep('ROOM_SELECTION')}
                    onBack={() => window.history.back()}
                    isLoading={!student && !profileError}
                />
            )}

            {step === 'ROOM_SELECTION' && student && (
                <RoomSelection
                    gender={student?.gender}
                    onBack={() => setStep('PROFILE')}
                    onNext={handleRoomSelection}
                />
            )}

            {step === 'PAYMENT' && (
                <PaymentGateway
                    student={student}
                    bookingData={bookingData}
                    amount={finalAmount}
                    onBack={() => setStep('ROOM_SELECTION')}
                    onPay={handlePaymentHandoff}
                />
            )}

            {step === 'OTP_VERIFICATION' && (
                <OTPVerification
                    student={student}
                    timer={timer}
                    onBack={() => setStep('PAYMENT')}
                    onVerify={handleOtpSubmit}
                    isProcessing={isFinalizing}
                />
            )}

            {step === 'SUCCESS' && (
                <div className="h-screen flex flex-col items-center justify-center bg-green-50 text-center fade-in">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6">
                        <i className="fas fa-check-circle text-6xl text-green-500"></i>
                    </div>
                    <h1 className="text-4xl font-extrabold text-gray-800 mb-2">Booking Confirmed!</h1>
                    <p className="text-lg text-gray-600">
                        Room allocated in <strong className="text-[#720026]">{bookingData?.hostel?.hostel_name || bookingData?.hostel?.name}</strong>
                    </p>
                    {bookingResult?.bookingId && (
                        <p className="text-sm text-gray-500 mt-1">Reference ID: #{bookingResult.bookingId}</p>
                    )}
                    <div className="mt-8 flex gap-4">
                        <button onClick={() => window.print()} className="px-6 py-3 bg-white border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50">
                            Download Receipt
                        </button>
                        <button onClick={() => window.location.href = '/student-dashboard'} className="px-6 py-3 bg-[#720026] text-white rounded-lg font-bold hover:bg-[#5a001e]">
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('react-root'));
root.render(<BookingApp />);