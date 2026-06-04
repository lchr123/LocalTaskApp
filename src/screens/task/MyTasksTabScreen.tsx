/**
 * My Tasks Tab Screen
 *
 * Top-level screen for the "任务" tab with two sub-tabs:
 * - 我发起的 (Tasks I posted)
 * - 我接受的 (Tasks I accepted as helper)
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import MyTasksScreen from './MyTasksScreen';
import AcceptedTasksScreen from './AcceptedTasksScreen';

export default function MyTasksTabScreen() {
  const [activeTab, setActiveTab] = useState('posted');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'posted', label: '我发起的' },
            { value: 'accepted', label: '我接受的' },
          ]}
          style={styles.segmented}
        />
      </View>
      <View style={styles.content}>
        {activeTab === 'posted' ? <MyTasksScreen /> : <AcceptedTasksScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  segmented: {
    // default styling is fine
  },
  content: {
    flex: 1,
  },
});
