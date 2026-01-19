import React, { useState, useEffect, useMemo } from 'react';
import { Shift, User, Schedule } from '@/types';
import { X, Calendar as CalendarIcon, Clock, User as UserIcon, Check, ChevronDown, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getConflicts, Conflict } from '@/lib/conflict-detection';
import { ConflictWarning } from '@/components/shared/ConflictWarning';
import { addDoc, collection, Timestamp, updateDoc, doc, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils'; // Assuming cn exists, else use template literals

interface AssignShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date;
    shifts: Shift[];
    employees: User[];
    existingSchedules: Schedule[];
    storeId: string;
    scheduleToEdit?: Schedule | null;
}

export function AssignShiftModal({
    isOpen,
    onClose,
    date,
    shifts,
    employees,
    existingSchedules,
    storeId,
    scheduleToEdit,
}: AssignShiftModalProps) {
    const { user: manager } = useAuth();
    const [selectedShiftId, setSelectedShiftId] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [conflicts, setConflicts] = useState<Conflict[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State to track if we are approving an existing request
    const [selectedRequest, setSelectedRequest] = useState<Schedule | null>(null);

    const selectedShift = useMemo(() => shifts.find(s => s.id === selectedShiftId), [shifts, selectedShiftId]);
    const isPartTime = selectedShift?.type === 'parttime';
    const isEditing = !!scheduleToEdit;

    // Filter pending requests matching relevant criteria
    const pendingRequests = useMemo(() => {
        if (!isOpen || !selectedShiftId || !date) return [];

        return existingSchedules.filter(s =>
            s.status === 'pending' &&
            s.shiftId === selectedShiftId &&
            // Check correct date match
            (s.date instanceof Date ?
                s.date.toDateString() === date.toDateString() :
                s.date.toDate().toDateString() === date.toDateString()
            )
        );
    }, [existingSchedules, selectedShiftId, date, isOpen]);

    useEffect(() => {
        if (isOpen) {
            if (scheduleToEdit) {
                setSelectedShiftId(scheduleToEdit.shiftId);
                setSelectedEmployeeId(scheduleToEdit.employeeId);
                const shift = shifts.find(s => s.id === scheduleToEdit.shiftId);
                setStartTime(scheduleToEdit.startTime || shift?.startTime || '');
                setEndTime(scheduleToEdit.endTime || shift?.endTime || '');
                setSelectedRequest(null);
            } else {
                setSelectedShiftId('');
                setSelectedEmployeeId('');
                setStartTime('');
                setEndTime('');
                setSelectedRequest(null);
            }
            setConflicts([]);
        }
    }, [isOpen, scheduleToEdit, shifts]);

    const handleShiftChange = (shiftId: string) => {
        setSelectedShiftId(shiftId);
        setSelectedRequest(null); // Reset selected request

        const shift = shifts.find(s => s.id === shiftId);
        if (shift) {
            setStartTime(shift.startTime);
            setEndTime(shift.endTime);
        }
    };

    const handleRequestSelect = (request: Schedule) => {
        if (selectedRequest?.id === request.id) {
            // Deselect
            setSelectedRequest(null);
            setSelectedEmployeeId('');
            // Reset time to default shift time
            if (selectedShift) {
                setStartTime(selectedShift.startTime);
                setEndTime(selectedShift.endTime);
            }
        } else {
            // Select
            setSelectedRequest(request);
            setSelectedEmployeeId(request.employeeId);
            if (isPartTime && request.startTime && request.endTime) {
                setStartTime(request.startTime);
                setEndTime(request.endTime);
            }
        }
    };

    // Manual employee selection overrides request selection
    const handleEmployeeChange = (empId: string) => {
        setSelectedEmployeeId(empId);
        if (selectedRequest && selectedRequest.employeeId !== empId) {
            setSelectedRequest(null);
        }
    };

    // Check conflicts
    useEffect(() => {
        const checkConflicts = async () => {
            if (!selectedShiftId || !selectedEmployeeId || !date) {
                setConflicts([]);
                return;
            }

            const results = await getConflicts(
                selectedEmployeeId,
                selectedShiftId,
                date,
                storeId,
                {
                    existingSchedules,
                    shifts,
                    shift: selectedShift,
                    customStartTime: isPartTime ? startTime : undefined,
                    customEndTime: isPartTime ? endTime : undefined,
                    scheduleId: scheduleToEdit?.id || selectedRequest?.id, // Exclude self
                }
            );

            setConflicts(results);
        };

        const timer = setTimeout(() => {
            checkConflicts();
        }, 300);

        return () => clearTimeout(timer);
    }, [selectedShiftId, selectedEmployeeId, date, storeId, existingSchedules, shifts, selectedShift, isPartTime, startTime, endTime, scheduleToEdit, selectedRequest]);

    const hasErrors = useMemo(() => {
        return conflicts.some(c => c.severity === 'error');
    }, [conflicts]);

    const handleSubmit = async () => {
        if (!selectedShiftId || !selectedEmployeeId || hasErrors || !manager) return;
        setIsSubmitting(true);
        try {
            const data: any = {
                shiftId: selectedShiftId,
                employeeId: selectedEmployeeId,
                storeId,
                updatedAt: Timestamp.now(),
                status: 'approved', // Always approve when manager assigns
            };

            const isUpdate = isEditing || !!selectedRequest;
            const targetId = scheduleToEdit?.id || selectedRequest?.id;

            if (isPartTime) {
                data.startTime = startTime;
                data.endTime = endTime;
            } else if (isUpdate) {
                // Remove custom times if switching to fixed shift
                data.startTime = deleteField();
                data.endTime = deleteField();
            }

            if (!isEditing && !selectedRequest) {
                // New Schedule
                data.date = Timestamp.fromDate(date);
                data.createdBy = manager.id;
                data.assignedBy = manager.id;
                data.isAssigned = true;
                data.createdAt = Timestamp.now();
                data.requestedBy = selectedEmployeeId;
                await addDoc(collection(db, 'schedules'), data);
            } else if (targetId) {
                // Update Existing (Edit or Approve Request)
                if (selectedRequest) {
                    data.approvedBy = manager.id;
                    data.isAssigned = true; // Mark as assigned by manager
                }
                await updateDoc(doc(db, 'schedules', targetId), data);
            }

            onClose();
        } catch (error) {
            console.error('Error saving shift:', error);
            alert('Có lỗi xảy ra khi lưu ca làm việc');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {isEditing ? 'Chỉnh sửa ca làm' : 'Xếp lịch'}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                {format(date, 'EEEE, dd/MM/yyyy', { locale: vi })}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Ca làm việc <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                value={selectedShiftId}
                                onChange={(e) => handleShiftChange(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white appearance-none"
                            >
                                <option value="" className="dark:bg-gray-800">-- Chọn ca làm việc --</option>
                                {shifts.filter(s => s.type !== 'parttime').map(shift => (
                                    <option key={shift.id} value={shift.id} className="dark:bg-gray-800">
                                        {shift.name} ({shift.startTime} - {shift.endTime})
                                    </option>
                                ))}
                                {shifts.find(s => s.type === 'parttime') && (
                                    <option value={shifts.find(s => s.type === 'parttime')?.id} className="dark:bg-gray-800">
                                        Part-time (Giờ linh hoạt)
                                    </option>
                                )}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Pending Requests Selection */}
                    {!isEditing && pendingRequests.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 overflow-hidden">
                            <div className="px-4 py-3 bg-blue-100/50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-900/30 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Đăng ký cho ca được chọn ({pendingRequests.length})
                            </div>
                            <div className="max-h-48 overflow-y-auto divide-y divide-blue-100 dark:divide-blue-900/30 custom-scrollbar">
                                {pendingRequests.map(request => {
                                    const employee = employees.find(e => e.id === request.employeeId);
                                    const isSelected = selectedRequest?.id === request.id;

                                    return (
                                        <div
                                            key={request.id}
                                            onClick={() => handleRequestSelect(request)}
                                            className={`p-3 cursor-pointer flex items-center justify-between transition-colors hover:bg-blue-100/50 dark:hover:bg-blue-900/20 ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}>
                                                    {isSelected ? <Check className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-semibold ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}`}>
                                                        {employee?.displayName || 'Unknown'}
                                                    </p>
                                                    {isPartTime && request.startTime && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <Clock className="w-3 h-3 text-gray-400" />
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {request.startTime} - {request.endTime}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {isPartTime && (
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-gray-400" /> Giờ bắt đầu
                                </label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white shadow-sm [color-scheme:light] dark:[color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-gray-400" /> Giờ kết thúc
                                </label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white shadow-sm [color-scheme:light] dark:[color-scheme:dark]"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Nhân viên <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                value={selectedEmployeeId}
                                onChange={(e) => handleEmployeeChange(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white appearance-none"
                            >
                                <option value="" className="dark:bg-gray-800">-- Chọn nhân viên --</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id} className="dark:bg-gray-800">
                                        {emp.displayName || emp.email}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Conflict Warnings */}
                    {conflicts.length > 0 && (
                        <div className="mt-2 animate-fadeIn">
                            <ConflictWarning conflicts={conflicts} />
                        </div>
                    )}

                    <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-700 mt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedShiftId || !selectedEmployeeId || hasErrors || isSubmitting}
                            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-blue-500/30 hover:bg-blue-700 disabled:bg-gray-300 disabled:dark:bg-gray-600 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed transition-all"
                        >
                            {isSubmitting ? 'Đang xử lý...' : (isEditing || selectedRequest ? 'Lưu / Duyệt' : 'Chỉ định')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
