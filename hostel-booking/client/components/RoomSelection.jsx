// COMPONENT: Step 2 - Room Selection (Single Panel / Full Width)
// LAYOUT: Optimized Grid to fit screen without scrolling.
// CHANGES: Removed Left Sidebar, Moved Filters Side-by-Side.

const { useState, useEffect } = React;
const API_BASE = '/api/booking';

const RoomSelection = ({ gender, onBack, onNext }) => {
    const [seater, setSeater] = useState(null);
    const [isAC, setIsAC] = useState(null);
    const [hostels, setHostels] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [selectedHostel, setSelectedHostel] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [preference, setPreference] = useState('');
    const [loadingHostels, setLoadingHostels] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [hostelError, setHostelError] = useState('');
    const [roomError, setRoomError] = useState('');

    const getAuthToken = () => localStorage.getItem('hmsToken') || localStorage.getItem('adminJwtToken');

    useEffect(() => {
        const isMale = gender?.toLowerCase() === 'male';
        if (isMale && (seater === 2 || seater === 3)) setIsAC(false);
        if (!isMale && seater === 2) setIsAC(false);
        setSelectedHostel(null);
        setSelectedRoom(null);
        setRooms([]);
    }, [seater, gender]);

    useEffect(() => {
        const loadAvailability = async () => {
            if (!seater || typeof isAC !== 'boolean') {
                setHostels([]);
                return;
            }
            setLoadingHostels(true);
            setHostelError('');
            setSelectedHostel(null);
            setSelectedRoom(null);
            setRooms([]);
            try {
                const params = new URLSearchParams({ seater, isAC });
                const token = getAuthToken();
                const response = await fetch(`${API_BASE}/availability?${params.toString()}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    credentials: 'include'
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Unable to load availability.');
                }
                setHostels(data.hostels || []);
            } catch (error) {
                console.error('Availability load failed', error);
                setHostelError(error.message || 'Unable to load hostels.');
                setHostels([]);
            } finally {
                setLoadingHostels(false);
            }
        };

        loadAvailability();
    }, [seater, isAC]);

    const loadRooms = async (hostel) => {
        if (!hostel) return;
        setSelectedHostel(hostel);
        setSelectedRoom(null);
        setLoadingRooms(true);
        setRoomError('');
        try {
            const params = new URLSearchParams();
            if (seater) params.append('seater', seater);
            if (typeof isAC === 'boolean') params.append('isAC', isAC);
            const token = getAuthToken();
            const response = await fetch(`${API_BASE}/hostels/${hostel.hostelId}/rooms?${params.toString()}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to load rooms.');
            }
            setRooms(data.rooms || []);
        } catch (error) {
            console.error('Room load failed', error);
            setRoomError(error.message || 'Unable to load rooms.');
            setRooms([]);
        } finally {
            setLoadingRooms(false);
        }
    };

    const canProceed = Boolean(selectedRoom);

    // --- COMPACT UI COMPONENTS ---

    const OptionButton = ({ label, icon, active, onClick, disabled }) => (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`
                flex-1 flex items-center justify-center gap-2 h-12 px-3 rounded-lg border-2 font-bold text-sm transition-all duration-200
                ${disabled ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-100 text-gray-400' : 'cursor-pointer hover:border-[#720026]/40'}
                ${active 
                    ? 'bg-[#720026] border-[#720026] text-white shadow-md' 
                    : 'bg-white border-gray-200 text-gray-600'}
            `}
        >
            <i className={`fas ${icon} ${active ? 'text-white' : 'text-gray-400'}`}></i>
            {label}
            {active && <i className="fas fa-check-circle ml-1 text-white text-xs"></i>}
        </button>
    );

    const HostelRow = ({ data, active, onClick }) => {
        const bedsLeft = Number(data.bedsLeft || 0);
        const total = Number(data.capacity || 1);
        const percentage = Math.max(0, Math.min(100, Math.round((bedsLeft / total) * 100)));
        const isFull = bedsLeft === 0;
        let barColor = 'bg-green-500';
        if (percentage < 20) barColor = 'bg-[#ffc400]';
        if (isFull) barColor = 'bg-red-500';

        return (
            <div
                onClick={() => !isFull && onClick()}
                className={`
                    flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer min-h-[70px]
                    ${isFull ? 'opacity-50 grayscale cursor-not-allowed bg-gray-50' : 'hover:border-[#720026]/50 hover:bg-gray-50'}
                    ${active
                        ? 'border-[#720026] bg-[#fff5f7] ring-1 ring-[#720026]'
                        : 'border-gray-200 bg-white'}
                `}
            >
                <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 text-sm truncate">{data.hostelName}</span>
                        {active && <i className="fas fa-check-circle text-[#720026] text-xs"></i>}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                        {data.hostelCode}
                    </span>
                </div>

                <div className="flex flex-col items-end w-28 shrink-0">
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: isFull ? '100%' : `${percentage}%` }}></div>
                    </div>
                    <span className={`text-[10px] font-bold ${isFull ? 'text-red-500' : 'text-gray-600'}`}>
                        {isFull ? 'FULL' : `${bedsLeft} Beds`}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#f3f4f6] flex justify-center items-center p-4 fade-in">
            
            {/* MAIN CARD: Single Panel, Max Width 6XL */}
            <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                
                <div className="p-8 flex flex-col h-full">
                    
                    {/* HEADER */}
                    <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-100">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Room Configuration</h2>
                            <p className="text-sm text-gray-500 mt-1">Select preferences to view availability.</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className="px-3 py-1 bg-[#720026]/10 text-[#720026] text-[10px] font-bold rounded-full uppercase tracking-wider">
                                {gender} Student
                            </span>
                            <button onClick={onBack} className="text-gray-400 hover:text-[#720026] text-[10px] font-bold uppercase flex items-center gap-1 transition-colors">
                                <i className="fas fa-arrow-left"></i> Back
                            </button>
                        </div>
                    </div>

                    {/* CONTENT GRID */}
                    <div className="space-y-6">
                        
                        {/* ROW 1: FILTERS (Occupancy & Comfort Side-by-Side) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Occupancy */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">01. Occupancy</label>
                                <div className="flex gap-3">
                                    <OptionButton label="Single" icon="fa-user" active={seater === 1} onClick={() => { setSeater(1); setIsAC(null); }} />
                                    <OptionButton label="Double" icon="fa-user-friends" active={seater === 2} onClick={() => { setSeater(2); setIsAC(null); }} />
                                    <OptionButton label="Triple" icon="fa-users" active={seater === 3} onClick={() => { setSeater(3); setIsAC(null); }} disabled={gender?.toLowerCase() !== 'male'} />
                                </div>
                            </div>

                            {/* Comfort (Visible only after occupancy selected) */}
                            <div className={`transition-opacity duration-200 ${seater ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">02. Comfort</label>
                                <div className="flex gap-3">
                                    <OptionButton label="AC Room" icon="fa-snowflake" active={isAC === true} onClick={() => setIsAC(true)} disabled={ (gender?.toLowerCase() === 'male' && seater > 1) || (gender?.toLowerCase() !== 'male' && seater === 2) } />
                                    <OptionButton label="Non-AC" icon="fa-wind" active={isAC === false} onClick={() => setIsAC(false)} />
                                </div>
                            </div>
                        </div>

                        {/* ROW 2: HOSTEL LIST */}
                        <div className={`transition-all duration-300 ${seater && isAC !== null ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">03. Available Hostels</label>
                                <span className="text-[9px] font-bold text-[#720026] bg-[#720026]/10 px-2 py-0.5 rounded">
                                    {loadingHostels ? 'Loading...' : `${hostels.length} Found`}
                                </span>
                            </div>
                            
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 min-h-[150px]">
                                {loadingHostels ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-6">
                                        <i className="fas fa-spinner fa-spin mb-2"></i>
                                        <span className="text-xs">Fetching real-time availability...</span>
                                    </div>
                                ) : hostels.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {hostels.map((hostel) => (
                                            <HostelRow
                                                key={hostel.hostelId}
                                                data={hostel}
                                                active={selectedHostel?.hostelId === hostel.hostelId}
                                                onClick={() => loadRooms(hostel)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-6">
                                        <i className="fas fa-database-slash mb-2 opacity-50"></i>
                                        <span className="text-xs italic">
                                            {hostelError || 'No hostels match this combination.'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ROW 3: ROOMS LIST */}
                        <div className={`transition-all duration-300 ${selectedHostel ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    04. Select Room {selectedHostel ? `(${selectedHostel.hostelName})` : ''}
                                </label>
                                <span className="text-[9px] font-bold text-[#720026] bg-[#720026]/10 px-2 py-0.5 rounded">
                                    {loadingRooms ? 'Loading...' : `${rooms.length} Available`}
                                </span>
                            </div>

                            <div className="bg-white border border-gray-100 rounded-xl p-3 min-h-[150px]">
                                {loadingRooms ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-500 py-6">
                                        <i className="fas fa-circle-notch fa-spin mb-2"></i>
                                        <span className="text-xs">Fetching rooms...</span>
                                    </div>
                                ) : rooms.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {rooms.map((room) => (
                                            <div
                                                key={room.roomId}
                                                onClick={() => setSelectedRoom(room)}
                                                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                                    selectedRoom?.roomId === room.roomId
                                                        ? 'border-[#720026] bg-[#fff5f7]'
                                                        : 'border-gray-200 hover:border-[#720026]/40'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <div className="font-bold text-gray-800 text-sm">
                                                            Room {room.roomNumber}
                                                        </div>
                                                        <div className="text-[10px] uppercase text-gray-400">
                                                            Floor {room.floorNumber}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-bold text-gray-600">
                                                            {room.availableBeds} Beds
                                                        </div>
                                                        <span className={`text-[10px] font-bold ${room.isAC ? 'text-blue-500' : 'text-gray-500'}`}>
                                                            {room.isAC ? 'AC' : 'Non-AC'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-500 py-6">
                                        <i className="fas fa-bed-empty mb-2"></i>
                                        <span className="text-xs italic">
                                            {roomError || 'Select a hostel to view available rooms.'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ROW 3: PREFERENCES & ACTIONS */}
                        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 ${selectedRoom ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            
                            {/* Input Area (Takes 2 Cols) */}
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">04. Special Request (Optional)</label>
                                <input 
                                    type="text"
                                    value={preference}
                                    onChange={(e) => setPreference(e.target.value)}
                                    className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-lg text-sm focus:border-[#720026] focus:ring-0 outline-none transition-colors"
                                    placeholder="E.g. Ground floor preferred..."
                                />
                            </div>

                            {/* Action Button (Takes 1 Col) */}
                            <div className="flex items-end">
                                <button 
                                    onClick={() => onNext({ hostel: selectedHostel, room: selectedRoom, seater, isAC, preference })}
                                    disabled={!canProceed}
                                    className={`
                                        w-full h-12 rounded-lg font-bold text-white shadow-md flex justify-center items-center gap-2 transition-all text-sm uppercase tracking-wide
                                        ${canProceed 
                                            ? 'bg-[#720026] hover:bg-[#5a001e] hover:shadow-lg transform hover:-translate-y-0.5 cursor-pointer' 
                                            : 'bg-gray-300 cursor-not-allowed'}
                                    `}
                                >
                                    Proceed To Pay <i className="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};