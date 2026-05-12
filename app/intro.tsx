import React, { useRef, useCallback } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';

const videoSrc = require('../assets/WhatsApp Video 2026-05-04 at 19.40.24.mp4');

export default function IntroScreen() {
  const videoRef = useRef<Video>(null);

  const handleFinish = useCallback(() => {
    router.replace('/');
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Video
        ref={videoRef}
        source={videoSrc}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded && status.didJustFinish) handleFinish();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});
