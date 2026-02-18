import React, { ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';

type ModalVariant = 'bottom-sheet' | 'overlay';

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  variant?: ModalVariant;
  title?: string;
  children: ReactNode;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AppModal({
  visible,
  onClose,
  variant = 'bottom-sheet',
  title,
  children,
}: AppModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const cardBg = isDark ? Colors.dark.card ?? '#1a312e' : 'white';
  const textColor = isDark ? Colors.dark.text : Colors.light.text;

  if (variant === 'overlay') {
    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.overlayBackdrop}>
          <View style={[styles.overlayCard, { backgroundColor: cardBg }]}>
            {title && (
              <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>{title}</Text>
                <TouchableOpacity onPress={onClose}>
                  <MaterialIcons name="close" size={24} color={textColor} />
                </TouchableOpacity>
              </View>
            )}
            {children}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.bottomSheetBackdrop}
      >
        <View style={[styles.bottomSheetCard, { backgroundColor: cardBg }]}>
          {title && (
            <View style={styles.header}>
              <Text style={[styles.title, { color: textColor }]}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
          )}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  overlayBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayCard: {
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});
