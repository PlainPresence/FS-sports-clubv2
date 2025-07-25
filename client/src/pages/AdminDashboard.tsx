import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useBookings } from '@/hooks/useBookings';
import { useAuthContext } from '@/context/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import BlockSlotModal from '@/components/BlockSlotModal';
import BlockDateModal from '@/components/BlockDateModal';
import { updateBooking, getSlotPrices, updateSlotPrice, uploadTurfImage, deleteTurfImage, getTurfImages, reorderTurfImages } from '@/lib/firebase';
import { BookingData } from '@/types';
import { saveAs } from 'file-saver';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { logout } = useAuth();
  const { user } = useAuthContext();
  const [dateFilter, setDateFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [showBlockSlotModal, setShowBlockSlotModal] = useState(false);
  const [showBlockDateModal, setShowBlockDateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Slot Prices State
  const [slotPrices, setSlotPrices] = useState<Record<string, number> | null>(null);
  const [slotPricesLoading, setSlotPricesLoading] = useState(true);
  const [slotPricesEdit, setSlotPricesEdit] = useState<Record<string, number>>({});
  const [slotPricesSaving, setSlotPricesSaving] = useState<Record<string, boolean>>({});

  // Turf Images State
  const [turfImages, setTurfImages] = useState<any[]>([]);
  const [turfImagesLoading, setTurfImagesLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [reordering, setReordering] = useState(false);

  // List of sports (ensure these match your Firestore doc IDs)
  const sports = [
    { id: 'cricket', label: 'Cricket' },
    { id: 'football', label: 'Football' },
    { id: 'badminton', label: 'Badminton' },
    { id: 'basketball', label: 'Basketball' },
  ];

  const { bookings, loading: bookingsLoading, refetch } = useBookings({
    dateFilter,
    searchFilter,
  });

  // Fetch slot prices on mount
  useEffect(() => {
    const fetchPrices = async () => {
      setSlotPricesLoading(true);
      try {
        const prices = await getSlotPrices();
        setSlotPrices(prices);
        setSlotPricesEdit(prices);
      } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to fetch slot prices', variant: 'destructive' });
      } finally {
        setSlotPricesLoading(false);
      }
    };
    fetchPrices();
  }, []);

  useEffect(() => {
    if (!user) {
      setLocation('/admin-access-sptp2024');
    }
  }, [user, setLocation]);

  useEffect(() => {
    const fetchImages = async () => {
      setTurfImagesLoading(true);
      const images = await getTurfImages();
      // Sort by 'order' if present, else by createdAt
      images.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setTurfImages(images);
      setTurfImagesLoading(false);
    };
    fetchImages();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
      setLocation('/admin-access-sptp2024');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to logout. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDateFilter = (date: string) => {
    setDateFilter(date);
  };

  const handleSearch = (query: string) => {
    setSearchFilter(query);
  };

  const handleBlockSlot = () => {
    setShowBlockSlotModal(true);
  };

  const handleBlockDate = () => {
    setShowBlockDateModal(true);
  };

  const handleModalSuccess = () => {
    refetch();
  };

  const handleExportData = () => {
    if (!bookings || bookings.length === 0) {
      toast({
        title: 'No Data',
        description: 'There are no bookings to export.',
        variant: 'destructive',
      });
      return;
    }
    // Generate CSV
    const headers = [
      'Booking ID', 'Name', 'Phone', 'Sport', 'Date', 'Time', 'Amount', 'Status'
    ];
    const rows = bookings.map((b) => [
      b.bookingId,
      b.fullName,
      b.mobile,
      b.sportType,
      b.date,
      Array.isArray(b.timeSlots) ? b.timeSlots.join(', ') : b.timeSlot || '',
      b.amount,
      b.paymentStatus
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bookings_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: 'Export Successful',
      description: 'Bookings data exported as CSV.',
    });
  };

  const handleEditClick = (booking: BookingData) => {
    setEditingId(booking.id);
    setEditingAmount(booking.amount);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingAmount(null);
  };

  const handleEditSave = async (booking: BookingData) => {
    if (!booking.id || editingAmount == null || isNaN(editingAmount)) return;
    setSaving(true);
    const result = await updateBooking(booking.id, { amount: editingAmount });
    setSaving(false);
    if (result.success) {
      toast({ title: 'Price Updated', description: 'Booking price updated successfully.' });
      setEditingId(null);
      setEditingAmount(null);
      refetch();
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to update price.', variant: 'destructive' });
    }
  };

  const handleCancelBooking = async (booking: BookingData) => {
    if (!booking.id) return;
    const confirmed = window.confirm('Are you sure you want to cancel this booking?');
    if (!confirmed) return;
    setSaving(true);
    const result = await updateBooking(booking.id, { paymentStatus: 'cancelled' });
    setSaving(false);
    if (result.success) {
      toast({ title: 'Booking Cancelled', description: 'The booking has been cancelled.' });
      refetch();
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to cancel booking.', variant: 'destructive' });
    }
  };

  // Handler for editing slot price input
  const handleSlotPriceChange = (sport: string, value: string) => {
    setSlotPricesEdit((prev) => ({ ...prev, [sport]: Number(value) }));
  };

  // Handler for saving slot price
  const handleSlotPriceSave = async (sport: string) => {
    setSlotPricesSaving((prev) => ({ ...prev, [sport]: true }));
    try {
      const price = slotPricesEdit[sport];
      if (isNaN(price) || price <= 0) {
        toast({ title: 'Invalid Price', description: 'Please enter a valid price.', variant: 'destructive' });
        setSlotPricesSaving((prev) => ({ ...prev, [sport]: false }));
        return;
      }
      const result = await updateSlotPrice(sport, price);
      if (result.success) {
        toast({ title: 'Price Updated', description: `${sport.charAt(0).toUpperCase() + sport.slice(1)} price updated successfully.` });
        setSlotPrices((prev) => ({ ...prev, [sport]: price }));
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to update price.', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update price.', variant: 'destructive' });
    } finally {
      setSlotPricesSaving((prev) => ({ ...prev, [sport]: false }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const result = await uploadTurfImage(file);
    setUploadingImage(false);
    if (result.success) {
      setTurfImages((prev) => [...prev, { id: result.id, url: result.url, fileName: file.name }]);
      toast({ title: 'Image Uploaded', description: 'Turf image uploaded successfully.' });
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to upload image.', variant: 'destructive' });
    }
  };

  const handleImageDelete = async (imageId: string, fileName: string) => {
    if (!window.confirm('Delete this image?')) return;
    const result = await deleteTurfImage(imageId, fileName);
    if (result.success) {
      setTurfImages((prev) => prev.filter(img => img.id !== imageId));
      toast({ title: 'Image Deleted', description: 'Turf image deleted.' });
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to delete image.', variant: 'destructive' });
    }
  };

  // Simple drag-and-drop reordering (vertical)
  const handleReorder = async (startIdx: number, endIdx: number) => {
    if (startIdx === endIdx) return;
    const updated = [...turfImages];
    const [removed] = updated.splice(startIdx, 1);
    updated.splice(endIdx, 0, removed);
    setTurfImages(updated);
    setReordering(true);
    await reorderTurfImages(updated.map(img => img.id));
    setReordering(false);
    toast({ title: 'Order Updated', description: 'Image order updated.' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTimeSlot = (timeSlot: string) => {
    return timeSlot.replace('-', ' - ').replace(/(\d{2}):(\d{2})/g, (match, hour, minute) => {
      const h = parseInt(hour);
      return `${h > 12 ? h - 12 : h || 12}:${minute} ${h >= 12 ? 'PM' : 'AM'}`;
    });
  };

  if (!user) {
    return <LoadingSpinner />;
  }

  // Calculate stats
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter((booking: BookingData) => booking.date === today);
  const todayRevenue = todayBookings.reduce((sum: number, booking: BookingData) => sum + (booking.amount || 0), 0);
  const confirmedBookings = bookings.filter((booking: BookingData) => booking.paymentStatus === 'success');
  // Calculate total hours booked (multi-hour support)
  const totalHoursBooked = bookings.reduce((sum: number, booking: BookingData) => {
    if (Array.isArray(booking.timeSlots)) return sum + booking.timeSlots.length;
    if (booking.timeSlot) return sum + 1;
    return sum;
  }, 0);
  const todayHoursBooked = todayBookings.reduce((sum: number, booking: BookingData) => {
    if (Array.isArray(booking.timeSlots)) return sum + booking.timeSlots.length;
    if (booking.timeSlot) return sum + 1;
    return sum;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Admin Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="bg-gradient-to-r from-blue-500 via-green-400 to-teal-400 rounded-2xl shadow-xl mb-8 p-1">
            <Card className="shadow-none bg-transparent">
              <CardContent className="p-6 bg-white rounded-xl flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-full shadow">
                    <i className="fas fa-crown text-2xl text-blue-500"></i>
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admin Dashboard</h1>
                    <p className="text-gray-600 mt-1">Manage bookings and facility availability</p>
                  </div>
                </div>
                <div className="mt-6 md:mt-0 flex items-center space-x-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Logged in as</div>
                    <div className="font-semibold text-blue-700">{user.email}</div>
                  </div>
                  <Button 
                    onClick={handleLogout}
                    variant="destructive"
                    className="px-4 py-2 font-semibold shadow hover:scale-105 transition-transform"
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Turf Images Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
        >
          <Card className="shadow-lg mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Turf Images</h2>
              <div className="mb-4 flex items-center gap-4">
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                {uploadingImage && <span className="text-blue-500">Uploading...</span>}
              </div>
              {turfImagesLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
              ) : turfImages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No images uploaded yet.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {turfImages.map((img, idx) => (
                    <div key={img.id} className="relative group border rounded-lg overflow-hidden shadow">
                      <img src={img.url} alt="Turf" className="w-full h-40 object-cover" draggable onDragStart={e => e.dataTransfer.setData('idx', idx.toString())} onDrop={e => { e.preventDefault(); const from = Number(e.dataTransfer.getData('idx')); handleReorder(from, idx); }} onDragOver={e => e.preventDefault()} />
                      <button onClick={() => handleImageDelete(img.id, img.fileName)} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-80 hover:opacity-100"><i className="fas fa-trash"></i></button>
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">{idx + 1}</div>
                    </div>
                  ))}
                </div>
              )}
              {reordering && <div className="text-blue-500 mt-2">Updating order...</div>}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="shadow-lg hover:shadow-2xl transition-shadow border-0 rounded-2xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-calendar-check text-blue-500 text-2xl"></i>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-gray-900">{todayBookings.length}</div>
                <div className="text-xs text-gray-600">Today's Bookings</div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-2xl transition-shadow border-0 rounded-2xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-rupee-sign text-green-600 text-2xl"></i>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-gray-900">₹{todayRevenue.toLocaleString()}</div>
                <div className="text-xs text-gray-600">Today's Revenue</div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-2xl transition-shadow border-0 rounded-2xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-check-circle text-amber-600 text-2xl"></i>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-gray-900">{confirmedBookings.length}</div>
                <div className="text-xs text-gray-600">Confirmed Bookings</div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-2xl transition-shadow border-0 rounded-2xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-chart-line text-teal-600 text-2xl"></i>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-gray-900">₹{bookings.reduce((sum: number, b: BookingData) => sum + (b.amount || 0), 0).toLocaleString()}</div>
                <div className="text-xs text-gray-600">Total Revenue</div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-2xl transition-shadow border-0 rounded-2xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-hourglass-half text-purple-600 text-2xl"></i>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-gray-900">{totalHoursBooked}</div>
                <div className="text-xs text-gray-600">Total Hours Booked</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="shadow-lg mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={handleBlockSlot}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto font-semibold transition-colors flex items-center justify-center"
                >
                  <i className="fas fa-ban mr-2"></i>
                  Block Time Slot
                </Button>
                
                <Button 
                  onClick={handleBlockDate}
                  variant="destructive"
                  className="px-6 py-3 h-auto font-semibold transition-colors flex items-center justify-center"
                >
                  <i className="fas fa-calendar-times mr-2"></i>
                  Block Full Date
                </Button>
                
                <Button 
                  onClick={handleExportData}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 h-auto font-semibold transition-colors flex items-center justify-center"
                >
                  <i className="fas fa-download mr-2"></i>
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Slot Prices Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="shadow-lg mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Slot Prices</h2>
              {slotPricesLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Sport</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Price (₹/hour)</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sports.map((sport) => (
                        <tr key={sport.id}>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">{sport.label}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <input
                              type="number"
                              min={0}
                              value={slotPricesEdit[sport.id] ?? ''}
                              onChange={(e) => handleSlotPriceChange(sport.id, e.target.value)}
                              className="border rounded px-2 py-1 w-24"
                              disabled={slotPricesSaving[sport.id]}
                            />
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <Button
                              size="sm"
                              onClick={() => handleSlotPriceSave(sport.id)}
                              disabled={slotPricesSaving[sport.id] || slotPricesEdit[sport.id] === slotPrices?.[sport.id]}
                            >
                              {slotPricesSaving[sport.id] ? 'Saving...' : 'Save'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Bookings Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">All Bookings</h2>
                <div className="mt-4 md:mt-0 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
                  <Input 
                    type="date"
                    value={dateFilter}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDateFilter(e.target.value)}
                    className="h-10"
                    placeholder="Filter by date"
                  />
                  <Input 
                    type="text"
                    value={searchFilter}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
                    placeholder="Search by phone or booking ID"
                    className="h-10 md:w-64"
                  />
                </div>
              </div>

              {bookingsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Booking ID</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Phone</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Sport</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Time</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bookings.map((booking: BookingData, idx: number) => (
                        <tr key={booking.id || idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{booking.bookingId}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{booking.fullName}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{booking.mobile}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 capitalize">{booking.sportType}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatDate(booking.date)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{
                            Array.isArray(booking.timeSlots)
                              ? booking.timeSlots.join(', ')
                              : booking.timeSlot || ''
                          }</td>
                          <td className="px-6 py-4 text-sm font-medium text-green-600">
                            {editingId === booking.id ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  min={0}
                                  value={editingAmount ?? ''}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingAmount(Number(e.target.value))}
                                  className="border rounded px-2 py-1 w-20"
                                  disabled={saving}
                                />
                                <Button size="sm" onClick={() => handleEditSave(booking)} disabled={saving}>
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleEditCancel} disabled={saving}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                ₹{booking.amount}
                                <button
                                  className="text-blue-500 hover:text-blue-700 focus:outline-none"
                                  onClick={() => handleEditClick(booking)}
                                  title="Edit Price"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              booking.paymentStatus === 'success' 
                                ? 'bg-green-100 text-green-800'
                                : booking.paymentStatus === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : booking.paymentStatus === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-200 text-gray-700'
                            }`}>
                              {booking.paymentStatus === 'success' ? 'Confirmed' : 
                               booking.paymentStatus === 'pending' ? 'Pending' : 
                               booking.paymentStatus === 'failed' ? 'Failed' : 'Cancelled'}
                            </span>
                            {(booking.paymentStatus !== 'cancelled' && booking.paymentStatus !== 'failed') && (
                              <Button size="sm" variant="outline" className="ml-2" onClick={() => handleCancelBooking(booking)} disabled={saving}>
                                Cancel
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {bookings.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No bookings found matching your criteria.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Modals */}
        <BlockSlotModal
          isOpen={showBlockSlotModal}
          onClose={() => setShowBlockSlotModal(false)}
          onSuccess={handleModalSuccess}
        />
        
        <BlockDateModal
          isOpen={showBlockDateModal}
          onClose={() => setShowBlockDateModal(false)}
          onSuccess={handleModalSuccess}
        />
      </div>
    </div>
  );
}
