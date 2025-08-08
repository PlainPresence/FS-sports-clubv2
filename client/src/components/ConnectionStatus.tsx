import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function ConnectionStatus() {
  const { isConnected, isConnecting, connectionError } = useWebSocket();

  return (
    <AnimatePresence>
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 flex items-center space-x-2">
            {isConnecting ? (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Connecting...</span>
              </>
            ) : connectionError ? (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-red-600">Offline</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Live</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 
