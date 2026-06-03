/**
 * AppDialog Component
 *
 * Global in-app dialog that replaces window.alert / window.confirm.
 * Renders as a Material Design dialog using React Native Paper.
 * Must be placed at the root level (App.tsx) inside PaperProvider.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Portal, Dialog, Text, Button } from 'react-native-paper';
import { useDialogStore } from '../../stores/dialogStore';

export default function AppDialog() {
  const { visible, options, handleConfirm, handleCancel } = useDialogStore();

  const isConfirm = options.type === 'confirm';
  const title = options.title || (isConfirm ? '确认' : '提示');
  const confirmText = options.confirmText || '确定';
  const cancelText = options.cancelText || '取消';

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={isConfirm ? handleCancel : handleConfirm}
        style={styles.dialog}
        accessibilityLabel={title}
      >
        <Dialog.Title style={styles.title}>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.message}>
            {options.message}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          {isConfirm && (
            <Button
              onPress={handleCancel}
              textColor="#757575"
              accessibilityLabel={cancelText}
            >
              {cancelText}
            </Button>
          )}
          <Button
            onPress={handleConfirm}
            accessibilityLabel={confirmText}
          >
            {confirmText}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 16,
    maxWidth: 400,
    alignSelf: 'center',
    width: '90%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  message: {
    lineHeight: 22,
  },
});
