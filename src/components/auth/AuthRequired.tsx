import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { navigateToAuth } from '../../navigation/navigationRef';

interface AuthRequiredProps {
  title?: string;
  description?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  buttonText?: string;
}

export default function AuthRequired({
  title = '需要登录',
  description = '登录后可以使用此功能',
  icon = 'lock-outline',
  buttonText = '登录 / 注册',
}: AuthRequiredProps) {
  const theme = useTheme();

  return (
    <View style={styles.container} accessibilityLabel="需要登录">
      <MaterialCommunityIcons
        name={icon}
        size={72}
        color={theme.colors.outline}
      />

      <Text variant="headlineSmall" style={styles.title}>
        {title}
      </Text>

      <Text
        variant="bodyMedium"
        style={[styles.description, { color: theme.colors.outline }]}
      >
        {description}
      </Text>

      <Button
        mode="contained"
        icon="login"
        onPress={navigateToAuth}
        style={styles.button}
        contentStyle={styles.buttonContent}
        accessibilityLabel="登录或注册"
      >
        {buttonText}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    marginTop: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 24,
    minWidth: 180,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});