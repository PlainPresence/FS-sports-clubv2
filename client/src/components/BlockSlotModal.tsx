import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createBlockedSlot } from '@/lib/firebase';
import LoadingSpinner from './LoadingSpinner';

interface BlockSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface BlockSlotForm {
  date: string;
  timeSlot: string;
  sportType: string;
  reason?: string;
}

const TIME_SLOTS = [
  { value: '06:00-07:00', label: '6:00 - 7:00 AM' },
  { value: '07:00-08:00', label: '7:00 - 8:00 AM' },
  { value: '08:00-09:00', label: '8:00 - 9:00 AM' },
  { value: '09:00-10:00', label: '9:00 - 10:00 AM' },
  { value: '10:00-11:00', label: '10:00 - 11:00 AM' },
  { value: '11:00-12:00', label: '11:00 AM - 12:00 PM' },
  { value: '14:00-15:00', label: '2:00 - 3:00 PM' },
  { value: '15:00-16:00', label: '3:00 - 4:00 PM' },
  { value: '16:00-17:00', label: '4:00 - 5:00 PM' },
  { value: '17:00-18:00', label: '5:00 - 6:00 PM' },
  { value: '18:00-19:00', label: '6:00 - 7:00 PM' },
  { value: '19:00-20:00', label: '7:00 - 8:00 PM' },
  { value: '20:00-21:00', label: '8:00 - 9:00 PM' },
  { value: '21:00-22:00', label: '9:00 - 10:00 PM' },
];

export default function BlockSlotModal({ isOpen, onClose, onSuccess }: BlockSlotModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BlockSlotForm>();

  const onSubmit = async (data: BlockSlotForm) => {
    setIsSubmitting(true);
    try {
      const result = await createBlockedSlot(data);
      if (result.success) {
        toast({
          title: 'Slot Blocked',
          description: 'The time slot has been successfully blocked.',
        });
        reset();
        onSuccess();
        onClose();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to block slot.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md mx-4"
      >
        <Card className="shadow-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Block Time Slot</h2>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="date" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Date *
                </Label>
                <Input
                  {...register('date', { required: 'Date is required' })}
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className="h-10"
                />
                {errors.date && (
                  <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Sport Type *
                </Label>
                <Select onValueChange={(value) => setValue('sportType', value)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cricket">Cricket</SelectItem>
                    <SelectItem value="football">Football</SelectItem>
                    <SelectItem value="badminton">Badminton</SelectItem>
                    <SelectItem value="basketball">Basketball</SelectItem>
                  </SelectContent>
                </Select>
                {errors.sportType && (
                  <p className="text-red-500 text-sm mt-1">{errors.sportType.message}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Time Slot *
                </Label>
                <Select onValueChange={(value) => setValue('timeSlot', value)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.timeSlot && (
                  <p className="text-red-500 text-sm mt-1">{errors.timeSlot.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="reason" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Reason (Optional)
                </Label>
                <Input
                  {...register('reason')}
                  placeholder="e.g., Maintenance, Event, etc."
                  className="h-10"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Blocking...
                    </>
                  ) : (
                    'Block Slot'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}