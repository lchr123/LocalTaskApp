/**
 * CityPickerModal
 *
 * A searchable modal for selecting one of Japan's 47 prefectures (都道府県)
 * as a manual location center. Used when GPS is denied/unavailable, or when
 * the user wants to browse tasks in another region.
 */

import React, { useMemo, useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity } from 'react-native';
import { Portal, Modal, Searchbar, Text, Icon, Divider } from 'react-native-paper';
import { JP_PREFECTURES, JpPrefecture } from '../../utils/jpCities';

export interface CityPickerModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Currently selected prefecture id (for highlight), if any */
  selectedId?: string | null;
  /** Called when the user picks a prefecture */
  onSelect: (city: JpPrefecture) => void;
  /** Called when the modal is dismissed without selecting */
  onDismiss: () => void;
}

export const CityPickerModal: React.FC<CityPickerModalProps> = ({
  visible,
  selectedId,
  onSelect,
  onDismiss,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return JP_PREFECTURES;
    return JP_PREFECTURES.filter(
      (c) =>
        c.nameJa.toLowerCase().includes(q) ||
        c.nameZh.toLowerCase().includes(q) ||
        c.id.includes(q)
    );
  }, [query]);

  const handleSelect = (city: JpPrefecture) => {
    setQuery('');
    onSelect(city);
  };

  const renderItem = ({ item }: { item: JpPrefecture }) => {
    const isSelected = item.id === selectedId;
    return (
      <TouchableOpacity
        onPress={() => handleSelect(item)}
        style={[styles.row, isSelected && styles.rowSelected]}
        accessibilityRole="button"
        accessibilityLabel={`选择${item.nameZh}`}
      >
        <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>
          {item.nameJa}
          <Text style={styles.rowSub}>  {item.nameZh}</Text>
        </Text>
        {isSelected && <Icon source="check" size={20} color="#1976D2" />}
      </TouchableOpacity>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.header}>
          <Text style={styles.title}>选择地区（都道府県）</Text>
          <TouchableOpacity onPress={onDismiss} accessibilityLabel="关闭" accessibilityRole="button">
            <Icon source="close" size={24} color="#757575" />
          </TouchableOpacity>
        </View>

        <Searchbar
          placeholder="搜索地区，如 東京 / 大阪 / tokyo"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
          inputStyle={styles.searchInput}
        />

        <Divider />

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={Divider}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>未找到匹配的地区</Text>
          }
        />
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 60,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  search: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#F0F0F0',
  },
  searchInput: {
    fontSize: 14,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  rowSelected: {
    backgroundColor: '#E3F2FD',
  },
  rowText: {
    fontSize: 15,
    color: '#333',
  },
  rowTextSelected: {
    color: '#1976D2',
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  empty: {
    textAlign: 'center',
    color: '#9E9E9E',
    paddingVertical: 24,
  },
});

export default CityPickerModal;
