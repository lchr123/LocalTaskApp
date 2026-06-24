/**
 * FilterMultiSelect
 *
 * A self-controlled multi-select dropdown used by the task FilterBar.
 *
 * Why not react-native-paper's Menu? Paper's Menu gets dismissed whenever the
 * parent screen re-renders (which happens on every live filter refetch because
 * the task list updates). This component drives its open state purely from its
 * own local `visible` state and renders the panel in a react-native Modal, so a
 * parent re-render can never close it. Selecting an option applies immediately
 * (live) while the panel stays open until the user taps outside.
 */

import React, { useRef, useState } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Button, Text, Icon, Divider } from 'react-native-paper';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterMultiSelectProps {
  /** Text shown on the anchor button (e.g. "全部类型" / "2种类型"). */
  buttonLabel: string;
  options: FilterOption[];
  /** Currently selected option values. */
  selected: string[];
  /** When true, an empty `selected` means "all selected" (every row checked). */
  emptyMeansAll?: boolean;
  onToggle: (value: string) => void;
  /** Optional "clear" action shown at the bottom when something is selected. */
  onClear?: () => void;
  clearLabel?: string;
}

export default function FilterMultiSelect({
  buttonLabel,
  options,
  selected,
  emptyMeansAll = false,
  onToggle,
  onClear,
  clearLabel = '清除',
}: FilterMultiSelectProps) {
  const [visible, setVisible] = useState(false);
  const anchorRef = useRef<View>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 180 });

  const open = () => {
    const node: any = anchorRef.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x: number, y: number, w: number, h: number) => {
        setPos({ top: y + h + 4, left: x, width: Math.max(w, 160) });
        setVisible(true);
      });
    } else {
      setVisible(true);
    }
  };

  const isChecked = (value: string) =>
    (emptyMeansAll && selected.length === 0) || selected.includes(value);

  return (
    <View ref={anchorRef} collapsable={false}>
      <Button
        mode="outlined"
        compact
        onPress={open}
        icon="chevron-down"
        contentStyle={styles.buttonContent}
        style={styles.filterButton}
        labelStyle={styles.buttonLabel}
      >
        {buttonLabel}
      </Button>

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        {/* Backdrop: tapping outside closes the panel */}
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          {/* Panel: absorbs taps so selecting an option doesn't close it */}
          <Pressable
            style={[styles.panel, { top: pos.top, left: pos.left, minWidth: pos.width }]}
            onPress={() => {}}
          >
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
              {options.map((o) => {
                const checked = isChecked(o.value);
                return (
                  <Pressable
                    key={o.value}
                    style={styles.row}
                    onPress={() => onToggle(o.value)}
                    accessibilityRole="button"
                    accessibilityLabel={`${o.label}${checked ? '，已选中' : ''}`}
                  >
                    <Icon
                      source={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={20}
                      color={checked ? '#1976D2' : '#9E9E9E'}
                    />
                    <Text style={[styles.rowText, checked && styles.rowTextChecked]}>
                      {o.label}
                    </Text>
                  </Pressable>
                );
              })}

              {onClear && selected.length > 0 && (
                <>
                  <Divider />
                  <Pressable
                    style={styles.row}
                    onPress={onClear}
                    accessibilityRole="button"
                    accessibilityLabel={clearLabel}
                  >
                    <Icon source="close" size={20} color="#9E9E9E" />
                    <Text style={styles.rowText}>{clearLabel}</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    borderRadius: 20,
    borderColor: '#E0E0E0',
  },
  buttonContent: {
    flexDirection: 'row-reverse',
    height: 36,
  },
  buttonLabel: {
    fontSize: 13,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  panel: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 4,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E0',
  },
  scroll: {
    maxHeight: 320,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rowText: {
    fontSize: 14,
    color: '#424242',
  },
  rowTextChecked: {
    color: '#1976D2',
    fontWeight: '600',
  },
});
