import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { COUNTRIES } from '../../constants/countries';

interface CountryPickerProps {
  value: string;
  onSelect: (name: string) => void;
  error?: boolean;
  colorScheme: 'light' | 'dark' | null;
}

export default function CountryPicker({ value, onSelect, error, colorScheme }: CountryPickerProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(false);

  const filtered = useMemo(() => {
    if (search.length < 2) return [];
    const lower = search.toLowerCase();
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(lower));
  }, [search]);

  const handleChangeText = (text: string) => {
    setSearch(text);
    setSelected(false);
    setIsOpen(text.length >= 2);
    if (text === '') {
      onSelect('');
    }
  };

  const handleSelect = (name: string) => {
    setSearch(name);
    setSelected(true);
    setIsOpen(false);
    onSelect(name);
  };

  const isDark = colorScheme === 'dark';

  const iconName = error
    ? 'error'
    : selected && value.trim() !== ''
      ? 'check-circle'
      : 'expand-more';

  const iconColor = error
    ? Colors.error
    : selected && value.trim() !== ''
      ? Colors.primary
      : isDark
        ? '#a1a1aa'
        : '#6b7280';

  return (
    <View style={styles.wrapper}>
      <View style={styles.relativeInput}>
        <TextInput
          style={[
            styles.textInput,
            error && styles.textInputError,
            {
              backgroundColor: error
                ? (isDark ? 'rgba(255, 77, 77, 0.1)' : 'rgba(255, 77, 77, 0.05)')
                : (isDark ? 'rgba(16, 34, 32, 0.5)' : 'white'),
              borderColor: error
                ? Colors.error
                : (isDark ? '#1e293b' : '#e2e8f0'),
              color: isDark ? Colors.dark.text : Colors.light.text,
            },
          ]}
          placeholder="Enter your country"
          placeholderTextColor={isDark ? '#a1a1aa' : '#6b7280'}
          value={search}
          onChangeText={handleChangeText}
        />
        <MaterialIcons
          name={iconName as any}
          size={24}
          color={iconColor}
          style={styles.inputIconRight}
        />
      </View>

      {isOpen && filtered.length > 0 && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: isDark ? '#1e293b' : 'white',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                },
                android: {
                  elevation: 4,
                },
              }),
            },
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {filtered.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={[
                  styles.row,
                  {
                    borderBottomColor: isDark ? '#334155' : '#f1f5f9',
                  },
                ]}
                onPress={() => handleSelect(c.name)}
              >
                <Text style={styles.flag}>{c.flag}</Text>
                <Text
                  style={[
                    styles.countryName,
                    { color: isDark ? Colors.dark.text : Colors.light.text },
                  ]}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 50,
  },
  relativeInput: {
    position: 'relative',
    justifyContent: 'center',
  },
  textInput: {
    width: '100%',
    height: 56,
    paddingHorizontal: 24,
    borderRadius: 9999,
    borderWidth: 2,
    fontSize: 16,
  },
  textInputError: {
    borderColor: Colors.error,
  },
  inputIconRight: {
    position: 'absolute',
    right: 20,
  },
  dropdown: {
    position: 'absolute',
    top: 62,
    left: 0,
    right: 0,
    maxHeight: 200,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 50,
  },
  scrollView: {
    maxHeight: 200,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  flag: {
    fontSize: 20,
  },
  countryName: {
    fontSize: 16,
  },
});
