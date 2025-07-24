import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createBlockedDate } from '@/lib/firebase';
import LoadingSpinner from './LoadingSpinner';

interface BlockDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface BlockDateForm {
  date: string;
  reason?: string;
}

export default function BlockDateModal({ isOpen, onClose, onSuccess }: BlockDateModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BlockDateForm>();

  const onSubmit = async (data: BlockDateForm) => {
    setIsSubmitting(true);
    try {
      const result = await createBlockedDate(data);
      if (result.success) {
        toast({
          title: 'Date Blocked',
          description: 'The entire date has been successfully blocked.',
        });
        reset();
        onSuccess();
        onClose();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to block date.',
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
              <h2 className="text-xl font-bold text-gray-900">Block Full Date</h2>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>

            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex">
                <i className="fas fa-exclamation-triangle text-amber-600 mr-2 mt-0.5"></i>
                <p className="text-sm text-amber-800">
                  <strong>Warning:</strong> This will block the entire date for all sports and time slots. 
                  No bookings will be allowed for this date.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="date" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Date to Block *
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
                <Label htmlFor="reason" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Reason (Optional)
                </Label>
                <Input
                  {...register('reason')}
                  placeholder="e.g., Holiday, Maintenance, Private Event, etc."
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
                  variant="destructive"
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Blocking...
                    </>
                  ) : (
                    'Block Date'
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