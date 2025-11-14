import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Video } from 'expo-av';

const API_BASE = 'https://bigtrendmaker-production.up.railway.app';

export default function App() {
  const [title, setTitle] = useState('Hello TrendMaker');
  const [duration, setDuration] = useState('5');
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const pollTimer = useRef(null);

  const clearTimer = () => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const startRender = async () => {
    try {
      clearTimer();
      setLoading(true);
      setStatus('Sunucuya istek gönderiliyor...');
      setVideoUrl(null);
      setJobId(null);

      const numericDuration = Number(duration) || 5;

      const res = await fetch(`${API_BASE}/v1/automontage/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          duration: numericDuration,
          format: 'mp4',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();

      if (!json.ok || !json.jobId) {
        throw new Error(json.error || 'Render başlatılamadı');
      }

      setJobId(json.jobId);
      setStatus(`Render kuyruğa alındı (Job ID: ${json.jobId})`);
      pollStatus(json.jobId);
    } catch (e) {
      console.error(e);
      setStatus('Hata: ' + e.message);
      Alert.alert('Hata', e.message);
      setLoading(false);
    }
  };

  const pollStatus = (id) => {
    clearTimer();

    pollTimer.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/automontage/status/${id}`);
        if (!res.ok) {
          throw new Error(`Status HTTP ${res.status}`);
        }

        const json = await res.json();

        if (!json.ok) {
          throw new Error(json.error || 'Durum alınamadı');
        }

        if (json.state === 'completed' && json.url) {
          const fullUrl = `${API_BASE}${json.url}`;
          setVideoUrl(fullUrl);
          setStatus('Render tamamlandı ✅');
          setLoading(false);
          clearTimer();
        } else if (json.state === 'failed') {
          setStatus('Render başarısız ❌: ' + (json.error || 'bilinmiyor'));
          Alert.alert('Render Hatası', json.error || 'Render başarısız');
          setLoading(false);
          clearTimer();
        } else {
          setStatus('Durum: ' + json.state);
        }
      } catch (e) {
        console.error(e);
        setStatus('Status hatası: ' + e.message);
        setLoading(false);
        clearTimer();
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Text style={styles.title}>TrendMaker Mobile</Text>
          <Text style={styles.subtitle}>
            Backend: {API_BASE.replace('https://', '')}
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>Video yazısı (title)</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Örn: Hello TrendMaker"
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>Süre (saniye)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="Örn: 5"
              keyboardType="numeric"
              placeholderTextColor="#666"
            />

            <View style={styles.buttonWrapper}>
              <Button
                title={loading ? 'Render yapılıyor...' : 'Render Başlat'}
                onPress={startRender}
                disabled={loading}
              />
            </View>
          </View>

          <View style={styles.section}>
            {status ? <Text style={styles.status}>{status}</Text> : null}
            {jobId ? <Text style={styles.job}>Job ID: {jobId}</Text> : null}
            {loading && <ActivityIndicator style={{ marginTop: 10 }} />}
          </View>

          {videoUrl && (
            <View style={styles.videoWrapper}>
              <Text style={styles.label}>Oluşturulan Video</Text>
              <Video
                style={styles.video}
                source={{ uri: videoUrl }}
                useNativeControls
                resizeMode="contain"
                shouldPlay={false}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#050505',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 30,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#888',
    marginBottom: 20,
    fontSize: 12,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    color: '#ccc',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    marginBottom: 12,
  },
  buttonWrapper: {
    marginTop: 4,
  },
  status: {
    color: '#fff',
    marginTop: 8,
  },
  job: {
    color: '#888',
    marginTop: 4,
    fontSize: 12,
  },
  videoWrapper: {
    marginTop: 20,
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});