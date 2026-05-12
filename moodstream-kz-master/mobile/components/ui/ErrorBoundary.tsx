import { Component } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'Неизвестная ошибка';
    return { hasError: true, message };
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>
          {this.props.fallbackLabel ?? 'Что-то пошло не так'}
        </Text>
        <Text style={styles.detail} numberOfLines={3}>
          {this.state.message}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={this.reset}>
          <Text style={styles.btnText}>Попробовать снова</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#0D1326',
    gap: 12,
  },
  emoji: { fontSize: 40 },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#D4B896',
    textAlign: 'center',
  },
  detail: {
    fontSize: 13,
    color: '#6B7A99',
    textAlign: 'center',
  },
  btn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#C87B4E',
    borderRadius: 20,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
