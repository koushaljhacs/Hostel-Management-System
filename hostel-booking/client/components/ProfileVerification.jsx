// COMPONENT: Step 1 - Profile Verification
// ARCHITECTURE: High-Performance Native Rendering (Zero Animation Libraries)
// UPDATED: Removed Step Indicator, Added Back Navigation

const { useState, useEffect } = React;

// Added 'onBack' prop for navigation
const ProfileVerification = ({ student, onNext, onBack, isLoading }) => {
    
    // Local State
    const [isChecked, setIsChecked] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // 1. Instant Eligibility Check
    // Logic: Student exists AND (Explicitly Eligible OR Status is Active)
    const isEligible = student && (student.eligibility === true || student.status === 'active');

    // 2. Simulate Data Integrity Check (Fast 500ms check)
    useEffect(() => {
        if (student) {
            const timer = setTimeout(() => setIsReady(true), 500);
            return () => clearTimeout(timer);
        }
    }, [student]);

    // 3. Loading View (Pure CSS)
    if (!student || !isReady) {
        return (
            <div className="h-screen flex flex-col justify-center items-center bg-gray-100">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-[#720026] rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 text-sm font-bold tracking-wider">VERIFYING RECORDS...</p>
            </div>
        );
    }

    // 4. Render Helpers
    const InfoField = ({ label, value }) => (
        <div className="border-b border-gray-100 pb-2">
            <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                {label}
            </label>
            <div className="text-sm font-bold text-gray-800 truncate">
                {value || 'N/A'}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f3f4f6] flex justify-center items-center p-4">
            
            {/* Main Card */}
            <div className="bg-white w-full max-w-5xl rounded-xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-gray-200">
                
                {/* LEFT COLUMN: Static Official Branding */}
                <div className="bg-[#720026] p-8 md:w-1/3 flex flex-col justify-between text-white">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-white/20 rounded flex items-center justify-center">
                                <i className="fas fa-university text-lg"></i>
                            </div>
                            <div>
                                <h1 className="font-bold text-lg leading-none">HMS CENTRAL</h1>
                                <span className="text-[10px] opacity-75 uppercase tracking-wide">Official Portal</span>
                            </div>
                        </div>
                        
                        <div className="h-px w-full bg-white/20 my-4"></div>
                        
                        <h2 className="text-2xl font-bold leading-tight mb-2">Academic<br/>Verification</h2>
                        <p className="text-xs opacity-70">Session 2024-2025</p>
                    </div>

                    {/* Identity Snapshot */}
                    <div className="mt-10">
                        <div className="inline-block p-1 rounded-full border-2 border-white/30 mb-3">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-[#720026]">
                                <i className="fas fa-user text-2xl"></i>
                            </div>
                        </div>
                        <p className="font-bold text-lg">{student.fullName}</p>
                        <div className="mt-2">
                            {isEligible ? (
                                <span className="inline-block px-2 py-1 bg-green-500 text-white text-[10px] font-bold uppercase rounded">
                                    Active & Eligible
                                </span>
                            ) : (
                                <span className="inline-block px-2 py-1 bg-red-500 text-white text-[10px] font-bold uppercase rounded">
                                    Not Eligible
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Data & Actions */}
                <div className="p-8 md:w-2/3 flex flex-col">
                    
                    {/* Header with Navigation */}
                    <div className="mb-6 border-b border-gray-200 pb-4">
                        {/* Back Navigation */}
                        <button 
                            onClick={onBack}
                            className="text-gray-500 hover:text-gray-800 text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-4 transition-colors"
                            type="button"
                        >
                            <i className="fas fa-arrow-left"></i> Previous Page
                        </button>

                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Confirm Identity</h3>
                                <p className="text-sm text-gray-500 mt-1">Check your details before proceeding.</p>
                            </div>
                            {/* REMOVED: STEP indicator */}
                        </div>
                    </div>

                    {/* 6-Grid Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <InfoField label="Full Name" value={student.fullName} />
                        <InfoField label="Roll Number" value={student.rollNo} />
                        <InfoField label="Course / Branch" value={student.courseBranch} />
                        <InfoField label="Date of Birth" value={student.dob} />
                        <InfoField label="Gender" value={student.gender} />
                        <InfoField label="Guardian Name" value={student.guardianName} />
                    </div>

                    {/* Declaration */}
                    <div className={`p-4 rounded border mb-6 transition-colors duration-200 ${
                        isChecked ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                            <div className="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 accent-[#720026] cursor-pointer"
                                    checked={isChecked}
                                    onChange={(e) => isEligible && setIsChecked(e.target.checked)}
                                    disabled={!isEligible}
                                />
                            </div>
                            <div className="text-xs text-gray-600 leading-relaxed">
                                <span className="font-bold text-gray-800">Declaration: </span>
                                I certify that the information above is correct. I understand that incorrect information may lead to cancellation of my seat.
                            </div>
                        </label>
                    </div>

                    {/* Footer Buttons */}
                    <div className="mt-auto flex justify-between items-center pt-2">
                        <button className="text-gray-400 hover:text-red-600 text-xs font-bold uppercase transition-colors flex items-center gap-2">
                            <i className="fas fa-exclamation-circle"></i> Report Issue
                        </button>

                        <button 
                            onClick={onNext}
                            disabled={!isEligible || !isChecked || isLoading}
                            className={`
                                px-8 py-3 rounded shadow-md font-bold text-sm flex items-center gap-2 transition-all duration-200
                                ${ (isEligible && isChecked && !isLoading)
                                    ? 'bg-[#720026] text-white hover:bg-[#5a001e] hover:shadow-lg transform active:scale-95' 
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                }
                            `}
                        >
                            {isLoading ? (
                                <>
                                    <i className="fas fa-circle-notch fa-spin"></i> PROCESSING...
                                </>
                            ) : (
                                <>
                                    PROCEED NEXT <i className="fas fa-arrow-right"></i>
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
            
            {/* Footer Security Note */}
            <div className="fixed bottom-4 text-center w-full pointer-events-none">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                    <i className="fas fa-lock mr-1"></i> Secure Environment • 256-bit Encryption
                </p>
            </div>

        </div>
    );
};