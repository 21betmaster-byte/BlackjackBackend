import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { Toast, ToastType } from '../components/ui/Toast';

interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
  show: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const opacity = useRef(new Animated.Value(0)).current;
  const animating = useRef(false);

  const show = useCallback((msg: string, toastType: ToastType = 'success') => {
    if (animating.current) return;
    animating.current = true;
    setMessage(msg);
    setType(toastType);
    setVisible(true);

    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      animating.current = false;
    });
  }, [opacity]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {visible && <Toast message={message} type={type} opacity={opacity} />}
    </ToastContext.Provider>
  );
};
